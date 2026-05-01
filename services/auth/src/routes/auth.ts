import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import pool from '../db';
import { signToken } from '../jwt';

const router = Router();

const BCRYPT_COST = 10;

// ── Schemas ──────────────────────────────────────────────────────────────────

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const ResetRequestSchema = z.object({
  email: z.string().email(),
});

const ResetConfirmSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMailTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'mailhog',
    port: Number(process.env.SMTP_PORT ?? 1025),
    auth:
      process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
}

// ── POST /api/auth/register ───────────────────────────────────────────────────

router.post('/register', async (req: Request, res: Response) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', fields: parsed.error.flatten().fieldErrors });
  }

  const { email, password, name } = parsed.data;

  // Check uniqueness
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rowCount && existing.rowCount > 0) {
    return res.status(409).json({ error: 'CONFLICT', detail: 'Email already registered' });
  }

  const password_hash = await bcrypt.hash(password, BCRYPT_COST);

  const result = await pool.query(
    `INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, role`,
    [email, name, password_hash],
  );

  const user = result.rows[0];
  const token = signToken({ sub: user.id, email: user.email, role: user.role });

  return res.status(201).json({ token, user: { id: user.id, email: user.email, name, role: user.role, smsEnabled: false, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } });
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────

router.post('/login', async (req: Request, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', fields: parsed.error.flatten().fieldErrors });
  }

  const { email, password } = parsed.data;

  const result = await pool.query(
    'SELECT id, email, role, password_hash, is_active FROM users WHERE email = $1',
    [email],
  );

  const user = result.rows[0];
  if (!user) {
    return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
  }

  if (!user.is_active) {
    return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
  }

  const token = signToken({ sub: user.id, email: user.email, role: user.role });

  const userResult = await pool.query(
    'SELECT id, email, name, role, phone, sms_enabled, is_active, created_at, updated_at FROM users WHERE id = $1',
    [user.id],
  );
  const fullUser = userResult.rows[0];

  return res.status(200).json({
    token,
    user: {
      id: fullUser.id,
      email: fullUser.email,
      name: fullUser.name,
      role: fullUser.role,
      phone: fullUser.phone,
      smsEnabled: fullUser.sms_enabled,
      isActive: fullUser.is_active,
      createdAt: fullUser.created_at,
      updatedAt: fullUser.updated_at,
    },
  });
});

// ── POST /api/auth/password-reset/request ────────────────────────────────────

router.post('/password-reset/request', async (req: Request, res: Response) => {
  const parsed = ResetRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', fields: parsed.error.flatten().fieldErrors });
  }

  const { email } = parsed.data;
  const result = await pool.query('SELECT id FROM users WHERE email = $1 AND is_active = true', [email]);
  const user = result.rows[0];

  // Always return 200 to avoid email enumeration
  if (!user) {
    return res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [user.id, tokenHash, expiresAt],
  );

  const transport = getMailTransport();
  await transport.sendMail({
    from: process.env.SMTP_FROM ?? 'noreply@lostandfound.local',
    to: email,
    subject: 'Password Reset',
    text: `Your password reset token: ${rawToken}\nExpires in 1 hour.`,
  });

  return res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });
});

// ── POST /api/auth/password-reset/confirm ────────────────────────────────────

router.post('/password-reset/confirm', async (req: Request, res: Response) => {
  const parsed = ResetConfirmSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', fields: parsed.error.flatten().fieldErrors });
  }

  const { token, newPassword } = parsed.data;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const result = await pool.query(
    `SELECT id, user_id FROM password_reset_tokens
     WHERE token_hash = $1 AND used = false AND expires_at > now()`,
    [tokenHash],
  );

  const record = result.rows[0];
  if (!record) {
    return res.status(400).json({ error: 'INVALID_OR_EXPIRED_TOKEN' });
  }

  const newHash = await bcrypt.hash(newPassword, BCRYPT_COST);

  await pool.query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [
    newHash,
    record.user_id,
  ]);
  await pool.query('UPDATE password_reset_tokens SET used = true WHERE id = $1', [record.id]);

  return res.status(200).json({ message: 'Password updated successfully.' });
});

// ── GET /api/auth/users/:id ───────────────────────────────────────────────────
// Internal endpoint used by Notification Service to fetch user contact info

router.get('/users/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await pool.query(
    'SELECT id, email, name, phone, sms_enabled FROM users WHERE id = $1',
    [id],
  );
  const user = result.rows[0];
  if (!user) {
    return res.status(404).json({ error: 'NOT_FOUND' });
  }
  return res.status(200).json({
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    sms_enabled: user.sms_enabled,
  });
});

export default router;

// ── POST /api/auth/make-admin (temporary bootstrap endpoint) ─────────────────
// Sets the first registered user as admin. Remove after setup.

router.post('/make-admin', async (req: Request, res: Response) => {
  const { email, secret } = req.body;
  if (secret !== process.env.ADMIN_BOOTSTRAP_SECRET) {
    return res.status(403).json({ error: 'FORBIDDEN' });
  }
  await pool.query(`UPDATE users SET role = 'admin' WHERE email = $1`, [email]);
  return res.status(200).json({ message: 'User promoted to admin' });
});
