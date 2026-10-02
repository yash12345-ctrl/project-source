import { Router } from 'express';
import { captchaService } from '../scraper/captcha.service';
import { cacheGet, cacheSet, isRedisReady } from '../db/redis';
import { registerUserForBackgroundSync, ATTENDANCE_CACHE_TTL_SECONDS, refreshAttendance } from '../scraper/data.cron';
import { enqueueScrapeJob, scraperQueueEvents } from '../queue/scraperQueue';
import { clearInvalidPasswordCache } from '../scraper/portalAuth';
import { prisma } from '../db/db';

const router = Router();

// ── Captcha helpers (unchanged) ────────────────────────────────────────────

router.get('/status/:username', (req, res) => {
  const { username } = req.params;
  const base64 = captchaService.getPendingCaptcha(username);
  if (base64) {
    res.json({ pending: true, base64 });
  } else {
    res.json({ pending: false, base64: null });
  }
});

router.post('/solve', (req, res) => {
  const { username, text } = req.body;
  if (!username || !text) {
    return res.status(400).json({ success: false, error: 'Username and text are required' });
  }
  const success = captchaService.submitCaptcha(username, text);
  res.json({ success });
});

// ── Main login / data endpoint ─────────────────────────────────────────────

router.post('/login', async (req, res) => {
  let { username, password, forceSync, manual } = req.body;
  if (!username) {
    return res.status(400).json({ success: false, error: 'Username is required' });
  }

  if (!password) {
    const account = await prisma.portalAccount.findUnique({ where: { username } });
    if (account) {
      password = account.password;
    } else {
      return res.status(401).json({ success: false, error: 'Invalid Password. Please check your portal credentials.' });
    }
  }

  if (manual && password) {
    clearInvalidPasswordCache(username);
  }

  const cacheKey = `attendance:${username}`;

  try {
    // 1. Serve from Redis cache if available (instant — no loading screen)
    if (!forceSync && isRedisReady()) {
      const cached = await cacheGet<object>(cacheKey);
      if (cached) {
        console.log(`[Attendance Route] ⚡ Cache HIT for ${username}. Returning cached data instantly.`);

        // Respond immediately
        res.json({ ...cached, cached: true });

        // Keep user enrolled for cron refresh
        if (password) {
            await registerUserForBackgroundSync(username, { portalPassword: password });
            
            // User requested: trigger an immediate background scrape to update the cache silently
            console.log(`[Attendance Route] 🔄 Background scrape initiated for ${username} after cache hit.`);
            enqueueScrapeJob('attendance_live', username, { password, forceSync: false })
              .catch(e => console.error('[Attendance Route] Background scrape error:', e));
        }
        return;
      }
    }

    // 2. Cache MISS or forceSync=true — run live interactive scrape
    if (forceSync && isRedisReady()) {
      const cooldownKey = `cooldown:sync_now:attendance:${username}`;
      const lastSync = await cacheGet<number>(cooldownKey);
      if (lastSync) {
        const timeElapsed = Date.now() - lastSync;
        const cooldownTime = 60 * 60 * 1000; // 1 hour
        if (timeElapsed < cooldownTime) {
          return res.status(429).json({ 
            success: false, 
            error: 'You can only manually sync once per hour',
            remainingTimeMs: cooldownTime - timeElapsed
          });
        }
      }
      await cacheSet(cooldownKey, Date.now(), 60 * 60);
    }

    console.log(`[Attendance Route] 🐢 Cache MISS or Force Sync for ${username}. Queueing live scrape...`);
    const job = await enqueueScrapeJob('attendance_live', username, { password, forceSync: true });
    
    // Wait for the worker to finish the job
    const result = await job.waitUntilFinished(scraperQueueEvents);

    if (result && result.success && !(result as any).pending) {
      await cacheSet(cacheKey, result, ATTENDANCE_CACHE_TTL_SECONDS);
      if (password) {
        await registerUserForBackgroundSync(username, { portalPassword: password });
        
        await prisma.portalAccount.upsert({
          where: { username },
          update: { password },
          create: { username, password }
        });
      }
    }

    res.json(result);
  } catch (err: any) {
    console.error('[Attendance Route] Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});



export default router;
