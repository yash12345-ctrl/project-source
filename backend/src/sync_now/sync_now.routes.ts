import { Router } from 'express';
import { prisma } from '../db/db';
import { enqueueScrapeJob, scraperQueueEvents } from '../queue/scraperQueue';
import { cacheGet, cacheSet, isRedisReady } from '../db/redis';
import { ATTENDANCE_CACHE_TTL_SECONDS, CACHE_TTL_SECONDS, registerUserForBackgroundSync } from '../scraper/data.cron';
import { verifySessionToken } from '../utils/jwt';

const router = Router();

router.post('/attendance', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const payload = verifySessionToken(token);
    if (!payload) {
      return res.status(401).json({ success: false, error: 'Session expired' });
    }

    const username = payload.username;

    // Check rate limit (1 hour cooldown)
    if (isRedisReady()) {
      const cooldownKey = `cooldown:sync_now:attendance:${username}`;
      const lastSync = await cacheGet<number>(cooldownKey);
      if (lastSync) {
        const timeElapsed = Date.now() - lastSync;
        const cooldownTime = 10 * 1000; // 10 seconds (was 1 hour)
        if (timeElapsed < cooldownTime) {
          return res.status(429).json({ 
            success: false, 
            error: 'You can only sync once every 10 seconds',
            remainingTimeMs: cooldownTime - timeElapsed
          });
        }
      }
    }

    const account = await prisma.portalAccount.findUnique({ where: { username } });
    if (!account || !account.password) {
      return res.status(400).json({ success: false, error: 'Portal password not found' });
    }

    // Set cooldown immediately to prevent double clicks
    if (isRedisReady()) {
      const cooldownKey = `cooldown:sync_now:attendance:${username}`;
      await cacheSet(cooldownKey, Date.now(), 60 * 60); // 1 hour TTL
    }

    // Trigger force sync
    const job = await enqueueScrapeJob('attendance_live', username, { password: account.password, forceSync: true });
    
    // We can either return immediately or wait. Since we need to know when it finishes
    // so the button reappears, we will wait for it to finish.
    const result = await job.waitUntilFinished(scraperQueueEvents);

    if (result && result.success && !(result as any).pending) {
      await cacheSet(`attendance:${username}`, result, ATTENDANCE_CACHE_TTL_SECONDS);
      await registerUserForBackgroundSync(username, { portalPassword: account.password });
    } else {
      // If failed, maybe remove the cooldown so they can try again?
      // For now, let's just return the result.
    }

    res.json(result);
  } catch (err: any) {
    console.error('[SyncNow Attendance] Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

router.post('/internal-marks', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const payload = verifySessionToken(token);
    if (!payload) {
      return res.status(401).json({ success: false, error: 'Session expired' });
    }

    const username = payload.username;

    // Check rate limit (1 hour cooldown)
    if (isRedisReady()) {
      const cooldownKey = `cooldown:sync_now:internalmarks:${username}`;
      const lastSync = await cacheGet<number>(cooldownKey);
      if (lastSync) {
        const timeElapsed = Date.now() - lastSync;
        const cooldownTime = 10 * 1000; // 10 seconds (was 1 hour)
        if (timeElapsed < cooldownTime) {
          return res.status(429).json({ 
            success: false, 
            error: 'You can only sync once every 10 seconds',
            remainingTimeMs: cooldownTime - timeElapsed
          });
        }
      }
    }

    const account = await prisma.portalAccount.findUnique({ where: { username } });
    if (!account || !account.password) {
      return res.status(400).json({ success: false, error: 'Portal password not found' });
    }

    // Set cooldown immediately to prevent double clicks
    if (isRedisReady()) {
      const cooldownKey = `cooldown:sync_now:internalmarks:${username}`;
      await cacheSet(cooldownKey, Date.now(), 10); // 10 sec TTL
    }

    // Trigger force sync
    const job = await enqueueScrapeJob('internalmarks_live', username, { password: account.password, forceSync: true });
    
    // Wait for it to finish
    const result = await job.waitUntilFinished(scraperQueueEvents);

    if (result && result.success && !(result as any).pending) {
      await cacheSet(`internalmarks:${username}`, result, CACHE_TTL_SECONDS);
      await registerUserForBackgroundSync(username, { portalPassword: account.password });
    }

    res.json(result);
  } catch (err: any) {
    console.error('[SyncNow InternalMarks] Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

export default router;
