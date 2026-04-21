import request from 'supertest';
import bcrypt from 'bcrypt';
import app from './app';
import pool from './db';
import { signToken } from './jwt';

// Set env vars before tests
beforeAll(() => {
  process.env.JWT_SECRET = 'unit-test-secret';
  process.env.JWT_EXPIRY = '1h';
});

// Mock the DB pool so tests don't need a real Postgres instance
jest.mock('./db', () => ({
  query: jest.fn(),
}));

const mockQuery = pool.query as jest.Mock;

afterEach(() => {
  jest.clearAllMocks();
});

// ── Registration ──────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  it('returns 409 when email already exists', async () => {
    // First query: email uniqueness check returns a row
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'existing-id' }] });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'password123', name: 'Test User' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('CONFLICT');
  });

  it('returns 201 and a JWT on successful registration', async () => {
    // email uniqueness check: no existing user
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    // INSERT returning user
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'new-uuid', email: 'new@example.com', role: 'user' }],
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'new@example.com', password: 'password123', name: 'New User' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
  });
});

// ── Login ─────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  it('returns 401 when user does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('INVALID_CREDENTIALS');
  });

  it('returns 401 when password is wrong', async () => {
    const hash = await bcrypt.hash('correct-password', 10);
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'uid', email: 'user@example.com', role: 'user', password_hash: hash, is_active: true }],
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('INVALID_CREDENTIALS');
  });

  it('returns 200 and JWT on valid credentials', async () => {
    const hash = await bcrypt.hash('correct-password', 10);
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'uid', email: 'user@example.com', role: 'user', password_hash: hash, is_active: true }],
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'correct-password' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });
});

// ── JWT middleware ────────────────────────────────────────────────────────────

describe('authenticate middleware (via expired/invalid JWT)', () => {
  it('returns 401 when Authorization header is missing', async () => {
    // Add a protected test route to the app for this test
    const express = require('express');
    const { authenticate } = require('./middleware/authenticate');
    const testApp = express();
    testApp.use(express.json());
    testApp.get('/protected', authenticate, (_req: any, res: any) => res.json({ ok: true }));

    const res = await request(testApp).get('/protected');
    expect(res.status).toBe(401);
  });

  it('returns 401 when JWT is expired', async () => {
    // Sign a token that expires immediately (1ms)
    const expiredToken = signToken({ sub: 'uid', email: 'u@e.com', role: 'user' });
    // Override expiry to past
    process.env.JWT_EXPIRY = '-1s';
    const expired = signToken({ sub: 'uid', email: 'u@e.com', role: 'user' });
    process.env.JWT_EXPIRY = '1h';

    const express = require('express');
    const { authenticate } = require('./middleware/authenticate');
    const testApp = express();
    testApp.use(express.json());
    testApp.get('/protected', authenticate, (_req: any, res: any) => res.json({ ok: true }));

    const res = await request(testApp)
      .get('/protected')
      .set('Authorization', `Bearer ${expired}`);

    expect(res.status).toBe(401);
    void expiredToken; // suppress unused warning
  });
});
