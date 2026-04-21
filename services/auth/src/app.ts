import express from 'express';
import authRouter from './routes/auth';

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRouter);

export default app;
