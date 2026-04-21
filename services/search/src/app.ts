import express from 'express';
import searchRouter from './routes/search';

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/search', searchRouter);

export default app;
