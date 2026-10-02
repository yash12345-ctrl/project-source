import { Queue, Worker, Job, UnrecoverableError } from 'bullmq';
import { redisConnectionConfig } from '../db/redis';
import { prisma } from '../db/db';
import { scrapeAcademia } from '../scraper/academia.scraper';
import { decryptPassword } from '../utils/crypto';

export const syncQueue = new Queue('syncQueue', {
  connection: redisConnectionConfig
});

export const startSyncWorker = () => {
  const worker = new Worker('syncQueue', async (job: Job) => {
    const { username } = job.data;

    // Set state to running
    await prisma.syncState.upsert({
      where: { userId: username },
      update: { status: 'running', startedAt: new Date(), jobId: job.id || null },
      create: { userId: username, status: 'running', startedAt: new Date(), jobId: job.id || null }
    });

    const account = await prisma.academiaAccount.findUnique({ where: { username } });
    if (!account) {
      throw new UnrecoverableError('Account not found in database');
    }

    const password = decryptPassword(account.password_encrypted);

    try {
      const result = await scrapeAcademia({ username, password });

      if (!result.success) {
        throw new Error(result.error || 'Scrape failed without specific error');
      }

      // Successful Scrape - write data to DB
      await prisma.$transaction(async (tx) => {
        // Save cached JSON results
        await tx.scrapedData.upsert({
          where: { username_type: { username, type: 'full_result' } },
          update: { data: JSON.stringify(result) },
          create: { username, type: 'full_result', data: JSON.stringify(result) }
        });

        // Update user state
        await tx.academiaAccount.update({
          where: { username },
          data: { initial_sync_complete: true }
        });

        // Update sync state
        await tx.syncState.update({
          where: { userId: username },
          data: { status: 'success', errorCode: null, lastSyncedAt: new Date() }
        });
      });

    } catch (err: any) {
      console.error(`[SyncWorker] Error for ${username}:`, err.message);
      
      const isAuthError = err.message.toLowerCase().includes('login failed') || 
                          err.message.toLowerCase().includes('invalid credential');
                          
      if (isAuthError) {
        // Revoke credentials and tokens
        await prisma.$transaction(async (tx) => {
          await tx.academiaAccount.update({
            where: { username },
            data: { 
              credentials_valid: false, 
              token_version: { increment: 1 } 
            }
          });

          await tx.syncState.update({
            where: { userId: username },
            data: { status: 'failed', errorCode: 'AUTH_ERROR' }
          });
        });
        
        throw new UnrecoverableError('AUTH_ERROR: Invalid portal credentials');
      } else {
        // Other errors (timeout, captcha, portal down)
        // Set state to failed but don't revoke credentials. BullMQ will retry based on job options.
        await prisma.syncState.update({
          where: { userId: username },
          data: { status: 'failed', errorCode: 'SCRAPE_FAILED' }
        });
        
        throw err;
      }
    }

  }, {
    connection: redisConnectionConfig,
    concurrency: 2 // Max 2 concurrent scrapers to prevent high CPU usage
  });

  worker.on('failed', (job, err) => {
    console.error(`[SyncWorker] Job ${job?.id} failed:`, err.message);
  });

  console.log('🚀 Background SyncWorker started (BullMQ)');
  return worker;
};
