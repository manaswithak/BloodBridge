import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import requestRoutes from './routes/requests.js';
import notificationRoutes from './routes/notifications.js';

const app = express();
app.use(cors({ origin: (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map(x => x.trim()), credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'BloodBridge API' }));
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/notifications', notificationRoutes);
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Unexpected server error' });
});
export default app;
