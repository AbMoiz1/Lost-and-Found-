import { Router, Request, Response } from 'express';
import { z } from 'zod';
import pool from '../db';
import { authenticate } from '../middleware/authenticate';
import { publishEvent } from '../messageBroker';

const router = Router();

const VALID_CATEGORIES = [
  'Electronics', 'Clothing', 'Accessories', 'Documents',
  'Keys', 'Pets', 'Bags', 'Wallets', 'Jewelry', 'Other',
] as const;

const ItemBodySchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(VALID_CATEGORIES),
  location: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  image_url: z.string().url().optional(),
  thumbnail_url: z.string().url().optional(),
});

const UpdateBodySchema = ItemBodySchema.partial();

// ── POST /api/items/lost ──────────────────────────────────────────────────────

router.post('/lost', authenticate, async (req: Request, res: Response) => {
  return createItem(req, res, 'lost');
});

// ── POST /api/items/found ─────────────────────────────────────────────────────

router.post('/found', authenticate, async (req: Request, res: Response) => {
  return createItem(req, res, 'found');
});

async function createItem(req: Request, res: Response, type: 'lost' | 'found') {
  const parsed = ItemBodySchema.safeParse(req.body);
  if (!parsed.success) {
    const fields = Object.keys(parsed.error.flatten().fieldErrors);
    return res.status(400).json({ error: 'VALIDATION_ERROR', fields });
  }

  const { title, description, category, location, date, image_url, thumbnail_url } = parsed.data;
  const ownerId = req.user!.sub;

  const result = await pool.query(
    `INSERT INTO items (type, title, description, category, location, date, image_url, thumbnail_url, owner_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [type, title, description, category, location, date, image_url ?? null, thumbnail_url ?? null, ownerId],
  );

  const item = result.rows[0];

  await publishEvent({
    eventType: 'item.created',
    itemId: item.id,
    type: item.type,
    title: item.title,
    description: item.description,
    category: item.category,
    location: item.location,
    date: item.date instanceof Date ? item.date.toISOString().slice(0, 10) : item.date,
    ownerId: item.owner_id,
    timestamp: new Date().toISOString(),
  });

  return res.status(201).json(item);
}

// ── GET /api/items/my ─────────────────────────────────────────────────────────

router.get('/my', authenticate, async (req: Request, res: Response) => {
  const ownerId = req.user!.sub;
  const result = await pool.query(
    `SELECT * FROM items WHERE owner_id = $1 AND status != 'deleted' ORDER BY created_at DESC`,
    [ownerId],
  );
  return res.status(200).json(result.rows);
});

// ── GET /api/items/:id ────────────────────────────────────────────────────────

router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await pool.query(
    `SELECT * FROM items WHERE id = $1 AND status != 'deleted'`,
    [id],
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'NOT_FOUND' });
  }

  return res.status(200).json(result.rows[0]);
});

// ── PUT /api/items/:id ────────────────────────────────────────────────────────

router.put('/:id', authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  const ownerId = req.user!.sub;

  const existing = await pool.query(
    `SELECT * FROM items WHERE id = $1 AND status != 'deleted'`,
    [id],
  );

  if (existing.rowCount === 0) {
    return res.status(404).json({ error: 'NOT_FOUND' });
  }

  const item = existing.rows[0];
  if (item.owner_id !== ownerId) {
    return res.status(403).json({ error: 'FORBIDDEN' });
  }

  const parsed = UpdateBodySchema.safeParse(req.body);
  if (!parsed.success) {
    const fields = Object.keys(parsed.error.flatten().fieldErrors);
    return res.status(400).json({ error: 'VALIDATION_ERROR', fields });
  }

  const updates = parsed.data;
  const fields = Object.keys(updates) as (keyof typeof updates)[];

  if (fields.length === 0) {
    return res.status(200).json(item);
  }

  // Build dynamic SET clause
  const setClauses = fields.map((f, i) => `"${toSnakeCase(f)}" = $${i + 2}`);
  setClauses.push(`updated_at = now()`);
  const values = fields.map(f => (updates as Record<string, unknown>)[f]);

  const updateResult = await pool.query(
    `UPDATE items SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
    [id, ...values],
  );

  const updated = updateResult.rows[0];

  await publishEvent({
    eventType: 'item.updated',
    itemId: updated.id,
    type: updated.type,
    title: updated.title,
    description: updated.description,
    category: updated.category,
    location: updated.location,
    date: updated.date instanceof Date ? updated.date.toISOString().slice(0, 10) : updated.date,
    ownerId: updated.owner_id,
    timestamp: new Date().toISOString(),
  });

  return res.status(200).json(updated);
});

// ── DELETE /api/items/:id ─────────────────────────────────────────────────────

router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  const ownerId = req.user!.sub;

  const existing = await pool.query(
    `SELECT * FROM items WHERE id = $1 AND status != 'deleted'`,
    [id],
  );

  if (existing.rowCount === 0) {
    return res.status(404).json({ error: 'NOT_FOUND' });
  }

  const item = existing.rows[0];
  if (item.owner_id !== ownerId) {
    return res.status(403).json({ error: 'FORBIDDEN' });
  }

  await pool.query(
    `UPDATE items SET status = 'deleted', updated_at = now() WHERE id = $1`,
    [id],
  );

  return res.status(204).send();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

export default router;
