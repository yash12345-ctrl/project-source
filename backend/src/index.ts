import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import academiaRoutes from './routes/academia.routes';
import attendanceRoutes from './routes/attendance.routes';
import gradeRoutes from './routes/grade.routes';
import feeRoutes from './routes/fee.routes';
import calendarRoutes from './routes/calendar.routes';
import staffRoutes from './routes/staff.routes';
import { startQueueWorker } from './jobs/queue';
import { helpersRouter } from './routes/helpers.routes';
import { startSessionKeepAlive } from './utils/keepAlive';

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
app.use('/api/helpers', helpersRouter);

// Start Server
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
  console.log(`   Academia API: http://localhost:${PORT}/api/academia`);

  // Start the background Keep-Alive service for the Student Portal
  startSessionKeepAlive();
  
  // Start the background Scraper Queue Worker
  startQueueWorker();
});
