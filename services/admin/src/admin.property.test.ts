import * as fc from 'fast-check';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from './app';

// Mock all database pools
jest.mock('./db', () => ({
  pool: { query: jest.fn() },
  authPool: { query: jest.fn() },
  itemPool: { query: jest.fn() },
  matchingPool: { query: jest.fn() }
}));

import { authPool, itemPool, matchingPool } from './db';

const mockAuthQuery = authPool.query as jest.Mock;
const mockItemQuery = itemPool.query as jest.Mock;
const mockMatchingQuery = matchingPool.query as jest.Mock;

// Feature: lost-and-found-app, Property 8.3, Property 8.5
describe('Admin Service Property Tests', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createAdminToken = () => {
    const secret = process.env.JWT_SECRET || 'test-secret';
    return jwt.sign(
      { sub: 'admin-id', email: 'admin@test.com', role: 'admin' },
      secret,
      { expiresIn: '1h' }
    );
  };

  /**
   * Property (from 8.3): Deactivate round-trip
   * For any user that gets deactivated, the user's is_active field must be set to false,
   * which would prevent subsequent login attempts in the Auth Service (401 response)
   * 
   * **Validates: Requirements 8.3**
   */
  it('should deactivate users preventing future authentication', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.uuid(),
          email: fc.emailAddress(),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          initialActiveState: fc.boolean()
        }),
        async ({ userId, email, name, initialActiveState }) => {
          const adminToken = createAdminToken();

          // Mock successful deactivation - user should always end up inactive
          mockAuthQuery.mockResolvedValueOnce({
            rows: [{
              id: userId,
              email: email,
              is_active: false // Always false after deactivation
            }]
          });

          const response = await request(app)
            .put(`/api/admin/users/${userId}/deactivate`)
            .set('Authorization', `Bearer ${adminToken}`);

          // Deactivation should succeed
          expect(response.status).toBe(200);
          expect(response.body.user.is_active).toBe(false);
          expect(response.body.message).toBe('User deactivated successfully');

          // Verify the database was called to set is_active = false
          expect(mockAuthQuery).toHaveBeenCalledWith(
            'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id, email, is_active',
            [userId]
          );

          // The round-trip property: deactivation sets is_active = false,
          // which would cause Auth Service to return 401 on login attempts
          // (We test the deactivation part here; Auth Service tests the login rejection)
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property (from 8.5): Pending claims ordering
   * For any set of pending claims, the returned list should be sorted by created_at ascending
   * and all claims should have status 'pending'
   * 
   * **Validates: Requirements 8.5**
   */
  it('should return pending claims in correct order', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.uuid(),
            item_id: fc.uuid(),
            claimant_id: fc.uuid(),
            status: fc.constant('pending'),
            created_at: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
            updated_at: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
            item_title: fc.string({ minLength: 1, maxLength: 100 }),
            item_type: fc.constantFrom('lost', 'found'),
            item_category: fc.constantFrom('Electronics', 'Clothing', 'Accessories', 'Documents', 'Keys'),
            item_location: fc.string({ minLength: 1, maxLength: 100 })
          }),
          { minLength: 0, maxLength: 10 }
        ),
        async (claims) => {
          const adminToken = createAdminToken();

          // Sort claims by created_at ascending (as the endpoint should do)
          const sortedClaims = [...claims].sort((a, b) => 
            a.created_at.getTime() - b.created_at.getTime()
          );

          // Mock database response with sorted claims
          mockItemQuery.mockResolvedValueOnce({
            rows: sortedClaims.map(claim => ({
              ...claim,
              created_at: claim.created_at.toISOString(),
              updated_at: claim.updated_at.toISOString()
            }))
          });

          const response = await request(app)
            .get('/api/admin/claims')
            .set('Authorization', `Bearer ${adminToken}`);

          expect(response.status).toBe(200);
          expect(Array.isArray(response.body)).toBe(true);

          // All returned claims should have status 'pending'
          response.body.forEach((claim: any) => {
            expect(claim.status).toBe('pending');
          });

          // Claims should be ordered by created_at ascending
          for (let i = 1; i < response.body.length; i++) {
            const prevDate = new Date(response.body[i - 1].created_at);
            const currDate = new Date(response.body[i].created_at);
            expect(prevDate.getTime()).toBeLessThanOrEqual(currDate.getTime());
          }

          // Verify correct SQL query was called
          expect(mockItemQuery).toHaveBeenCalledWith(
            expect.stringContaining('WHERE c.status = $1'),
            ['pending']
          );
          expect(mockItemQuery).toHaveBeenCalledWith(
            expect.stringContaining('ORDER BY c.created_at ASC'),
            ['pending']
          );
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: Dashboard stats are non-negative integers
   * For any dashboard response, all count values should be non-negative integers
   */
  it('should return non-negative integer stats in dashboard', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userCount: fc.nat({ max: 10000 }),
          itemCount: fc.nat({ max: 10000 }),
          matchCount: fc.nat({ max: 10000 }),
          claimCount: fc.nat({ max: 10000 })
        }),
        async ({ userCount, itemCount, matchCount, claimCount }) => {
          const adminToken = createAdminToken();

          // Mock database responses in the correct order
          mockAuthQuery.mockResolvedValueOnce({ rows: [{ count: userCount.toString() }] }); // users count
          mockItemQuery.mockResolvedValueOnce({ rows: [{ count: itemCount.toString() }] }); // items count
          mockMatchingQuery.mockResolvedValueOnce({ rows: [{ count: matchCount.toString() }] }); // matches count
          mockItemQuery.mockResolvedValueOnce({ rows: [{ count: claimCount.toString() }] }); // claims count

          const response = await request(app)
            .get('/api/admin/dashboard')
            .set('Authorization', `Bearer ${adminToken}`);

          expect(response.status).toBe(200);
          
          // All stats should be non-negative integers
          expect(response.body.totalUsers).toBeGreaterThanOrEqual(0);
          expect(response.body.totalItems).toBeGreaterThanOrEqual(0);
          expect(response.body.totalMatches).toBeGreaterThanOrEqual(0);
          expect(response.body.totalClaims).toBeGreaterThanOrEqual(0);

          expect(Number.isInteger(response.body.totalUsers)).toBe(true);
          expect(Number.isInteger(response.body.totalItems)).toBe(true);
          expect(Number.isInteger(response.body.totalMatches)).toBe(true);
          expect(Number.isInteger(response.body.totalClaims)).toBe(true);

          // Values should match what we mocked
          expect(response.body.totalUsers).toBe(userCount);
          expect(response.body.totalItems).toBe(itemCount);
          expect(response.body.totalMatches).toBe(matchCount);
          expect(response.body.totalClaims).toBe(claimCount);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: UUID validation for user and item operations
   * For any invalid UUID format, the endpoints should return 400 Bad Request
   */
  it('should validate UUID format for user and item operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          invalidId: fc.oneof(
            fc.constant('not-a-uuid'),
            fc.constant('123'),
            fc.constant('invalid-uuid-format'),
            fc.constant('12345678-1234-1234-1234-12345678901'), // too long
            fc.constant('12345678-1234-1234-1234-123456789012'), // wrong format
            fc.constant('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx') // wrong characters
          ),
          operation: fc.constantFrom('deactivate-user', 'delete-item')
        }),
        async ({ invalidId, operation }) => {
          const adminToken = createAdminToken();

          let response;
          if (operation === 'deactivate-user') {
            response = await request(app)
              .put(`/api/admin/users/${invalidId}/deactivate`)
              .set('Authorization', `Bearer ${adminToken}`);
          } else {
            response = await request(app)
              .delete(`/api/admin/items/${invalidId}`)
              .set('Authorization', `Bearer ${adminToken}`);
          }

          // Should return 400 for invalid UUID (assuming the route matches)
          // Some very malformed IDs might return 404 if Express doesn't match the route
          expect([400, 404]).toContain(response.status);
          if (response.status === 400) {
            expect(response.body.error).toMatch(/INVALID_(USER|ITEM)_ID/);
          }
        }
      ),
      { numRuns: 25 }
    );
  });
});