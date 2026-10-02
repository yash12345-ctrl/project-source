import { Router, Request, Response } from 'express';
import { scrapeAcademia } from '../scraper/academia.scraper';
import { getCachedResult, setCachedResult, scheduleScrapeCronJob, triggerManualScrape } from '../scraper/scrape.cron';
import { registerUserForBackgroundSync } from '../scraper/data.cron';
import type { AcademiaCredentials } from '../types/academia.types';
import { jobManager } from '../scraper/jobManager';
import { prisma } from '../db/db';

const router = Router();

/**
 * POST /api/academia/login
 * One-shot: logs in and scrapes data immediately. Returns fresh results.
 *
 * Body: { username: string, password: string }
 */
router.post('/login', async (req: Request, res: Response) => {
  let { username, password, forceSync, token } = req.body;

  if (token) {
    const session = await prisma.session.findUnique({ where: { token } });
    if (!session || session.expiresAt < new Date()) {
      res.status(401).json({ success: false, error: 'Session expired. Please log in again.' });
      return;
    }
    username = session.username;
  }

  if (!username) {
    res.status(400).json({ success: false, error: 'Username is required.' });
    return;
  }

  if (!password) {
    const account = await prisma.academiaAccount.findUnique({ where: { username } });
    if (account) {
      password = account.password;
    } else {
      res.status(401).json({ success: false, error: 'Academia password not found. Please log in.' });
      return;
    }
  }

  // If we just want cache (e.g. on page refresh) and it exists, return it instantly without scraping
  const cached = await getCachedResult(username);
  if (cached && !forceSync) {
    console.log(`[API] /academia/login returned CACHE for ${username} (forceSync=false)`);
    // Still ensure they are registered for background cron
    registerUserForBackgroundSync(username, { academiaPassword: password });
    res.json({
      ...cached,
      success: true,
      message: 'Using cached data',
      cached: true,
      username // Return username so frontend knows who is logged in
    });
    return;
  }

  console.log(`[API] /academia/login called for user: ${username}`);

  let responseSent = false;

  let sessionToken: string | null = null;

  const createSession = async () => {
    if (!sessionToken) {
      await prisma.academiaAccount.upsert({
        where: { username },
        update: { password },
        create: { username, password }
      });

      const crypto = require('crypto');
      const newToken: string = crypto.randomUUID();
      sessionToken = newToken;
      await prisma.session.create({
        data: {
          token: newToken,
          username,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });
    }
    return sessionToken as string;
  };

  const onLoginSuccess = async () => {
    if (!responseSent) {
      console.log(`[API] Login verified for ${username}. Returning early response (pending: true).`);
      const cached = await getCachedResult(username);
      const token = await createSession();
      res.json({
        ...(cached && { ...cached }),
        success: true,
        pending: true,
        message: 'Login successful. Scraping in background...',
        username,
        token
      });
      responseSent = true;
    }
  };

  try {
    const resultPromise = jobManager.runOrJoin(username, 'academia_live', () => 
      scrapeAcademia({ username, password }, onLoginSuccess)
    );
    const result = await resultPromise;

    if (result.success) {
      setCachedResult(username, result);
      registerUserForBackgroundSync(username, { academiaPassword: password });
      const token = await createSession();
      (result as any).token = token;
      (result as any).username = username;
    }

    if (!responseSent) {
      if (!result.success) {
        res.status(401).json(result);
      } else {
        res.json(result);
      }
      responseSent = true;
    }
  } catch (err: any) {
    if (!responseSent) {
      res.status(401).json({ success: false, error: err.message || 'Login failed' });
      responseSent = true;
    }
  }
});

/**
 * GET /api/academia/me
 * Resolves a session token to a username securely.
 */
router.get('/me', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ success: false, error: 'No token provided' });
    return;
  }

  const session = await prisma.session.findUnique({ where: { token } });
  if (!session || session.expiresAt < new Date()) {
    res.status(401).json({ success: false, error: 'Session expired' });
    return;
  }

  res.json({ success: true, username: session.username });
});

/**
 * POST /api/academia/schedule
 * Schedules a recurring cron job that scrapes data automatically.
 * Returns immediately; scraping runs in background.
 *
 * Body: { username: string, password: string, cronExpression?: string }
 * Default cron: every 30 minutes
 */
router.post('/schedule', async (req: Request, res: Response) => {
  const { username, password, cronExpression } = req.body as AcademiaCredentials & { cronExpression?: string };

  if (!username || !password) {
    res.status(400).json({ success: false, error: 'Username and password are required.' });
    return;
  }

  const schedule = cronExpression;

  scheduleScrapeCronJob({ username, password }, schedule);

  res.json({
    success: true,
    message: `Cron job scheduled for ${username} with smart schedule. First scrape is running in background.`,
  });
});

/**
 * POST /api/academia/scrape
 * Manually triggers an immediate scrape and caches the result.
 *
 * Body: { username: string, password: string }
 */
router.post('/scrape', async (req: Request, res: Response) => {
  const { username, password } = req.body as AcademiaCredentials;

  if (!username || !password) {
    res.status(400).json({ success: false, error: 'Username and password are required.' });
    return;
  }

  const result = await triggerManualScrape({ username, password });
  res.json(result);
});

/**
 * GET /api/academia/cached/:username
 * Returns the last cached scrape result for a given username (no re-scrape).
 */
router.get('/cached/:username', async (req: Request, res: Response) => {
  const username = req.params.username as string;
  const cached = await getCachedResult(username);

  if (!cached) {
    res.status(404).json({ success: false, error: `No cached data found for user: ${username}. Please trigger a scrape first.` });
    return;
  }

  res.json(cached);
});

export default router;
