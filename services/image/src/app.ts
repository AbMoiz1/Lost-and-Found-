import express from 'express';
import imagesRouter from './routes/images';

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/images', imagesRouter);

export default app;
