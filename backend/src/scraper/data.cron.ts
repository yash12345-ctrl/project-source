/**
 * data.cron.ts
 *
 * Background schedulers for all student data scrapers:
 *
 *  - Attendance  : every 1 hour  (changes during the day as faculty mark it)
 *  - Fees        : every 2 days  (rarely changes)
 *  - Calendar    : every 2 days  (rarely changes)
 *  - Grades      : every 2 days  (rarely changes)
 *
 * For each scraper the pattern is the same:
 *   1. Scrape fresh data silently in the background.
 *   2. If the new data differs from what is cached, overwrite Redis.
 *   3. On the next user request, the route returns the updated cache instantly.
 *
 * Faculty scraper is handled by its own Prisma + Redis queue (unchanged).
 */

import cron from 'node-cron';
import { cacheGet, cacheSet, getRedisClient, isRedisReady } from '../db/redis';
import { enqueueScrapeJob, scraperQueueEvents } from '../queue/scraperQueue';

// ── TTLs ──────────────────────────────────────────────────────────────────

/** Attendance: 2 hours — cron refreshes every hour so this keeps a safety buffer */
export const ATTENDANCE_CACHE_TTL_SECONDS = 7200; // 2 hours

/** Internal Marks: 2 hours — cron refreshes every 1 hour */
export const INTERNAL_MARKS_CACHE_TTL_SECONDS = 7200; // 2 hours

/** Fees / Calendar / Grades: 2 days */
export const CACHE_TTL_SECONDS = 172800; // 2 days

// ── User registry (Redis-backed) ───────────────────────────────────────────

/**
 * Redis hash key that maps username → JSON({academiaPassword, portalPassword}).
 * Replaces the previous in-process Map which was invisible to other API/worker
 * instances, causing half the users to be missed by each instance's cron jobs.
 */
const REGISTRY_KEY = 'user:registry';

/**
 * Returns all registered users and their credentials from Redis.
 * Falls back to an empty map if Redis is unavailable.
 */
async function getUserRegistry(): Promise<Map<string, { academiaPassword?: string; portalPassword?: string }>> {
  const map = new Map<string, { academiaPassword?: string; portalPassword?: string }>();
  if (!isRedisReady()) return map;
  try {
    const all = await getRedisClient().hgetall(REGISTRY_KEY);
    if (all) {
      for (const [username, raw] of Object.entries(all)) {
        try { map.set(username, JSON.parse(raw)); } catch {}
      }
    }
  } catch (e) {
    console.error('[DataCron] Failed to read user registry from Redis:', e);
  }
  return map;
}

/**
 * Call this after any successful login or live scrape so the user
 * is included in all background refresh cycles across ALL instances.
 */
export async function registerUserForBackgroundSync(username: string, options: { academiaPassword?: string; portalPassword?: string }): Promise<void> {
  if (!username) return;
  if (!isRedisReady()) {
    console.warn('[DataCron] Redis unavailable — skipping registry update for', username);
    return;
  }
  try {
    const client = getRedisClient();
    const raw = await client.hget(REGISTRY_KEY, username);
    const existing = raw ? JSON.parse(raw) : {};
    if (options.academiaPassword) existing.academiaPassword = options.academiaPassword;
    if (options.portalPassword)   existing.portalPassword   = options.portalPassword;
    const isNew = !raw;
    await client.hset(REGISTRY_KEY, username, JSON.stringify(existing));
    if (isNew) {
      const total = await client.hlen(REGISTRY_KEY);
      console.log(`[DataCron] 📋 Registered ${username} for background sync. Total: ${total}`);
    }
  } catch (e) {
    console.error('[DataCron] Failed to register user in Redis:', e);
  }
}

// ── Attendance background refresh (40-minute) ────────────────────────────────

/**
 * Scrapes attendance for one user and overwrites Redis only if data changed.
 */
