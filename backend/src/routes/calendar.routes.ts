import { Router } from 'express';
import { captchaService } from '../scraper/captcha.service';
import { cacheGet, cacheSet, isRedisReady } from '../db/redis';
import { registerUserForBackgroundSync, CACHE_TTL_SECONDS } from '../scraper/data.cron';
import { enqueueScrapeJob, scraperQueueEvents } from '../queue/scraperQueue';
import { clearInvalidPasswordCache } from '../scraper/portalAuth';
import { prisma } from '../db/db';

const router = Router();

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

  const cacheKey = `calendar:${username}`;

  try {
    // 1. Serve from Redis cache if available
    if (!forceSync && isRedisReady()) {
      const cached = await cacheGet<object>(cacheKey);
      if (cached) {
        res.json({ ...cached, cached: true });
        // Re-register user so background cron keeps refreshing
        if (password) {
            registerUserForBackgroundSync(username, { portalPassword: password });
        }
        return;
      }
    }

    // 2. Cache MISS or Force Sync — run live interactive scrape
    console.log(`[Calendar Route] 🐢 Cache MISS or Force Sync for ${username}. Queueing live scrape...`);
    const job = await enqueueScrapeJob('calendar_live', username, { password, forceSync: true });
    
    // Wait for the worker to finish the job
    const result = await job.waitUntilFinished(scraperQueueEvents);

    if (result && result.success && !(result as any).pending) {
      await cacheSet(cacheKey, result, CACHE_TTL_SECONDS);
      if (password) {
        registerUserForBackgroundSync(username, { portalPassword: password });
        
        await prisma.portalAccount.upsert({
          where: { username },
          update: { password },
          create: { username, password }
        });
      }
    }

    res.json(result);
  } catch (error: any) {
    console.error('[Calendar Route] Error:', error);
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

// ── Captcha helpers ────────────────────────────────────────────────────────

router.post('/captcha/solve', async (req, res) => {
  try {
    const { username, captchaText } = req.body;
    await captchaService.submitCaptcha(username, captchaText);
    res.json({ success: true });
  } catch (error) {
    console.error('Captcha solve error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit captcha' });
  }
});

router.get('/status/:username', (req, res) => {
  const { username } = req.params;
  const base64 = captchaService.getPendingCaptcha(username);
  res.json({ pending: !!base64, base64 });
});

export default router;
