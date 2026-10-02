interface QueuedJob<T = any> {
  jobName: string;
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  promise: Promise<T>;
}

class ScraperJobManager {
  // Map of username -> active or queued jobs
  private userQueues = new Map<string, QueuedJob[]>();
  private userProcessing = new Set<string>(); // Is the queue currently being processed?

  /**
   * For API requests. Joins an existing matching job, or queues a new one and waits for it.
   */
  public async runOrJoin<T>(username: string, jobName: string, fn: () => Promise<T>): Promise<T> {
    let queue = this.userQueues.get(username);
    if (!queue) {
      queue = [];
      this.userQueues.set(username, queue);
    }

    // Check if the exact job is already in the queue or currently running
    const existingJob = queue.find(j => j.jobName === jobName);
    if (existingJob) {
      console.log(`[JobManager] 🤝 Joining existing '${jobName}' job for ${username}`);
      return existingJob.promise;
    }

    // Otherwise, create a new job
    let resolveFn!: (value: T) => void;
    let rejectFn!: (error: any) => void;
    const promise = new Promise<T>((resolve, reject) => {
      resolveFn = resolve;
      rejectFn = reject;
    });

    const newJob: QueuedJob<T> = {
      jobName,
      fn,
      resolve: resolveFn,
      reject: rejectFn,
      promise
    };

    queue.push(newJob);
    console.log(`[JobManager] ➕ Queued '${jobName}' job for ${username}`);

    this.processQueue(username); // Start processing if not already

    return promise;
  }

  /**
   * For cron jobs. If ANY job is running for the user, skip.
   */
  public runOrSkip(username: string, jobName: string, fn: () => Promise<void>): void {
    const queue = this.userQueues.get(username);
    
    // If the queue exists and has items, someone is running or waiting. Skip!
    if (queue && queue.length > 0) {
      console.log(`[JobManager] ⏭️ Skipping background/cron '${jobName}' for ${username} — scraper already running or queued.`);
      return;
    }

    // Safe to run. We use runOrJoin internally to ensure it's locked properly.
    console.log(`[JobManager] ⏱️ Starting background/cron '${jobName}' for ${username}`);
    this.runOrJoin(username, jobName, fn).catch(e => {
      console.error(`[JobManager] Background/cron '${jobName}' failed for ${username}:`, e);
    });
  }

  private async processQueue(username: string) {
    if (this.userProcessing.has(username)) return;
    this.userProcessing.add(username);

    try {
      const queue = this.userQueues.get(username);
      while (queue && queue.length > 0) {
        const job = queue[0]!; // peek
        console.log(`[JobManager] 🚀 Executing '${job.jobName}' for ${username}`);
        try {
          const result = await job.fn();
          job.resolve(result);
        } catch (e) {
          job.reject(e);
        } finally {
          queue.shift(); // remove finished job
        }
      }
    } finally {
      this.userProcessing.delete(username);
      this.userQueues.delete(username);
    }
  }
}

export const jobManager = new ScraperJobManager();