export async function refreshAttendance(username: string, password: string): Promise<void> {
  const cacheKey = `attendance:${username}`;
  console.log(`[DataCron/Attendance] 🔄 Checking attendance for ${username}...`);

  const job = await enqueueScrapeJob('attendance_live', username, { password, forceSync: false });
  const result = await job.waitUntilFinished(scraperQueueEvents) as any;

  if (!result.success || !result.attendance) {
    console.warn(`[DataCron/Attendance] ❌ Scrape failed for ${username} — keeping existing cache.`);
    return;
  }

  // Compare with cached version — only update Redis if something changed
  const cached = await cacheGet<any>(cacheKey);
  const newSnapshot  = JSON.stringify(result.attendance);
  const oldSnapshot  = JSON.stringify(cached?.attendance ?? []);

  if (newSnapshot === oldSnapshot) {
    console.log(`[DataCron/Attendance] ✅ No change for ${username} — cache unchanged.`);
    // Still reset TTL so it doesn't expire between runs
    await cacheSet(cacheKey, result, ATTENDANCE_CACHE_TTL_SECONDS);
    return;
  }

  console.log(`[DataCron/Attendance] 🆕 Attendance changed for ${username}! Updating Redis...`);
  await cacheSet(cacheKey, result, ATTENDANCE_CACHE_TTL_SECONDS);
}

/**
 * Runs the 40-minute attendance refresh cycle for every registered user.
 * Sequential to avoid hammering the portal with concurrent browser sessions.
 */
async function runAttendanceRefreshCycle(): Promise<void> {
  const userRegistry = await getUserRegistry();
  if (userRegistry.size === 0) return;

  const now = new Date();
  const hour = now.getHours();

  // Only run between 8:00 AM and 6:00 PM
  if (hour < 8 || hour >= 18) {
    console.log('[DataCron/Attendance] ⏭️ Skipping attendance cycle (Out of hours: 8 AM - 6 PM only)');
    return;
  }

  console.log(`[DataCron/Attendance] ⏰ Starting 40-minute attendance refresh for ${userRegistry.size} user(s)...`);

  for (const [username, creds] of userRegistry.entries()) {
    if (!creds.portalPassword) {
      console.log(`[DataCron/Attendance] ⏭️ Skip ${username} — no portal password`);
      continue;
    }

    // Check if today is a holiday (Sunday fallback, plus calendar check)
    let isHoliday = now.getDay() === 0; // 0 is Sunday
    try {
      const calendarData = await cacheGet<any>(`calendar:${username}`);
      if (calendarData && calendarData.rows) {
        const todayStr = now.toDateString();
        const todayRow = calendarData.rows.find((row: any) => {
          try { return new Date(row.date).toDateString() === todayStr; }
          catch { return false; }
        });
        if (todayRow && todayRow.status && todayRow.status.toLowerCase().includes('holiday')) {
          isHoliday = true;
        }
      }
    } catch (e) {}

    if (isHoliday) {
      console.log(`[DataCron/Attendance] ⏭️ Skip ${username} — Today is a Holiday/Sunday`);
      continue;
    }

    try {
      await refreshAttendance(username, creds.portalPassword!);
    } catch (e) {
      console.error(`[DataCron/Attendance] Error for ${username}:`, e);
    }
    // Small cooldown between submitting users
    await new Promise(r => setTimeout(r, 3000));
  }

  console.log('[DataCron/Attendance] ✅ 40-minute attendance refresh complete.');
}

// ── Internal Marks background refresh (every 1 hour) ─────────────────────────

export async function refreshInternalMarks(username: string, password: string): Promise<void> {
  const cacheKey = `internalmarks:${username}`;
  console.log(`[DataCron/InternalMarks] 🔄 Checking internal marks for ${username}...`);

  const job = await enqueueScrapeJob('internalmarks_live', username, { password, forceSync: false });
  const result = await job.waitUntilFinished(scraperQueueEvents) as any;

  if (!result.success || !result.marks) {
    console.warn(`[DataCron/InternalMarks] ❌ Scrape failed for ${username} — keeping existing cache.`);
    return;
  }

  const cached = await cacheGet<any>(cacheKey);
  const newSnapshot = JSON.stringify(result.marks);
  const oldSnapshot = JSON.stringify(cached?.marks ?? []);

  if (newSnapshot === oldSnapshot) {
    console.log(`[DataCron/InternalMarks] ✅ No change for ${username} — cache unchanged.`);
    await cacheSet(cacheKey, result, INTERNAL_MARKS_CACHE_TTL_SECONDS);
    return;
  }

  console.log(`[DataCron/InternalMarks] 🆕 Internal marks changed for ${username}! Updating Redis...`);
  await cacheSet(cacheKey, result, INTERNAL_MARKS_CACHE_TTL_SECONDS);
}

