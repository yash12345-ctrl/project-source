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
  // Use purely username and jobType for deduplication.
  // If multiple API requests or cron triggers ask for the same scrape concurrently,
  // BullMQ will simply return the existing active job.
  const jobId = `${jobType}:${username}`;
  return scraperQueue.add(jobType, { username, ...data }, {
    jobId,
    removeOnComplete: true, // Delete from queue on completion so future syncs can happen
    removeOnFail: true,     // Delete on fail so we can retry later
  });
}
