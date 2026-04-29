import express from 'express';
import { adminRoutes } from './routes/admin';

export const app = express();

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'admin' });
});
app.get('/api/admin/health', (req, res) => {
  res.json({ status: 'ok', service: 'admin' });
});

// Admin routes
app.use('/api/admin', adminRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'NOT_FOUND' });
});