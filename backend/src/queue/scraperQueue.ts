import { Queue, QueueEvents } from 'bullmq';
import { redisConnectionConfig } from '../db/redis';

export const SCRAPER_QUEUE_NAME = 'scraper_jobs';

// The Queue instance is used by the Express API to add jobs
export const scraperQueue = new Queue(SCRAPER_QUEUE_NAME, {
  connection: redisConnectionConfig
});

// The QueueEvents instance allows the API to await job completion (RPC style)
export const scraperQueueEvents = new QueueEvents(SCRAPER_QUEUE_NAME, {
  connection: redisConnectionConfig
});

// Helper to safely enqueue a scrape job
export async function enqueueScrapeJob(
  jobType: string,
  username: string,
  data: any
) {
  // We use a combination of username and jobType for deduplication if needed
  const jobId = `${jobType}_${username}_${Date.now()}`;
  return scraperQueue.add(jobType, { username, ...data }, {
    jobId,
    removeOnComplete: 100, // Keep last 100 completed jobs in Redis
    removeOnFail: 500,     // Keep last 500 failed jobs
  });
}
