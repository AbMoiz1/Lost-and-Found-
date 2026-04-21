// Feature: lost-and-found-app, Property 3, Property 4, Property 5
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

const VALID_CATEGORIES = [
  'Electronics', 'Clothing', 'Accessories', 'Documents',
  'Keys', 'Pets', 'Bags', 'Wallets', 'Jewelry', 'Other',
] as const;

// ── Arbitraries ───────────────────────────────────────────────────────────────

const categoryArb = fc.constantFrom(...VALID_CATEGORIES);

const dateArb = fc.date({
  min: new Date('2020-01-01'),
  max: new Date('2030-12-31'),
}).map(d => d.toISOString().slice(0, 10));

const validItemArb = fc.record({
  title:       fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  description: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
  category:    categoryArb,
  location:    fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  date:        dateArb,
});

const itemTypeArb = fc.constantFrom('lost', 'found') as fc.Arbitrary<'lost' | 'found'>;

const uuidArb = fc.uuid();

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeItem(id: string, ownerId: string, type: 'lost' | 'found', fields: {
  title: string; description: string; category: string; location: string; date: string;
}) {
  return {
    id,
    type,
    ...fields,
    image_url: null,
    thumbnail_url: null,
    status: 'active',
    owner_id: ownerId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// ── Property 3: Item creation persists all fields ─────────────────────────────
/**
 * For any valid item payload (all required fields present), creating the item
 * and then fetching it by ID must return a record where every submitted field
 * equals the original value.
 * Validates: Requirements 2.1, 2.2
 */
describe('Property 3: Item creation persists all fields', () => {
  it('create then fetch returns identical fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        validItemArb,
        itemTypeArb,
        uuidArb,
        uuidArb,
        async (fields, type, itemId, ownerId) => {
          jest.clearAllMocks();

          const storedItem = makeItem(itemId, ownerId, type, fields);
          const token = makeToken(ownerId);

          // Mock INSERT returning the stored item
          mockQuery.mockResolvedValueOnce({ rows: [storedItem], rowCount: 1 });

          const createRes = await request(app)
            .post(`/api/items/${type}`)
            .set('Authorization', `Bearer ${token}`)
            .send(fields);

          expect(createRes.status).toBe(201);

          // Mock SELECT returning the same stored item
          mockQuery.mockResolvedValueOnce({ rows: [storedItem], rowCount: 1 });

          const fetchRes = await request(app).get(`/api/items/${itemId}`);

          expect(fetchRes.status).toBe(200);

          // Every submitted field must equal the fetched value
          expect(fetchRes.body.title).toBe(fields.title);
          expect(fetchRes.body.description).toBe(fields.description);
          expect(fetchRes.body.category).toBe(fields.category);
          expect(fetchRes.body.location).toBe(fields.location);
          // date may come back as ISO string from DB; compare the YYYY-MM-DD prefix
          const fetchedDate: string = fetchRes.body.date;
          expect(fetchedDate.slice(0, 10)).toBe(fields.date);
          expect(fetchRes.body.owner_id).toBe(ownerId);
          expect(fetchRes.body.type).toBe(type);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── Property 4: Missing required fields are rejected ─────────────────────────
/**
 * For any item payload with at least one required field removed, the Item
 * Service must return a 400 error and the item must not be persisted.
 * Validates: Requirements 2.3
 */
describe('Property 4: Missing required fields are rejected', () => {
  const REQUIRED_FIELDS = ['title', 'description', 'category', 'location', 'date'] as const;

  it('any payload missing a required field returns 400 and nothing is inserted', async () => {
    await fc.assert(
      fc.asyncProperty(
        validItemArb,
        itemTypeArb,
        uuidArb,
        // Pick a non-empty subset of required fields to remove
        fc.subarray(REQUIRED_FIELDS as unknown as string[], { minLength: 1 }),
        async (fields, type, ownerId, fieldsToRemove) => {
          jest.clearAllMocks();

          const token = makeToken(ownerId);
          const incompleteBody: Record<string, unknown> = { ...fields };
          for (const f of fieldsToRemove) {
            delete incompleteBody[f];
          }

          const res = await request(app)
            .post(`/api/items/${type}`)
            .set('Authorization', `Bearer ${token}`)
            .send(incompleteBody);

          expect(res.status).toBe(400);
          expect(res.body.error).toBe('VALIDATION_ERROR');

          // DB INSERT must NOT have been called
          const insertCalled = mockQuery.mock.calls.some(
            (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('INSERT'),
          );
          expect(insertCalled).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── Property 5: Ownership enforcement ────────────────────────────────────────
/**
 * For any item and any user who is not the item's owner, an update or delete
 * request from that user must return 403 and leave the item unchanged.
 * Validates: Requirements 2.5
 */
describe('Property 5: Ownership enforcement', () => {
  it('non-owner PUT returns 403 and item is unchanged', async () => {
    await fc.assert(
      fc.asyncProperty(
        validItemArb,
        uuidArb,
        uuidArb,
        uuidArb,
        async (fields, itemId, ownerId, nonOwnerId) => {
          // Ensure the two IDs are distinct
          fc.pre(ownerId !== nonOwnerId);

          jest.clearAllMocks();

          const storedItem = makeItem(itemId, ownerId, 'lost', fields);
          const nonOwnerToken = makeToken(nonOwnerId);

          // Mock SELECT returning the item owned by ownerId
          mockQuery.mockResolvedValueOnce({ rows: [storedItem], rowCount: 1 });

          const res = await request(app)
            .put(`/api/items/${itemId}`)
            .set('Authorization', `Bearer ${nonOwnerToken}`)
            .send({ title: 'Attempted hijack' });

          expect(res.status).toBe(403);
          expect(res.body.error).toBe('FORBIDDEN');

          // No UPDATE query should have been executed
          const updateCalled = mockQuery.mock.calls.some(
            (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('UPDATE'),
          );
          expect(updateCalled).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('non-owner DELETE returns 403 and item is unchanged', async () => {
    await fc.assert(
      fc.asyncProperty(
        validItemArb,
        uuidArb,
        uuidArb,
        uuidArb,
        async (fields, itemId, ownerId, nonOwnerId) => {
          fc.pre(ownerId !== nonOwnerId);

          jest.clearAllMocks();

          const storedItem = makeItem(itemId, ownerId, 'found', fields);
          const nonOwnerToken = makeToken(nonOwnerId);

          // Mock SELECT returning the item owned by ownerId
          mockQuery.mockResolvedValueOnce({ rows: [storedItem], rowCount: 1 });

          const res = await request(app)
            .delete(`/api/items/${itemId}`)
            .set('Authorization', `Bearer ${nonOwnerToken}`);

          expect(res.status).toBe(403);
          expect(res.body.error).toBe('FORBIDDEN');

          // No UPDATE (soft-delete) query should have been executed
          const updateCalled = mockQuery.mock.calls.some(
            (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('UPDATE'),
          );
          expect(updateCalled).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});
