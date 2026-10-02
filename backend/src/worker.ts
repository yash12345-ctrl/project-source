import { Worker } from 'bullmq';
import { redisConnectionConfig } from './db/redis';
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

worker.on('completed', (job) => {
  console.log(`[Worker] ✅ Completed ${job.name} for ${job.data.username}`);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] ❌ Failed ${job?.name} for ${job?.data?.username}:`, err.message);
});
