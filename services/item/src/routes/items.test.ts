/**
 * Unit tests for item CRUD endpoints
 * Tests validation, ownership enforcement, and error response shapes.
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import pool from '../db';
import * as messageBroker from '../messageBroker';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../db', () => ({
  query: jest.fn(),
}));

jest.mock('../messageBroker', () => ({
  publishEvent: jest.fn().mockResolvedValue(undefined),
}));

const mockQuery = pool.query as jest.Mock;

const JWT_SECRET = 'test-secret';
process.env.JWT_SECRET = JWT_SECRET;

function makeToken(userId: string, role = 'user'): string {
  return jwt.sign({ sub: userId, email: 'test@example.com', role }, JWT_SECRET, { expiresIn: '1h' });
}

const OWNER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const OTHER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const ITEM_ID  = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

const ownerToken = makeToken(OWNER_ID);
const otherToken = makeToken(OTHER_ID);

const validBody = {
  title: 'Lost wallet',
  description: 'Brown leather wallet',
  category: 'Wallets',
  location: 'Central Park',
  date: '2024-06-01',
};

const mockItem = {
  id: ITEM_ID,
  type: 'lost',
  ...validBody,
  image_url: null,
  thumbnail_url: null,
  status: 'active',
  owner_id: OWNER_ID,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ── POST /api/items/lost ──────────────────────────────────────────────────────

describe('POST /api/items/lost', () => {
  it('creates a lost item and returns 201', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockItem], rowCount: 1 });

    const res = await request(app)
      .post('/api/items/lost')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.id).toBe(ITEM_ID);
    expect(messageBroker.publishEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'item.created', type: 'lost' }),
    );
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).post('/api/items/lost').send(validBody);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('UNAUTHORIZED');
  });

  it('returns 400 with missing required fields', async () => {
    const res = await request(app)
      .post('/api/items/lost')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'Only title' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
    expect(res.body.fields).toEqual(expect.arrayContaining(['description', 'category', 'location', 'date']));
  });

  it('returns 400 with invalid category', async () => {
    const res = await request(app)
      .post('/api/items/lost')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ ...validBody, category: 'InvalidCategory' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 with invalid date format', async () => {
    const res = await request(app)
      .post('/api/items/lost')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ ...validBody, date: '01/06/2024' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });
});

// ── POST /api/items/found ─────────────────────────────────────────────────────

describe('POST /api/items/found', () => {
  it('creates a found item and returns 201', async () => {
    const foundItem = { ...mockItem, type: 'found' };
    mockQuery.mockResolvedValueOnce({ rows: [foundItem], rowCount: 1 });

    const res = await request(app)
      .post('/api/items/found')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.type).toBe('found');
    expect(messageBroker.publishEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'item.created', type: 'found' }),
    );
  });
});

// ── GET /api/items/:id ────────────────────────────────────────────────────────

describe('GET /api/items/:id', () => {
  it('returns the item when found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockItem], rowCount: 1 });

    const res = await request(app).get(`/api/items/${ITEM_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(ITEM_ID);
  });

  it('returns 404 when item does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app).get(`/api/items/${ITEM_ID}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
  });
});

// ── PUT /api/items/:id ────────────────────────────────────────────────────────

describe('PUT /api/items/:id', () => {
  it('updates item when owner makes request', async () => {
    const updated = { ...mockItem, title: 'Updated title' };
    mockQuery
      .mockResolvedValueOnce({ rows: [mockItem], rowCount: 1 }) // fetch existing
      .mockResolvedValueOnce({ rows: [updated], rowCount: 1 }); // update

    const res = await request(app)
      .put(`/api/items/${ITEM_ID}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'Updated title' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated title');
    expect(messageBroker.publishEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'item.updated' }),
    );
  });

  it('returns 403 when non-owner tries to update', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockItem], rowCount: 1 });

    const res = await request(app)
      .put(`/api/items/${ITEM_ID}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ title: 'Hacked title' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).put(`/api/items/${ITEM_ID}`).send({ title: 'x' });
    expect(res.status).toBe(401);
  });

  it('returns 404 when item does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app)
      .put(`/api/items/${ITEM_ID}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'x' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
  });
});

// ── DELETE /api/items/:id ─────────────────────────────────────────────────────

describe('DELETE /api/items/:id', () => {
  it('soft-deletes item when owner makes request', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [mockItem], rowCount: 1 }) // fetch existing
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // update status

    const res = await request(app)
      .delete(`/api/items/${ITEM_ID}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(204);
    // Verify the UPDATE query used soft-delete
    const updateCall = mockQuery.mock.calls[1];
    expect(updateCall[0]).toContain("status = 'deleted'");
  });

  it('returns 403 when non-owner tries to delete', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockItem], rowCount: 1 });

    const res = await request(app)
      .delete(`/api/items/${ITEM_ID}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).delete(`/api/items/${ITEM_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when item does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app)
      .delete(`/api/items/${ITEM_ID}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
  });
});

// ── POST /api/items/:id/claim ─────────────────────────────────────────────────

const CLAIM_ID    = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const CLAIMANT_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const claimantToken = makeToken(CLAIMANT_ID);
const adminToken    = makeToken('ffffffff-ffff-ffff-ffff-ffffffffffff', 'admin');

const mockFoundItem = {
  ...mockItem,
  type: 'found',
  owner_id: OWNER_ID,
};

const mockClaim = {
  id: CLAIM_ID,
  item_id: ITEM_ID,
  claimant_id: CLAIMANT_ID,
  status: 'pending',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('POST /api/items/:id/claim', () => {
  it('creates a claim with status pending and returns 201', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [mockFoundItem], rowCount: 1 }) // fetch item
      .mockResolvedValueOnce({ rows: [mockClaim], rowCount: 1 });    // insert claim

    const res = await request(app)
      .post(`/api/items/${ITEM_ID}/claim`)
      .set('Authorization', `Bearer ${claimantToken}`);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pending');
    expect(res.body.item_id).toBe(ITEM_ID);
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).post(`/api/items/${ITEM_ID}/claim`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('UNAUTHORIZED');
  });

  it('returns 404 when item does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app)
      .post(`/api/items/${ITEM_ID}/claim`)
      .set('Authorization', `Bearer ${claimantToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
  });

  it('returns 400 when owner tries to claim their own item', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockFoundItem], rowCount: 1 });

    const res = await request(app)
      .post(`/api/items/${ITEM_ID}/claim`)
      .set('Authorization', `Bearer ${ownerToken}`); // owner == mockFoundItem.owner_id

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
    expect(res.body.fields).toContain('self-claim not allowed');
  });

  it('returns 409 on duplicate claim', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [mockFoundItem], rowCount: 1 }) // fetch item
      .mockRejectedValueOnce({ code: '23505' });                     // unique violation

    const res = await request(app)
      .post(`/api/items/${ITEM_ID}/claim`)
      .set('Authorization', `Bearer ${claimantToken}`);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('CONFLICT');
    expect(res.body.detail).toBe('Claim already exists');
  });
});

// ── PUT /api/items/claims/:claimId ────────────────────────────────────────────

describe('PUT /api/items/claims/:claimId', () => {
  it('admin can approve a pending claim and item becomes claimed', async () => {
    const approvedClaim = { ...mockClaim, status: 'approved' };
    mockQuery
      .mockResolvedValueOnce({ rows: [mockClaim], rowCount: 1 })        // fetch claim
      .mockResolvedValueOnce({ rows: [approvedClaim], rowCount: 1 })    // update claim
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });                 // update item

    const res = await request(app)
      .put(`/api/items/claims/${CLAIM_ID}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'approved' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('approved');

    // Verify item was marked as claimed
    const itemUpdateCall = mockQuery.mock.calls[2];
    expect(itemUpdateCall[0]).toContain("status = 'claimed'");
  });

  it('admin can reject a pending claim', async () => {
    const rejectedClaim = { ...mockClaim, status: 'rejected' };
    mockQuery
      .mockResolvedValueOnce({ rows: [mockClaim], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [rejectedClaim], rowCount: 1 });

    const res = await request(app)
      .put(`/api/items/claims/${CLAIM_ID}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'rejected' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('rejected');

    // Item status should NOT be updated on rejection
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  it('returns 403 for non-admin users', async () => {
    const res = await request(app)
      .put(`/api/items/claims/${CLAIM_ID}`)
      .set('Authorization', `Bearer ${claimantToken}`)
      .send({ status: 'approved' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app)
      .put(`/api/items/claims/${CLAIM_ID}`)
      .send({ status: 'approved' });

    expect(res.status).toBe(401);
  });

  it('returns 404 when claim does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app)
      .put(`/api/items/claims/${CLAIM_ID}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'approved' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
  });

  it('returns 400 when claim is not pending', async () => {
    const approvedClaim = { ...mockClaim, status: 'approved' };
    mockQuery.mockResolvedValueOnce({ rows: [approvedClaim], rowCount: 1 });

    const res = await request(app)
      .put(`/api/items/claims/${CLAIM_ID}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'rejected' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
    expect(res.body.fields).toContain('invalid status transition');
  });

  it('returns 400 for invalid status value', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockClaim], rowCount: 1 });

    const res = await request(app)
      .put(`/api/items/claims/${CLAIM_ID}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'pending' }); // not a valid transition target

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });
});