async function runInternalMarksRefreshCycle(): Promise<void> {
  const userRegistry = await getUserRegistry();
  if (userRegistry.size === 0) return;

  const now = new Date();
  const hour = now.getHours();

  // Only run between 8:00 AM and 6:00 PM
  if (hour < 8 || hour >= 18) {
    console.log('[DataCron/InternalMarks] ⏭️ Skipping internal marks cycle (Out of hours: 8 AM - 6 PM only)');
    return;
  }

  console.log(`[DataCron/InternalMarks] ⏰ Starting 2-hour internal marks refresh for ${userRegistry.size} user(s)...`);

  for (const [username, creds] of userRegistry.entries()) {
    if (!creds.portalPassword) {
      console.log(`[DataCron/InternalMarks] ⏭️ Skip ${username} — no portal password`);
      continue;
    }

    // Check if today is a holiday (Sunday fallback, plus calendar check)
    let isHoliday = now.getDay() === 0; // 0 is Sunday
    try {
      const calendarData = await cacheGet<any>(`calendar:${username}`);
      if (calendarData && calendarData.rows) {
        const todayStr = now.toDateString();
        const todayRow = calendarData.rows.find((row: any) => {
          try { return new Date(row.date).toDateString() === todayStr; }
          catch { return false; }
        });
        if (todayRow && todayRow.status && todayRow.status.toLowerCase().includes('holiday')) {
          isHoliday = true;
        }
      }
    } catch (e) {}

    if (isHoliday) {
      console.log(`[DataCron/InternalMarks] ⏭️ Skip ${username} — Today is a Holiday/Sunday`);
      continue;
    }

    try {
      await refreshInternalMarks(username, creds.portalPassword!);
    } catch (e) {
      console.error(`[DataCron/InternalMarks] Error for ${username}:`, e);
    }
    // Small cooldown between submitting users
    await new Promise(r => setTimeout(r, 3000));
  }

  console.log('[DataCron/InternalMarks] ✅ 2-hour internal marks refresh complete.');
}

// ── Fees & Grades (every 7 days) ────────────

export async function syncFeesAndGrades(username: string, password: string): Promise<void> {
  console.log(`[DataCron] 🔄 Starting 7-day data sync for ${username}...`);

  const feesJob = await enqueueScrapeJob('fee_live', username, { password, forceSync: false });
  const feesResult = await feesJob.waitUntilFinished(scraperQueueEvents).catch(e => ({ success: false, error: e })) as any;

  const gradesJob = await enqueueScrapeJob('grades_live', username, { password, forceSync: false });
  const gradesResult = await gradesJob.waitUntilFinished(scraperQueueEvents).catch(e => ({ success: false, error: e })) as any;

  if (feesResult.success) {
    await cacheSet(`fees:${username}`, feesResult, CACHE_TTL_SECONDS);
    console.log(`[DataCron] ✅ Fees updated for ${username}`);
  } else {
    console.error(`[DataCron] ❌ Fees sync failed for ${username}`, (feesResult as any).error);
  }

  if (gradesResult.success) {
    await cacheSet(`grades:${username}`, gradesResult, CACHE_TTL_SECONDS);
    console.log(`[DataCron] ✅ Grades updated for ${username}`);
  } else {
    console.error(`[DataCron] ❌ Grades sync failed for ${username}`, (gradesResult as any).error);
  }

  console.log(`[DataCron] ✔ 7-day sync complete for ${username}`);
}

// ── Calendar (every 1 day) ────────────

