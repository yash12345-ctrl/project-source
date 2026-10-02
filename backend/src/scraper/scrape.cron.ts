import cron, { ScheduledTask } from 'node-cron';
import { scrapeAcademia } from './academia.scraper';
import { scrapeAttendance } from './attendance.scraper';
import type { AcademiaCredentials, ScrapeResult } from '../types/academia.types';
import { enqueueScrapeJob, scraperQueueEvents } from '../queue/scraperQueue';

import fsSync from 'fs';
import fs from 'fs/promises';
import path from 'path';

// Directory to store disk cache
const SESSIONS_DIR = path.join(process.cwd(), 'sessions');
if (!fsSync.existsSync(SESSIONS_DIR)) {
  fsSync.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// In-memory cache to store the last scraped results per user
const scrapeCache = new Map<string, ScrapeResult>();

type ScrapeJobType = 'academia' | 'attendance';

interface ScrapeJob {
  type: ScrapeJobType;
  credentials: AcademiaCredentials;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}



/**
 * Runs the Academia scraper and caches the result.
 */
async function runAcademiaScrape(credentials: AcademiaCredentials): Promise<ScrapeResult> {
  console.log(`[CronJob] Running scheduled Academia scrape for user: ${credentials.username}`);
  
  // Scrape academia (dashboard/timetable)
  const job = await enqueueScrapeJob('academia_live', credentials.username, credentials);
  const result = await job.waitUntilFinished(scraperQueueEvents) as any;
  scrapeCache.set(credentials.username, result);

  if (result && result.success) {
    console.log(`[CronJob] Academia scrape completed successfully for: ${credentials.username}`);
    try {
      const cachePath = path.join(SESSIONS_DIR, `${credentials.username.replace(/[^a-zA-Z0-9]/g, '_')}_data.json`);
      await fs.writeFile(cachePath, JSON.stringify(result));
    } catch (e) {
      console.error(`[CronJob] Failed to write disk cache for ${credentials.username}`);
    }
  } else {
    console.error(`[CronJob] Academia scrape failed for ${credentials.username}: ${result.error}`);
  }
  return result;
}

/**
 * Runs the Attendance scraper.
 */
async function runAttendanceScrape(credentials: AcademiaCredentials): Promise<any> {
  if (!credentials.password) {
    console.log(`[CronJob] Skipping attendance sync for ${credentials.username}: No password provided`);
    return { success: false, error: 'No password provided' };
  }

  console.log(`[CronJob] Triggering attendance sync for user: ${credentials.username}`);
  const job = await enqueueScrapeJob('attendance_live', credentials.username, { password: credentials.password, forceSync: false });
  const attendanceResult = await job.waitUntilFinished(scraperQueueEvents) as any;
  
  if (attendanceResult && attendanceResult.success) {
    console.log(`[CronJob] Attendance sync completed successfully for: ${credentials.username}`);
  } else {
    console.error(`[CronJob] Attendance sync failed for ${credentials.username}: ${attendanceResult?.error}`);
  }
  return attendanceResult;
}

/**
 * Returns the cached result for a user without triggering a new scrape.
 */
export async function getCachedResult(username: string): Promise<ScrapeResult | undefined> {
  if (scrapeCache.has(username)) {
    return scrapeCache.get(username);
  }
  
  // Try to load from disk
  try {
    const cachePath = path.join(SESSIONS_DIR, `${username.replace(/[^a-zA-Z0-9]/g, '_')}_data.json`);
    try {
      const fileContent = await fs.readFile(cachePath, 'utf8');
      const data = JSON.parse(fileContent) as ScrapeResult;
      scrapeCache.set(username, data);
      return data;
    } catch (err: any) {
      if (err.code !== 'ENOENT') console.error(`[CronJob] Failed to read disk cache for ${username}`, err);
    }
    console.error(`[CronJob] Failed to read disk cache for ${username}`);
  } catch (e) {
    console.error(`[CronJob] General error loading disk cache for ${username}`, e);
  }
  
  return undefined;
}

export async function setCachedResult(username: string, result: ScrapeResult) {
  scrapeCache.set(username, result);
  try {
    const cachePath = path.join(SESSIONS_DIR, `${username.replace(/[^a-zA-Z0-9]/g, '_')}_data.json`);
    await fs.writeFile(cachePath, JSON.stringify(result));
  } catch (e) {
    console.error(`[CronJob] Failed to write disk cache for ${username}`);
  }
}

/**
 * Manually triggers a scrape and caches the result.
 */
export async function triggerManualScrape(credentials: AcademiaCredentials): Promise<ScrapeResult> {
  // Enqueue both scrapes, wait for Academia to return
  runAttendanceScrape(credentials).catch(e => console.error(e));

  // Await the academia scrape
  await runAcademiaScrape(credentials);
  
  return scrapeCache.get(credentials.username) ?? {
    success: false,
    error: 'Result not found after scrape.',
  };
}

export function scheduleScrapeCronJob(
  credentials: AcademiaCredentials,
  customSchedule?: string
): ScheduledTask[] {
  console.log(`[CronJob] Scheduling smart scrapes for ${credentials.username}`);

  const runWithJitter = (type: ScrapeJobType) => {
    // Random delay between 0 and 5 minutes (300,000 ms) to avoid exact-minute detection
    const delay = Math.floor(Math.random() * 300000);
    console.log(`[CronJob] ${type} scrape triggered for ${credentials.username}. Waiting ${Math.round(delay/1000)}s for stealth...`);
    setTimeout(async () => {
      try {
        if (type === 'academia') {
          await runAcademiaScrape(credentials);
        } else if (type === 'attendance') {
          await runAttendanceScrape(credentials);
        }
      } catch (e) {
        console.error(e);
      }
    }, delay);
  };

  const tasks: ScheduledTask[] = [];

  if (customSchedule) {
    tasks.push(cron.schedule(customSchedule, () => runWithJitter('academia')));
  } else {
    // Academia: Once every 2 days at 2:30 AM
    tasks.push(cron.schedule('30 2 */2 * *', () => runWithJitter('academia')));
  }

  // Run an immediate first scrape of both without jitter so data is available right away
  runAcademiaScrape(credentials).catch(e => console.error(e));
  runAttendanceScrape(credentials).catch(e => console.error(e));

  return tasks;
}
