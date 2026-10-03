import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import academiaRoutes from './routes/academia.routes';
import attendanceRoutes from './routes/attendance.routes';
import gradeRoutes from './routes/grade.routes';
import feeRoutes from './routes/fee.routes';
import calendarRoutes from './routes/calendar.routes';
import staffRoutes from './routes/staff.routes';
import internalMarksRoutes from './routes/internalMarks.routes';
import syncNowRoutes from './sync_now/sync_now.routes';
import { startQueueWorker } from './jobs/queue';
import { helpersRouter } from './routes/helpers.routes';
import { startSessionKeepAlive } from './utils/keepAlive';
import { startDataCronJob } from './scraper/data.cron';
import { startEventLoopMonitor } from './utils/eventLoopMonitor';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Backend is running successfully.', timestamp: new Date().toISOString() });
});

app.use('/api/academia', academiaRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/internal-marks', internalMarksRoutes);
app.use('/api/helpers', helpersRouter);
app.use('/api/sync_now', syncNowRoutes);

// Start Server
const role = process.env.SERVER_ROLE || 'ALL';

if (role === 'API' || role === 'ALL') {
  const portToUse = typeof PORT === 'string' ? parseInt(PORT, 10) : PORT;
  app.listen(portToUse, '0.0.0.0', () => {
    console.log(`✅ [${role}] Server is running on http://0.0.0.0:${portToUse}`);
    console.log(`   Health check: http://localhost:${PORT}/api/health`);

    // Start event loop monitor
    startEventLoopMonitor();
  });
}

if (role === 'WORKER' || role === 'ALL') {
  // Start the background Scraper Queue Worker
  startQueueWorker();
  // Start the BullMQ worker for attendance/calendar/grades scraping
  require('./worker');
  const { startSyncWorker } = require('./jobs/syncWorker');
  startSyncWorker();

  // KeepAlive and DataCron run on WORKER only — NOT on API instances.
  // Previously both api1 and api2 ran these, causing every session to be
  // double-pinged and every cron cycle to fire twice concurrently.
  startSessionKeepAlive();
  startDataCronJob();

  console.log(`💪 [${role}] Scraper Worker Node started!`);
}

