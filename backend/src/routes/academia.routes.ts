import { Router, Request, Response } from 'express';
import { scrapeAcademia } from '../scraper/academia.scraper';
import { triggerManualScrape, getCachedResult, scheduleScrapeCronJob } from '../scraper/scrape.cron';
import type { AcademiaCredentials } from '../types/academia.types';

const router = Router();

/**
 * POST /api/academia/login
 * One-shot: logs in and scrapes data immediately. Returns fresh results.
 *
 * Body: { username: string, password: string }
 */
router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body as AcademiaCredentials;

  if (!username || !password) {
    res.status(400).json({ success: false, error: 'Username and password are required.' });
    return;
  }

  console.log(`[API] /academia/login called for user: ${username}`);

  let responseSent = false;

  const onLoginSuccess = () => {
    if (!responseSent) {
      console.log(`[API] Login verified for ${username}. Returning early response (pending: true).`);
      // Check if we have cached data for this user on disk/memory
      const cached = getCachedResult(username);
      
      // Return cached data immediately if available, otherwise just pending
      res.json({ 
        success: true, 
        pending: true, 
        message: 'Login successful. Scraping in background...',
        ...(cached && { ...cached }) // Spread cached data into response if it exists
      });
      responseSent = true;
    }
  };

  try {
    // Start the scrape, but don't await its completion to send the response
    // The scrape function will call onLoginSuccess once authenticated
    const resultPromise = scrapeAcademia({ username, password }, onLoginSuccess);
    
    // We still await the result so we can handle errors if login fails,
    // or if onLoginSuccess wasn't called for some reason.
    const result = await resultPromise;
    
    // If the scrape finishes and we STILL haven't sent a response (e.g., fast path failed?), send it now.
    if (!responseSent) {
      if (!result.success) {
        res.status(401).json(result);
      } else {
        res.json(result);
      }
      responseSent = true;
    }
    
    // Once the full scrape finishes, update the disk cache (if it succeeded)
    if (result.success) {
      triggerManualScrape({ username, password }).catch(e => console.error(e));
    }
  } catch (err: any) {
    if (!responseSent) {
      res.status(401).json({ success: false, error: err.message || 'Login failed' });
      responseSent = true;
    }
  }
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
router.get('/cached/:username', (req: Request, res: Response) => {
  const username = req.params.username as string;
  const cached = getCachedResult(username);

  if (!cached) {
    res.status(404).json({ success: false, error: `No cached data found for user: ${username}. Please trigger a scrape first.` });
    return;
  }

  res.json(cached);
});

export default router;
