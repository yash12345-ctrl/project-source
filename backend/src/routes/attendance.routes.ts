import { Router } from 'express';
import { scrapeAttendance } from '../scraper/attendance.scraper';
import { captchaService } from '../scraper/captcha.service';

const router = Router();

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

  // Pass isInteractive = true since this is a manual UI request
  const result = await scrapeAttendance(username, password, true);
  res.json(result);
});

export default router;
