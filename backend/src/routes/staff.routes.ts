import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { redisConnectionConfig } from '../db/redis';

const router = Router();
const prisma = new PrismaClient();
const redis = new Redis(redisConnectionConfig);

// Route to submit a search job
router.get('/search', async (req: Request, res: Response) => {
  const query = req.query.q as string;
  if (!query) {
    return res.status(400).json({ error: 'Query parameter "q" is required.' });
  }

  try {
    const cacheKey = `search:${query.toLowerCase()}`;
    
    // 1. Check Redis Cache
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return res.json({ results: JSON.parse(cachedData), cached: true });
    }

    // 2. Check SQLite DB (if it wasn't in Redis for some reason)
    const dbHit = await (prisma as any).faculty.findMany({
      where: { name: { contains: query } }
    });
    
    // Check if there's an exact NOT_FOUND match for this query
    const notFoundHit = await (prisma as any).faculty.findUnique({
      where: { profileUrl: `NOT_FOUND:${query}` }
    });

    if (notFoundHit) {
      await redis.set(cacheKey, JSON.stringify([]), 'EX', 86400);
      return res.json({ results: [], cached: true });
    }
    
    if (dbHit && dbHit.length > 0) {
      // Filter out any other NOT_FOUND records that might have matched the contains clause
      const validHits = dbHit.filter((hit: any) => !hit.profileUrl.startsWith('NOT_FOUND:'));
      if (validHits.length > 0) {
        await redis.set(cacheKey, JSON.stringify(validHits), 'EX', 86400); // Cache for 24h
        return res.json({ results: validHits, cached: true });
      }
    }

    // 3. Cache Miss: Queue the job and let the frontend poll
    const job = await (prisma as any).scrapeJob.create({
      data: { query, type: 'SEARCH', status: 'PENDING' }
    });
    res.json({ jobId: job.id, status: 'PENDING' });
  } catch (error) {
    console.error('Error queuing search job:', error);
    res.status(500).json({ error: 'Failed to queue search.' });
  }
});

// Route to submit a bulk search job
router.post('/bulk-search', async (req: Request, res: Response) => {
  const { queries } = req.body;
  if (!queries || !Array.isArray(queries) || queries.length === 0) {
    return res.status(400).json({ error: 'Array of queries is required.' });
  }

  try {
    const results: Record<string, any> = {};
    const missingQueries: string[] = [];

    // Check SQLite DB first
    for (const q of queries) {
      const notFoundHit = await (prisma as any).faculty.findUnique({
        where: { profileUrl: `NOT_FOUND:${q}` }
      });
      if (notFoundHit) {
        results[q] = null;
        continue;
      }
      
      const dbHit = await (prisma as any).faculty.findFirst({
        where: { name: { contains: q } }
      });
      if (dbHit) {
        results[q] = dbHit;
      } else {
        missingQueries.push(q);
      }
    }

    if (missingQueries.length === 0) {
      return res.json({ results, cached: true });
    }

    // Queue job ONLY for missing queries
    const job = await (prisma as any).scrapeJob.create({
      data: { query: JSON.stringify(missingQueries), type: 'BULK', status: 'PENDING' }
    });
    
    res.json({ results, jobId: job.id, status: 'PENDING' });
  } catch (error) {
    console.error('Error queuing bulk search job:', error);
    res.status(500).json({ error: 'Failed to queue bulk search.' });
  }
});

// Route to check the status of a job
router.get('/job/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const job = await (prisma as any).scrapeJob.findUnique({ where: { id } });
    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    // If pending, calculate queue position
    let queuePosition = 0;
    if (job.status === 'PENDING') {
      queuePosition = await (prisma as any).scrapeJob.count({
        where: {
          status: 'PENDING',
          createdAt: { lt: job.createdAt }
        }
      });
    }

    res.json({
      jobId: job.id,
      status: job.status,
      queuePosition: queuePosition + 1,
      result: job.result ? JSON.parse(job.result) : null,
      error: job.status === 'FAILED' ? JSON.parse(job.result || '{}').error : null
    });
  } catch (error) {
    console.error('Error fetching job status:', error);
    res.status(500).json({ error: 'Failed to fetch job status.' });
  }
});

export default router;
