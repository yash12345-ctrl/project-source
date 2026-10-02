import { Router } from 'express';
import { captchaService } from '../scraper/captcha.service';
import { cacheGet, cacheSet, isRedisReady } from '../db/redis';
import { registerUserForBackgroundSync, CACHE_TTL_SECONDS } from '../scraper/data.cron';
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

  const cacheKey = `grades:${username}`;

  try {
    // 1. Serve from Redis cache if available
    if (!forceSync && isRedisReady()) {
      const cached = await cacheGet<object>(cacheKey);
      if (cached) {
        // Re-register user so background cron keeps refreshing
        if (password) {
            await registerUserForBackgroundSync(username, { portalPassword: password });
            
            // Background sync
            const job = await enqueueScrapeJob('grades_live', username, { password, forceSync: false });
            return res.json({ ...cached, cached: true, backgroundJobId: job.id });
        }
        return res.json({ ...cached, cached: true });
      }
    }

    // 2. Cache MISS — run live interactive scrape
    console.log(`[Grades Route] 🐢 Cache MISS for ${username}. Queueing live scrape...`);
    const job = await enqueueScrapeJob('grades_live', username, { password, forceSync: true });
    
    // Wait for the worker to finish the job
    const result = await job.waitUntilFinished(scraperQueueEvents);

    if (result && result.success && !(result as any).pending) {
      await cacheSet(cacheKey, result, CACHE_TTL_SECONDS);
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
    console.error('[Grades Route] Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

export default router;
