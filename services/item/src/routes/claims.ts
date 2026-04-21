import { Router, Request, Response } from 'express';
import { z } from 'zod';
import pool from '../db';
import { authenticate } from '../middleware/authenticate';

const router = Router();

// ── POST /api/items/:id/claim ─────────────────────────────────────────────────

router.post('/:id/claim', authenticate, async (req: Request, res: Response) => {
  const { id: itemId } = req.params;
  const claimantId = req.user!.sub;

  // Fetch item — 404 if not found or deleted
  const itemResult = await pool.query(
    `SELECT * FROM items WHERE id = $1 AND status != 'deleted'`,
    [itemId],
  );

  if (itemResult.rowCount === 0) {
    return res.status(404).json({ error: 'NOT_FOUND' });
  }

  const item = itemResult.rows[0];

  // Reject self-claims
  if (item.owner_id === claimantId) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      fields: ['self-claim not allowed'],
    });
  }

  // Insert claim; catch UNIQUE constraint violation for duplicate claims
  try {
    const claimResult = await pool.query(
      `INSERT INTO claims (item_id, claimant_id)
       VALUES ($1, $2)
       RETURNING *`,
      [itemId, claimantId],
    );

    return res.status(201).json(claimResult.rows[0]);
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === '23505') {
      return res.status(409).json({ error: 'CONFLICT', detail: 'Claim already exists' });
    }
    throw err;
  }
});

// ── PUT /api/items/claims/:claimId ────────────────────────────────────────────

const UpdateClaimSchema = z.object({
  status: z.enum(['approved', 'rejected']),
});

router.put('/claims/:claimId', authenticate, async (req: Request, res: Response) => {
  // Admin only
  if (req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'FORBIDDEN' });
  }

  const { claimId } = req.params;

  // Fetch claim
  const claimResult = await pool.query(
    `SELECT * FROM claims WHERE id = $1`,
    [claimId],
  );

  if (claimResult.rowCount === 0) {
    return res.status(404).json({ error: 'NOT_FOUND' });
  }

  const claim = claimResult.rows[0];

  // Validate body
  const parsed = UpdateClaimSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      fields: Object.keys(parsed.error.flatten().fieldErrors),
    });
  }

  // Only allow transitions from "pending"
  if (claim.status !== 'pending') {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      fields: ['invalid status transition'],
    });
  }

  const { status } = parsed.data;

  // Update claim status
  const updatedClaim = await pool.query(
    `UPDATE claims SET status = $1, updated_at = now() WHERE id = $2 RETURNING *`,
    [status, claimId],
  );

  // If approved, mark item as "claimed"
  if (status === 'approved') {
    await pool.query(
      `UPDATE items SET status = 'claimed', updated_at = now() WHERE id = $1`,
      [claim.item_id],
    );
  }

  return res.status(200).json(updatedClaim.rows[0]);
});

export default router;
