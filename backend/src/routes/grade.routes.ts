import { Router } from 'express';
import { scrapeGrades } from '../scraper/grade.scraper';
import { captchaService } from '../scraper/captcha.service';
import Redis from 'ioredis';

const router = Router();
const redis = new Redis();

router.get('/status/:username', (req, res) => {
  const { username } = req.params;
  const base64 = captchaService.getPendingCaptcha(username);
  if (base64) {
    res.json({ pending: true, base64 });
  } else {
    res.json({ pending: false, base64: null });
  }
});

router.post('/solve', (req, res) => {
  const { username, text } = req.body;
  if (!username || !text) {
    return res.status(400).json({ success: false, error: 'Username and text are required' });
  }
  const success = captchaService.submitCaptcha(username, text);
  res.json({ success });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username) {
    return res.status(400).json({ success: false, error: 'Username is required' });
  }

  const cacheKey = `grades:${username}`;
  
  try {
    // 1. Check Redis Cache
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      // Return instantly
      res.json(JSON.parse(cachedData));
      
      // SWR: Scrape silently in background. 
      // If it requires a CAPTCHA, it will quietly time out in the background, which is fine!
      scrapeGrades(username, password, false).then(result => {
        if (result.success) {
           redis.set(cacheKey, JSON.stringify(result), 'EX', 604800); // 7 days
        }
      }).catch(err => console.error('Background Grade Scrape Error:', err));
      return;
    }

    // 2. Cache Miss: Run interactively so user can solve CAPTCHA
    const result = await scrapeGrades(username, password, true);
    if (result.success) {
      await redis.set(cacheKey, JSON.stringify(result), 'EX', 604800); // 7 days
    }
    res.json(result);
  } catch (err) {
    console.error('Grades route error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
