import { Router } from 'express';
import { getStoredData } from '../utils/keepAlive'; // if it exists
const router = Router();
router.get('/test', (req, res) => {
  res.json({ msg: "working" });
});
export default router;