export async function syncCalendar(username: string, password: string): Promise<void> {
  console.log(`[DataCron] 🔄 Starting 1-day calendar sync for ${username}...`);

  const calendarJob = await enqueueScrapeJob('calendar_live', username, { password, forceSync: false });
  const calendarResult = await calendarJob.waitUntilFinished(scraperQueueEvents).catch(e => ({ success: false, error: e })) as any;

  if (calendarResult.success) {
    await cacheSet(`calendar:${username}`, calendarResult, CACHE_TTL_SECONDS);
    console.log(`[DataCron] ✅ Calendar updated for ${username}`);
  } else {
    console.error(`[DataCron] ❌ Calendar sync failed for ${username}`, (calendarResult as any).error);
  }

  console.log(`[DataCron] ✔ 1-day calendar sync complete for ${username}`);
}

async function runFeesGradesRefreshCycle(): Promise<void> {
  const userRegistry = await getUserRegistry();
  if (userRegistry.size === 0) return;
  console.log(`[DataCron] 🚀 Starting 7-day Fees/Grades refresh for ${userRegistry.size} user(s)...`);
  for (const [username, creds] of userRegistry.entries()) {
    if (!creds.portalPassword) continue;
    try { await syncFeesAndGrades(username, creds.portalPassword!); } catch (e) { console.error(e); }
    await new Promise(r => setTimeout(r, 5000));
  }
  console.log('[DataCron] ✅ 7-day Fees/Grades refresh complete.');
}

async function runCalendarRefreshCycle(): Promise<void> {
  const userRegistry = await getUserRegistry();
  if (userRegistry.size === 0) return;
  console.log(`[DataCron] 🚀 Starting 1-day Calendar refresh for ${userRegistry.size} user(s)...`);
  for (const [username, creds] of userRegistry.entries()) {
    if (!creds.portalPassword) continue;
    try { await syncCalendar(username, creds.portalPassword!); } catch (e) { console.error(e); }
    await new Promise(r => setTimeout(r, 5000));
  }
  console.log('[DataCron] ✅ 1-day Calendar refresh complete.');
}

// ── Scheduler bootstrap ───────────────────────────────────────────────────

/**
 * Starts both background cron schedulers.
 * Call once from index.ts at server startup.
 *
 * Schedules:
 *   Attendance  : every 40 minutes
 *   Fees/Cal/Gr : midnight every 2nd day
 */
export function startDataCronJob(): void {
  // 40-minute attendance refresh
  console.log('[DataCron] 📅 Scheduling 40-minute attendance refresh (*/40 * * * *)');
  cron.schedule('*/40 * * * *', () => {
    console.log('[DataCron] ⏰ 40-minute attendance cron triggered...');
    runAttendanceRefreshCycle().catch(err =>
      console.error('[DataCron] Attendance cycle error:', err)
    );
  });

  // 2-hour internal marks refresh
  console.log('[DataCron] 📅 Scheduling 2-hour internal marks refresh (0 */2 * * *)');
  cron.schedule('0 */2 * * *', () => {
    console.log('[DataCron] ⏰ 2-hour internal marks cron triggered...');
    runInternalMarksRefreshCycle().catch(err =>
      console.error('[DataCron] Internal marks cycle error:', err)
    );
  });

  // 7-day Fees / Grades refresh at 1:00 AM
  console.log('[DataCron] 📅 Scheduling 7-day Fees/Grades refresh (0 1 */7 * *)');
  cron.schedule('0 1 */7 * *', () => {
    console.log('[DataCron] ⏰ 7-day Fees/Grades cron triggered...');
    runFeesGradesRefreshCycle().catch(err =>
      console.error('[DataCron] 7-day cycle error:', err)
    );
  });

  // 1-day Calendar refresh at 3:00 AM
  console.log('[DataCron] 📅 Scheduling 1-day Calendar refresh (0 3 * * *)');
  cron.schedule('0 3 * * *', () => {
    console.log('[DataCron] ⏰ 1-day Calendar cron triggered...');
    runCalendarRefreshCycle().catch(err =>
      console.error('[DataCron] 1-day cycle error:', err)
    );
  });
}
