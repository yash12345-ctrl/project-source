import cron, { ScheduledTask } from 'node-cron';
import { scrapeAcademia } from './academia.scraper';
import { scrapeAttendance } from './attendance.scraper';
import type { AcademiaCredentials, ScrapeResult } from '../types/academia.types';

import fs from 'fs';
import path from 'path';

// Directory to store disk cache
const SESSIONS_DIR = path.join(process.cwd(), 'sessions');
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
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

class ScrapeManager {
  private queue: ScrapeJob[] = [];
  private isProcessing: boolean = false;

  public enqueue(type: ScrapeJobType, credentials: AcademiaCredentials): Promise<any> {
    return new Promise((resolve, reject) => {
      this.queue.push({ type, credentials, resolve, reject });
      console.log(`[ScrapeManager] Enqueued ${type} job for ${credentials.username}. Queue length: ${this.queue.length}`);
      this.processNext();
    });
  }

  private async processNext() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const job = this.queue.shift()!;

    console.log(`[ScrapeManager] Starting ${job.type} job for ${job.credentials.username}`);
    
    try {
      if (job.type === 'academia') {
        const result = await runAcademiaScrape(job.credentials);
        job.resolve(result);
      } else if (job.type === 'attendance') {
        const result = await runAttendanceScrape(job.credentials);
        job.resolve(result);
      }
    } catch (e) {
      console.error(`[ScrapeManager] Job failed:`, e);
      job.reject(e);
    } finally {
      this.isProcessing = false;
      this.processNext(); // Process next job in queue
    }
  }
}

const scrapeManager = new ScrapeManager();

/**
 * Runs the Academia scraper and caches the result.
 */
async function runAcademiaScrape(credentials: AcademiaCredentials): Promise<ScrapeResult> {
  console.log(`[CronJob] Running scheduled Academia scrape for user: ${credentials.username}`);
  
  // Scrape academia (dashboard/timetable)
  const result = await scrapeAcademia(credentials);
  scrapeCache.set(credentials.username, result);

  if (result.success) {
    console.log(`[CronJob] Academia scrape completed successfully for: ${credentials.username}`);
    try {
      const cachePath = path.join(SESSIONS_DIR, `${credentials.username.replace(/[^a-zA-Z0-9]/g, '_')}_data.json`);
      fs.writeFileSync(cachePath, JSON.stringify(result));
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
  const attendanceResult = await scrapeAttendance(credentials.username, credentials.password);
  
  if (attendanceResult.success) {
    console.log(`[CronJob] Attendance sync completed successfully for: ${credentials.username}`);
  } else {
    console.error(`[CronJob] Attendance sync failed for ${credentials.username}: ${attendanceResult.error}`);
  }
  return attendanceResult;
}

/**
 * Returns the cached result for a user without triggering a new scrape.
 */
export function getCachedResult(username: string): ScrapeResult | undefined {
  if (scrapeCache.has(username)) {
    return scrapeCache.get(username);
  }
  
  // Try to load from disk
  try {
    const cachePath = path.join(SESSIONS_DIR, `${username.replace(/[^a-zA-Z0-9]/g, '_')}_data.json`);
    if (fs.existsSync(cachePath)) {
      const data = JSON.parse(fs.readFileSync(cachePath, 'utf8')) as ScrapeResult;
      scrapeCache.set(username, data);
      return data;
    }
  } catch (e) {
    console.error(`[CronJob] Failed to read disk cache for ${username}`);
  }
  
  return undefined;
}

/**
 * Manually triggers a scrape and caches the result.
 */
export async function triggerManualScrape(credentials: AcademiaCredentials): Promise<ScrapeResult> {
  // Enqueue both scrapes, wait for Academia to return
  scrapeManager.enqueue('attendance', credentials).catch(e => console.error(e));
  
  await scrapeManager.enqueue('academia', credentials);
  
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
    setTimeout(() => {
      scrapeManager.enqueue(type, credentials).catch(e => console.error(e));
    }, delay);
  };

  const tasks: ScheduledTask[] = [];

  if (customSchedule) {
    tasks.push(cron.schedule(customSchedule, () => runWithJitter('academia')));
    tasks.push(cron.schedule(customSchedule, () => runWithJitter('attendance')));
  } else {
    // Attendance: Every hour, at the top of the hour
    tasks.push(cron.schedule('0 * * * *', () => runWithJitter('attendance')));
    
    // Academia: Once a day at 2:30 AM
    tasks.push(cron.schedule('30 2 * * *', () => runWithJitter('academia')));
  }

  // Run an immediate first scrape of both without jitter so data is available right away
  scrapeManager.enqueue('academia', credentials).catch(e => console.error(e));
  scrapeManager.enqueue('attendance', credentials).catch(e => console.error(e));

  return tasks;
}
