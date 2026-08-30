import { Router } from 'express';
import { scrapeFees } from '../scraper/fee.scraper';
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

  const cacheKey = `fees:${username}`;
  
  try {
    // 1. Check Redis Cache
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      // Return instantly
      res.json(JSON.parse(cachedData));
      
      // SWR: Scrape silently in background
      scrapeFees(username, password, false).then(result => {
        if (result.success) {
           redis.set(cacheKey, JSON.stringify(result), 'EX', 604800); // 7 days
        }
      }).catch(err => console.error('Background Fee Scrape Error:', err));
      return;
    }

    // 2. Cache Miss: Run interactively
    const result = await scrapeFees(username, password, true);
    if (result.success) {
      await redis.set(cacheKey, JSON.stringify(result), 'EX', 604800); // 7 days
    }
    res.json(result);
  } catch (err) {
    console.error('Fees route error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
