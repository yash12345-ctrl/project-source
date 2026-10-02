import { scraperQueue } from '../queue/scraperQueue';
import { Job } from 'bullmq';
import { Router } from 'express';
import { scrapeHelpersSem1, getSyncStatus } from '../scraper/helpers.scraper';
import { prisma } from '../db/db';

const router = Router();

router.get('/semesters/1', async (req, res) => {
  try {
    const data = await prisma.subject.findMany({
      where: { semester: 1 },
      include: {
        documents: {
          select: { title: true, url: true }
        }
      }
    });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sync', async (req, res) => {
  try {
    if (getSyncStatus()) {
      res.status(409).json({ message: 'Sync is already in progress. Please wait.' });
      return;
    }
    
    // Return immediately to not block the request
    res.json({ message: 'Scraping started in background. This may take a few minutes.' });
    
    // Start scraping in background
    scrapeHelpersSem1().catch(err => {
      console.error('[Helpers Sync] Background scrape failed:', err);
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/sync/status', (req, res) => {
  res.json({ syncing: getSyncStatus() });
});

router.get('/job/status/:jobId', async (req, res) => {
  try {
    const job = await Job.fromId(scraperQueue, req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    const state = await job.getState();
    const result = job.returnvalue;
    const failedReason = job.failedReason;
    
    res.json({
      id: job.id,
      status: state,
      result: result || null,
      error: failedReason || null
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export const helpersRouter = router;
