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

export const helpersRouter = router;
