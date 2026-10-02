import { Worker } from 'bullmq';
import { redisConnectionConfig, cacheSet } from './db/redis';
import { ATTENDANCE_CACHE_TTL_SECONDS, INTERNAL_MARKS_CACHE_TTL_SECONDS, CACHE_TTL_SECONDS } from './scraper/data.cron';
import { SCRAPER_QUEUE_NAME } from './queue/scraperQueue';

import { scrapeAttendance } from './scraper/attendance.scraper';
import { scrapeGrades } from './scraper/grade.scraper';
import { scrapeFees } from './scraper/fee.scraper';
import { scrapeCalendar } from './scraper/calendar.scraper';
import { scrapeInternalMarks } from './scraper/internalMarks.scraper';
import { scrapeAcademia } from './scraper/academia.scraper';

console.log('👷‍♂️ Starting Scraper Worker...');
console.log(`📡 Listening to queue: ${SCRAPER_QUEUE_NAME}`);

const worker = new Worker(SCRAPER_QUEUE_NAME, async job => {
  const { username, password, forceSync } = job.data;
  const jobName = job.name;

  console.log(`[Worker] 🚀 Processing job: ${jobName} for ${username}`);

  try {
    switch (jobName) {
      case 'attendance_live':
        return await scrapeAttendance(username, password, forceSync);
      case 'grades_live':
        return await scrapeGrades(username, password, forceSync);
      case 'fee_live':
        return await scrapeFees(username, password, forceSync);
      case 'calendar_live':
        return await scrapeCalendar(username, password, forceSync);
      case 'internalmarks_live':
        return await scrapeInternalMarks(username, password, forceSync);
      case 'academia_live':
      case 'academia_manual':
        return await scrapeAcademia(job.data as any);
      default:
        throw new Error(`Unknown job type: ${jobName}`);
    }
  } catch (error) {
    console.error(`[Worker] ❌ Error in job ${jobName} for ${username}:`, error);
    throw error;
  }
}, {
  connection: redisConnectionConfig,
  concurrency: 5 // Run up to 5 headless browsers simultaneously across this worker
});

worker.on('completed', async (job, result) => {
  console.log(`[Worker] ✅ Completed ${job.name} for ${job.data.username}`);
  
  if (result && result.success) {
    const username = job.data.username;
    try {
      switch (job.name) {
        case 'attendance_live':
          await cacheSet(`attendance:${username}`, result, ATTENDANCE_CACHE_TTL_SECONDS);
          break;
        case 'grades_live':
          await cacheSet(`grades:${username}`, result, CACHE_TTL_SECONDS);
          break;
        case 'fee_live':
          await cacheSet(`fees:${username}`, result, CACHE_TTL_SECONDS);
          break;
        case 'calendar_live':
          await cacheSet(`calendar:${username}`, result, CACHE_TTL_SECONDS);
          break;
        case 'internalmarks_live':
          await cacheSet(`internalmarks:${username}`, result, INTERNAL_MARKS_CACHE_TTL_SECONDS);
          break;
      }
    } catch (e) {
      console.error(`[Worker] ❌ Failed to save cache for ${job.name}:`, e);
    }
  }
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] ❌ Failed ${job?.name} for ${job?.data?.username}:`, err.message);
});
