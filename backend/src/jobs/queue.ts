import { PrismaClient } from '@prisma/client';
import { scrapeStaffFinder, scrapeStaffFinderBulk } from '../scraper/staff.scraper';
import { getRedisClient } from '../db/redis';

const prisma = new PrismaClient();
const redis = getRedisClient();

let isProcessing = false;

export async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    // Find the oldest pending job
    const job = await (prisma as any).scrapeJob.findFirst({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' }
    });

    if (!job) {
      isProcessing = false;
      return;
    }

    // Mark as PROCESSING
    await (prisma as any).scrapeJob.update({
      where: { id: job.id },
      data: { status: 'PROCESSING', updatedAt: new Date() }
    });

    try {
      let resultData: any;
      
      if (job.type === 'SEARCH') {
        resultData = await scrapeStaffFinder(job.query);
        
        // Sync with SQLite Database
        if (resultData && Array.isArray(resultData)) {
          for (const staff of resultData) {
            // Always save the faculty, even if they don't have an image
            await (prisma as any).faculty.upsert({
              where: { profileUrl: staff.profileUrl },
              update: {
                name: staff.name,
                imageUrl: staff.imageUrl || '',
                imageBase64: staff.imageBase64 || '',
                email: staff.email,
                phone: staff.phone,
                designation: staff.designation,
                specialization: staff.specialization
              },
              create: {
                name: staff.name,
                profileUrl: staff.profileUrl,
                imageUrl: staff.imageUrl || '',
                imageBase64: staff.imageBase64 || '',
                email: staff.email,
                phone: staff.phone,
                designation: staff.designation,
                specialization: staff.specialization
              }
            });
          }
          if (resultData.length === 0) {
             // Profile Not Found
             await (prisma as any).faculty.upsert({
               where: { profileUrl: `NOT_FOUND:${job.query}` },
               update: {},
               create: {
                 name: job.query,
                 profileUrl: `NOT_FOUND:${job.query}`,
                 imageUrl: '',
                 imageBase64: '',
                 designation: 'Profile Not Found'
               }
             });
          }
        }
        
        // Sync with Redis Cache
        const cacheKey = `search:${job.query.toLowerCase()}`;
        await redis.set(cacheKey, JSON.stringify(resultData), 'EX', 86400); // Cache for 24 hours
        
      } else if (job.type === 'BULK') {
        const queries = JSON.parse(job.query);
        resultData = await scrapeStaffFinderBulk(queries);
        
        // Sync with SQLite Database
        for (const queryKey in resultData) {
          const staff = resultData[queryKey];
          if (staff && staff.profileUrl) {
            // Always save the faculty, even if they don't have an image
            await (prisma as any).faculty.upsert({
              where: { profileUrl: staff.profileUrl },
              update: {
                name: staff.name,
                imageUrl: staff.imageUrl || '',
                imageBase64: staff.imageBase64 || '',
                email: staff.email,
                phone: staff.phone,
                designation: staff.designation,
                specialization: staff.specialization
              },
              create: {
                name: staff.name,
                profileUrl: staff.profileUrl,
                imageUrl: staff.imageUrl || '',
                imageBase64: staff.imageBase64 || '',
                email: staff.email,
                phone: staff.phone,
                designation: staff.designation,
                specialization: staff.specialization
              }
            });
          } else {
            // Profile Not Found
            await (prisma as any).faculty.upsert({
              where: { profileUrl: `NOT_FOUND:${queryKey}` },
              update: {},
              create: {
                name: queryKey,
                profileUrl: `NOT_FOUND:${queryKey}`,
                imageUrl: '',
                imageBase64: '',
                designation: 'Profile Not Found'
              }
            });
          }
        }
        
        // Sync with Redis Cache
        const cacheKey = `bulk:${job.query}`;
        await redis.set(cacheKey, JSON.stringify(resultData), 'EX', 86400); // Cache for 24 hours
      }

      // Mark as COMPLETED and save result
      await (prisma as any).scrapeJob.update({
        where: { id: job.id },
        data: { 
          status: 'COMPLETED', 
          result: JSON.stringify(resultData),
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error(`Error processing job ${job.id}:`, error);
      // Mark as FAILED
      await (prisma as any).scrapeJob.update({
        where: { id: job.id },
        data: { 
          status: 'FAILED', 
          result: JSON.stringify({ error: `Failed to extract data. The scraper might be blocked. Detail: ${error instanceof Error ? error.message : String(error)}` }),
          updatedAt: new Date()
        }
      });
    }

  } catch (err) {
    console.error("Queue Worker Error:", err);
  } finally {
    isProcessing = false;
    // Call processQueue again immediately to process the next job if there is one
    setTimeout(processQueue, 1000);
  }
}

export function startQueueWorker() {
  console.log('🚀 Background Scraper Queue Worker started');
  // Check every 3 seconds for new jobs if it's idle
  setInterval(processQueue, 3000);
}
