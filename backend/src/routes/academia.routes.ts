import { Router, Request, Response } from 'express';
import { prisma } from '../db/db';
import { generateSessionToken, generateSyncToken, verifySessionToken, verifySyncToken } from '../utils/jwt';
import { syncQueue } from '../jobs/syncWorker';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { scrapeAcademia } from '../scraper/academia.scraper';
import { registerUserForBackgroundSync } from '../scraper/data.cron';
import { getRedisClient, isRedisReady } from '../db/redis';

const router = Router();

/**
 * Redis-backed rate limiter — shared across all API instances.
 * Previously used an in-memory Map which was per-process, letting users
 * bypass the limit by hitting different instances behind the load balancer.
 */
const checkRateLimit = async (ip: string, max: number, windowSec: number): Promise<boolean> => {
  if (!isRedisReady()) return true; // fail open if Redis is down
  const key = `ratelimit:login:${ip}`;
  const client = getRedisClient();
  const count = await client.incr(key);
  if (count === 1) {
    // First request in this window — set expiry
    await client.expire(key, windowSec);
  }
  return count <= max;
};

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  if (!await checkRateLimit(ip, 5, 60)) { // 5 requests per 60-second window
    res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' });
    return;
  }

  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ success: false, error: 'Username and password are required.' });
    return;
  }

  try {
    let account = await prisma.academiaAccount.findUnique({ where: { username } });

    if (!account || !account.initial_sync_complete) {
      // New User or hasn't completed initial sync
      account = await prisma.academiaAccount.upsert({
        where: { username },
        update: { password_encrypted: password, credentials_valid: true },
        create: { username, password_encrypted: password }
      });

      await prisma.portalAccount.upsert({
        where: { username },
        update: { password },
        create: { username, password }
      });

      // Update sync state to queued
      await prisma.syncState.upsert({
        where: { userId: username },
        update: { status: 'queued', errorCode: null },
        create: { userId: username, status: 'queued' }
      });

      // Enqueue BullMQ job with a unique job ID per request
      await syncQueue.add('full-sync', { username }, {
        jobId: `sync-${username}-${Date.now()}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 }
      });

      // Register user for full background polling of all tabs via cron
      await registerUserForBackgroundSync(username, { academiaPassword: password, portalPassword: password });

      const syncToken = generateSyncToken(username);
      res.json({ success: true, isNewUser: true, syncToken, message: 'Syncing in background...' });
      return;
    }

    // Returning user
    if (!account.credentials_valid) {
      // Password was previously marked invalid. Need to verify live before returning any token.
      const result = await scrapeAcademia({ username, password });
      if (!result.success) {
        res.status(401).json({ success: false, error: 'Invalid portal credentials', code: 'INVALID_CREDENTIALS' });
        return;
      }

      // Verification succeeded. Restore credentials
      account = await prisma.academiaAccount.update({
        where: { username },
        data: { password_encrypted: password, credentials_valid: true }
      });
      await prisma.portalAccount.upsert({
        where: { username },
        update: { password },
        create: { username, password }
      });
    } else {
      // Validate submitted password against stored hash
      try {
        const storedPassword = account.password_encrypted;
        if (storedPassword !== password) {
          // Password doesn't match cache. Might have changed on portal. Verify live.
          const result = await scrapeAcademia({ username, password });
          if (!result.success) {
            res.status(401).json({ success: false, error: 'Invalid portal credentials', code: 'INVALID_CREDENTIALS' });
            return;
          }
          // Verification succeeded. Update DB.
          account = await prisma.academiaAccount.update({
            where: { username },
            data: { password_encrypted: password }
          });
          await prisma.portalAccount.upsert({
            where: { username },
            update: { password },
            create: { username, password }
          });
        }
      } catch (err) {
        // Crypto decryption failed (should rarely happen), force live verify
        const result = await scrapeAcademia({ username, password });
        if (!result.success) {
          res.status(401).json({ success: false, error: 'Invalid portal credentials', code: 'INVALID_CREDENTIALS' });
          return;
        }
        account = await prisma.academiaAccount.update({
          where: { username },
          data: { password_encrypted: password }
        });
        await prisma.portalAccount.upsert({
          where: { username },
          update: { password },
          create: { username, password }
        });
      }
    }

    // Ensure portalAccount is populated for SSO
    await prisma.portalAccount.upsert({
      where: { username },
      update: { password },
      create: { username, password }
    });

    // Passwords match and valid. Issue session token.
    const token = generateSessionToken(username, account.token_version);

    // Register user for full background polling of all tabs via cron
    await registerUserForBackgroundSync(username, { academiaPassword: password, portalPassword: password });

    // Only enqueue a background sync if data is stale (>30 min old) or never synced.
    // Avoids force-resetting syncState to 'queued' on every login, which caused
    // the dashboard to poll sync-status on every page load unnecessarily.
    const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
    const existingSyncState = await prisma.syncState.findUnique({ where: { userId: username } });
    const lastSynced = existingSyncState?.lastSyncedAt;
    const isStale = !lastSynced || (Date.now() - new Date(lastSynced).getTime() > STALE_THRESHOLD_MS);

    const isCurrentlySyncing = existingSyncState?.status === 'queued' || existingSyncState?.status === 'running';

    if (isStale && !isCurrentlySyncing) {
      await prisma.syncState.upsert({
        where: { userId: username },
        update: { status: 'queued', errorCode: null },
        create: { userId: username, status: 'queued' }
      });
      await syncQueue.add('background-sync', { username }, {
        jobId: `sync-${username}-${Date.now()}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 }
      });
    }

    const cached = await prisma.scrapedData.findUnique({ where: { username_type: { username, type: 'full_result' } } });
    const cachedData = cached ? JSON.parse(cached.data) : {};

    res.json({ success: true, isNewUser: false, token, message: 'Login successful', ...cachedData });
    return;

  } catch (err: any) {
    console.error('[Login] Error:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.get('/sync-status', async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const token = authHeader.split(' ')[1] as string;
  let username = '';

  const syncPayload = verifySyncToken(token);
  if (syncPayload) {
    username = syncPayload.username;
  } else {
    const sessionPayload = verifySessionToken(token);
    if (sessionPayload) {
      username = sessionPayload.username;
    } else {
      res.status(401).json({ success: false, error: 'Invalid token' });
      return;
    }
  }

  const syncState = await prisma.syncState.findUnique({ where: { userId: username } });

  if (!syncState) {
    res.json({ success: true, status: 'idle' });
    return;
  }

  let currentStatus = syncState.status;

  if (currentStatus === 'queued' || currentStatus === 'running') {
    const job = await syncQueue.getJob(`sync-${username}`);
    if (!job) {
      // Job is missing from queue but state is queued/running. Fix it.
      currentStatus = 'failed';
      await prisma.syncState.update({
        where: { userId: username },
        data: { status: 'failed', errorCode: 'JOB_LOST' }
      });
      syncState.errorCode = 'JOB_LOST';
    }
  }

  const response: any = {
    success: true,
    status: currentStatus,
    errorCode: syncState.errorCode,
    lastSyncedAt: syncState.lastSyncedAt,
    startedAt: syncState.startedAt
  };

  // If sync succeeded and client used a syncToken, hand them the full session token to avoid an extra endpoint request
  if (currentStatus === 'success') {
    if (syncPayload) {
      const account = await prisma.academiaAccount.findUnique({ where: { username } });
      if (account) {
        response.sessionToken = generateSessionToken(username, account.token_version);
      }
    }
    const cached = await prisma.scrapedData.findUnique({ where: { username_type: { username, type: 'full_result' } } });
    if (cached) {
      Object.assign(response, JSON.parse(cached.data));
    }
  }

  res.json(response);
});

// Protect cached data endpoints
router.get('/cached', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const username = req.user?.username;
  const cached = await prisma.scrapedData.findUnique({ where: { username_type: { username: username!, type: 'full_result' } } });

  if (!cached) {
    res.status(404).json({ success: false, error: 'No data found' });
    return;
  }

  res.json(JSON.parse(cached.data));
});

router.get('/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'No token provided', code: 'NO_TOKEN' });
    return;
  }
  
  const token = authHeader.split(' ')[1] as string;
  const sessionPayload = verifySessionToken(token);
  const syncPayload = verifySyncToken(token);
  const payload = sessionPayload || syncPayload;
  
  if (!payload) {
    res.status(401).json({ success: false, error: 'Invalid or expired token', code: 'INVALID_TOKEN' });
    return;
  }

  res.json({ success: true, username: payload.username });
});

export default router;
