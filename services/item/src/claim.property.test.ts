// Feature: lost-and-found-app, Property 12, Property 13, Property 14
import * as fc from 'fast-check';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from './app';
import pool from './db';
import * as messageBroker from './messageBroker';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('./db', () => ({
  query: jest.fn(),
}));

jest.mock('./messageBroker', () => ({
  publishEvent: jest.fn().mockResolvedValue(undefined),
}));

const mockQuery = pool.query as jest.Mock;

const JWT_SECRET = 'test-secret-property';
process.env.JWT_SECRET = JWT_SECRET;

function makeToken(userId: string, role = 'user'): string {
  return jwt.sign({ sub: userId, email: `${userId}@test.com`, role }, JWT_SECRET, { expiresIn: '1h' });
}

// ── Arbitraries ───────────────────────────────────────────────────────────────

const uuidArb = fc.uuid();

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeFoundItem(itemId: string, ownerId: string) {
  return {
    id: itemId,
    type: 'found',
    title: 'Test Item',
    description: 'A test item',
    category: 'Other',
    location: 'Test Location',
    date: '2024-01-01',
    image_url: null,
    thumbnail_url: null,
    status: 'active',
    owner_id: ownerId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function makeClaim(claimId: string, itemId: string, claimantId: string, status = 'pending') {
  return {
    id: claimId,
    item_id: itemId,
    claimant_id: claimantId,
    status,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// ── Property 12: Claim uniqueness ─────────────────────────────────────────────
/**
 * For any user and found item, submitting two claim requests must result in
 * the second request returning 409 and only one Claim record existing in the DB.
 * Validates: Requirements 7.5
 */
describe('Property 12: Claim uniqueness', () => {
  it('second claim on same item returns 409, only one record exists', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        uuidArb,
        uuidArb,
        async (itemId, ownerId, claimantId, claimId) => {
          fc.pre(ownerId !== claimantId);

          mockQuery.mockReset();

          const item = makeFoundItem(itemId, ownerId);
          const claim = makeClaim(claimId, itemId, claimantId);
          const claimantToken = makeToken(claimantId);

          // First claim: item exists, INSERT succeeds
          mockQuery
            .mockResolvedValueOnce({ rows: [item], rowCount: 1 })   // SELECT item
            .mockResolvedValueOnce({ rows: [claim], rowCount: 1 });  // INSERT claim

          const firstRes = await request(app)
            .post(`/api/items/${itemId}/claim`)
            .set('Authorization', `Bearer ${claimantToken}`);

          expect(firstRes.status).toBe(201);

          // Second claim: item exists, INSERT throws unique constraint violation
          const duplicateError = Object.assign(new Error('duplicate key'), { code: '23505' });
          mockQuery
            .mockResolvedValueOnce({ rows: [item], rowCount: 1 })  // SELECT item
            .mockRejectedValueOnce(duplicateError);                 // INSERT throws 23505

          const secondRes = await request(app)
            .post(`/api/items/${itemId}/claim`)
            .set('Authorization', `Bearer ${claimantToken}`);

          expect(secondRes.status).toBe(409);
          expect(secondRes.body.error).toBe('CONFLICT');

          // Verify only one INSERT was attempted across both requests
          const insertCalls = mockQuery.mock.calls.filter(
            (call: unknown[]) =>
              typeof call[0] === 'string' && call[0].includes('INSERT INTO claims'),
          );
          expect(insertCalls).toHaveLength(2); // one attempt per request, second throws
        },
      ),
      { numRuns: 100 },
    );
  }, 30000);
});

// ── Property 13: Self-claim prevention ───────────────────────────────────────
/**
 * For any found item, a claim request from the item's own owner must return
 * 400 and no Claim record must be created.
 * Validates: Requirements 7.4
 */
describe('Property 13: Self-claim prevention', () => {
  it('owner claim returns 400, no record created', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        async (itemId, ownerId) => {
          mockQuery.mockReset();

          const item = makeFoundItem(itemId, ownerId);
          const ownerToken = makeToken(ownerId);

          // SELECT returns item owned by the same user making the claim
          mockQuery.mockResolvedValueOnce({ rows: [item], rowCount: 1 });

          const res = await request(app)
            .post(`/api/items/${itemId}/claim`)
            .set('Authorization', `Bearer ${ownerToken}`);

          expect(res.status).toBe(400);
          expect(res.body.error).toBe('VALIDATION_ERROR');

          // No INSERT into claims should have been attempted
          const insertCalled = mockQuery.mock.calls.some(
            (call: unknown[]) =>
              typeof call[0] === 'string' && call[0].includes('INSERT INTO claims'),
          );
          expect(insertCalled).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  }, 30000);
});

// ── Property 14: Claim status transitions ────────────────────────────────────
/**
 * For any claim, the status must only ever transition from "pending" →
 * "approved" or "pending" → "rejected"; no other transitions are permitted.
 * Validates: Requirements 7.2, 7.3
 */
describe('Property 14: Claim status transitions', () => {
  const VALID_TRANSITIONS: Array<{ from: string; to: 'approved' | 'rejected' }> = [
    { from: 'pending', to: 'approved' },
    { from: 'pending', to: 'rejected' },
  ];

  const NON_PENDING_STATUSES = ['approved', 'rejected'];

  it('pending→approved and pending→rejected are accepted', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        fc.constantFrom(...VALID_TRANSITIONS),
        async (claimId, itemId, transition) => {
          mockQuery.mockReset();

          const adminToken = makeToken('admin-user-id', 'admin');
          const claim = makeClaim(claimId, itemId, 'some-claimant', transition.from);
          const updatedClaim = { ...claim, status: transition.to };

          // SELECT claim, UPDATE claim, (optionally UPDATE item if approved)
          mockQuery
            .mockResolvedValueOnce({ rows: [claim], rowCount: 1 })        // SELECT claim
            .mockResolvedValueOnce({ rows: [updatedClaim], rowCount: 1 }) // UPDATE claim
            .mockResolvedValueOnce({ rows: [], rowCount: 1 });             // UPDATE item (if approved)

          const res = await request(app)
            .put(`/api/items/claims/${claimId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: transition.to });

          expect(res.status).toBe(200);
          expect(res.body.status).toBe(transition.to);
        },
      ),
      { numRuns: 100 },
    );
  }, 30000);

  it('transitions from non-pending status are rejected with 400', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        fc.constantFrom(...NON_PENDING_STATUSES),
        fc.constantFrom('approved', 'rejected'),
        async (claimId, itemId, currentStatus, targetStatus) => {
          mockQuery.mockReset();

          const adminToken = makeToken('admin-user-id', 'admin');
          const claim = makeClaim(claimId, itemId, 'some-claimant', currentStatus);

          // SELECT returns claim with non-pending status
          mockQuery.mockResolvedValueOnce({ rows: [claim], rowCount: 1 });

          const res = await request(app)
            .put(`/api/items/claims/${claimId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: targetStatus });

          expect(res.status).toBe(400);
          expect(res.body.error).toBe('VALIDATION_ERROR');

          // No UPDATE to claims should have been executed
          const updateCalled = mockQuery.mock.calls.some(
            (call: unknown[]) =>
              typeof call[0] === 'string' &&
              call[0].includes('UPDATE claims'),
          );
          expect(updateCalled).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  }, 30000);

  it('invalid target status values are rejected with 400', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        // Generate strings that are NOT valid statuses
        fc.string({ minLength: 1, maxLength: 20 }).filter(
          s => s !== 'approved' && s !== 'rejected' && s !== 'pending',
        ),
        async (claimId, itemId, invalidStatus) => {
          mockQuery.mockReset();

          const adminToken = makeToken('admin-user-id', 'admin');
          const claim = makeClaim(claimId, itemId, 'some-claimant', 'pending');

          // SELECT returns a pending claim
          mockQuery.mockResolvedValueOnce({ rows: [claim], rowCount: 1 });

          const res = await request(app)
            .put(`/api/items/claims/${claimId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: invalidStatus });

          expect(res.status).toBe(400);
          expect(res.body.error).toBe('VALIDATION_ERROR');

          // No UPDATE should have been executed
          const updateCalled = mockQuery.mock.calls.some(
            (call: unknown[]) =>
              typeof call[0] === 'string' &&
              call[0].includes('UPDATE claims'),
          );
          expect(updateCalled).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  }, 30000);
});
