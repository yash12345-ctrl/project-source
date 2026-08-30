import { Router } from 'express';
import { scrapeCalendar } from '../scraper/calendar.scraper';
import { captchaService } from '../scraper/captcha.service';
import Redis from 'ioredis';

const router = Router();
const redis = new Redis();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username) {
    return res.status(400).json({ success: false, error: 'Username is required' });
  }

  const cacheKey = `calendar:${username}`;

  try {
    // 1. Check Redis Cache
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      // Return instantly
      res.json(JSON.parse(cachedData));
      
      // SWR: Scrape silently in background
      scrapeCalendar(username, password, false).then(result => {
        if (result.success) {
           redis.set(cacheKey, JSON.stringify(result), 'EX', 604800); // 7 days
        }
      }).catch(err => console.error('Background Calendar Scrape Error:', err));
      return;
    }

    // 2. Cache Miss: Run interactively
    const result = await scrapeCalendar(username, password, true);
    if (result.success) {
      await redis.set(cacheKey, JSON.stringify(result), 'EX', 604800); // 7 days
    }
    res.json(result);
  } catch (error) {
    console.error('Calendar login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/captcha/solve', async (req, res) => {
  try {
    const { username, captchaText } = req.body;
    await captchaService.submitCaptcha(username, captchaText);
    res.json({ success: true });
  } catch (error) {
    console.error('Captcha solve error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit captcha' });
  }
});

router.get('/status/:username', (req, res) => {
  const { username } = req.params;
  const base64 = captchaService.getPendingCaptcha(username);
  res.json({ pending: !!base64, base64 });
});

export default router;
