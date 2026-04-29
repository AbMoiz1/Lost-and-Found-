import express from 'express';
import itemsRouter from './routes/items';
import claimsRouter from './routes/claims';

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});
app.get('/api/items/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Claims router must be mounted before items router so that
// /api/items/claims/:claimId is matched before /api/items/:id
app.use('/api/items', claimsRouter);
app.use('/api/items', itemsRouter);

export default app;
