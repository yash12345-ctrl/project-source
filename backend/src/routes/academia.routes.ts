import { Router, Request, Response } from 'express';
import { prisma } from '../db/db';
import { encryptPassword, decryptPassword } from '../utils/crypto';
import { generateSessionToken, generateSyncToken, verifySessionToken, verifySyncToken } from '../utils/jwt';
import { syncQueue } from '../jobs/syncWorker';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { scrapeAcademia } from '../scraper/academia.scraper';

const router = Router();

// Basic memory store for rate limiting (in prod use Redis)
const rateLimits: Record<string, number[]> = {};
const checkRateLimit = (ip: string, max: number, windowMs: number) => {
  const now = Date.now();
  if (!rateLimits[ip]) rateLimits[ip] = [];
  rateLimits[ip] = rateLimits[ip].filter(t => now - t < windowMs);
  if (rateLimits[ip].length >= max) return false;
  rateLimits[ip].push(now);
  return true;
};

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  if (!checkRateLimit(ip, 5, 60 * 1000)) { // 5 requests per minute
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
      const encrypted = encryptPassword(password);
      
      account = await prisma.academiaAccount.upsert({
        where: { username },
        update: { password_encrypted: encrypted, credentials_valid: true },
        create: { username, password_encrypted: encrypted }
      });

      // Update sync state to queued
      await prisma.syncState.upsert({
        where: { userId: username },
        update: { status: 'queued', errorCode: null },
        create: { userId: username, status: 'queued' }
      });

      // Enqueue BullMQ job with deduplication based on job ID
      await syncQueue.add('full-sync', { username }, { 
        jobId: `sync_${username}`, 
        attempts: 3, 
        backoff: { type: 'exponential', delay: 5000 } 
      });

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
        data: { password_encrypted: encryptPassword(password), credentials_valid: true }
      });
    } else {
      // Validate submitted password against stored hash
      try {
        const storedPassword = decryptPassword(account.password_encrypted);
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
            data: { password_encrypted: encryptPassword(password) }
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
          data: { password_encrypted: encryptPassword(password) }
        });
      }
    }

    // Passwords match and valid. Issue session token.
    const token = generateSessionToken(username, account.token_version);

    // Enqueue background sync to refresh data silently
    await prisma.syncState.upsert({
      where: { userId: username },
      update: { status: 'queued', errorCode: null },
      create: { userId: username, status: 'queued' }
    });
    await syncQueue.add('background-sync', { username }, { 
      jobId: `sync_${username}`, 
      attempts: 3, 
      backoff: { type: 'exponential', delay: 5000 } 
    });

    res.json({ success: true, isNewUser: false, token, message: 'Login successful' });
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

  const response: any = {
    success: true,
    status: syncState.status,
    errorCode: syncState.errorCode,
    lastSyncedAt: syncState.lastSyncedAt,
    startedAt: syncState.startedAt
  };

  // If sync succeeded and client used a syncToken, hand them the full session token to avoid an extra endpoint request
  if (syncState.status === 'success' && syncPayload) {
    const account = await prisma.academiaAccount.findUnique({ where: { username } });
    if (account) {
      response.sessionToken = generateSessionToken(username, account.token_version);
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

// Session verification endpoint used by Dashboard to confirm token is still valid
router.get('/me', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const username = req.user?.username;
  res.json({ success: true, username });
});

export default router;
