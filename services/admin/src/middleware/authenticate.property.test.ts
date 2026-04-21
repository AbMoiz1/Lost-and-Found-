import * as fc from 'fast-check';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../app';

// Mock all database pools
jest.mock('../db', () => ({
  pool: { query: jest.fn() },
  authPool: { query: jest.fn() },
  itemPool: { query: jest.fn() },
  matchingPool: { query: jest.fn() }
}));

import { authPool, itemPool, matchingPool } from '../db';

const mockAuthQuery = authPool.query as jest.Mock;
const mockItemQuery = itemPool.query as jest.Mock;
const mockMatchingQuery = matchingPool.query as jest.Mock;

// Feature: lost-and-found-app, Property 15: Admin-only endpoint enforcement
describe('Admin Authentication Property Tests', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 15: Admin-only endpoint enforcement
   * For any request to an Admin Service endpoint from a user without the admin role,
   * the response must be 403 and no data must be modified.
   * 
   * **Validates: Requirements 8.6**
   */
  it('should enforce admin-only access for all admin endpoints', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          role: fc.constantFrom('user', 'moderator', 'guest', '', 'invalid'),
          endpoint: fc.constantFrom('/dashboard', '/users', '/claims', '/items/123'),
          method: fc.constantFrom('GET', 'PUT', 'DELETE')
        }),
        async ({ role, endpoint, method }) => {
          const secret = process.env.JWT_SECRET || 'test-secret';
          const token = jwt.sign(
            { sub: 'test-user', email: 'test@example.com', role },
            secret,
            { expiresIn: '1h' }
          );

          let response;
          const fullPath = `/api/admin${endpoint}`;
          
          switch (method) {
            case 'GET':
              response = await request(app)
                .get(fullPath)
                .set('Authorization', `Bearer ${token}`);
              break;
            case 'PUT':
              response = await request(app)
                .put(fullPath)
                .set('Authorization', `Bearer ${token}`)
                .send({});
              break;
            case 'DELETE':
              response = await request(app)
                .delete(fullPath)
                .set('Authorization', `Bearer ${token}`);
              break;
            default:
              throw new Error(`Unsupported method: ${method}`);
          }

          // All non-admin roles should receive 403 Forbidden
          expect(response.status).toBe(403);
          expect(response.body).toEqual({ error: 'FORBIDDEN' });
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: JWT token validation round-trip for admin users
   * For any admin user, a valid JWT token should allow access to admin endpoints
   */
  it('should allow access for valid admin tokens', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.uuid(),
          email: fc.emailAddress(),
          endpoint: fc.constantFrom('/dashboard', '/users', '/claims')
        }),
        async ({ userId, email, endpoint }) => {
          // Mock database responses for different endpoints
          if (endpoint === '/dashboard') {
            mockAuthQuery.mockResolvedValueOnce({ rows: [{ count: '5' }] });
            mockItemQuery.mockResolvedValueOnce({ rows: [{ count: '10' }] });
            mockMatchingQuery.mockResolvedValueOnce({ rows: [{ count: '3' }] });
            mockItemQuery.mockResolvedValueOnce({ rows: [{ count: '2' }] });
          } else if (endpoint === '/users') {
            mockAuthQuery.mockResolvedValueOnce({ rows: [] });
          } else if (endpoint === '/claims') {
            mockItemQuery.mockResolvedValueOnce({ rows: [] });
          }

          const secret = process.env.JWT_SECRET || 'test-secret';
          const token = jwt.sign(
            { sub: userId, email, role: 'admin' },
            secret,
            { expiresIn: '1h' }
          );

          const response = await request(app)
            .get(`/api/admin${endpoint}`)
            .set('Authorization', `Bearer ${token}`);

          // Admin users should get 200 OK (not 403 Forbidden)
          expect(response.status).toBe(200);
          expect(response.body).not.toEqual({ error: 'FORBIDDEN' });
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: Invalid or missing tokens are rejected
   * For any invalid token or missing authorization header,
   * the response must be 401 Unauthorized
   */
  it('should reject invalid or missing tokens', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          token: fc.oneof(
            fc.constant(''), // empty token
            fc.constant('invalid-token'), // invalid token
            fc.string().filter(s => s.length > 0 && !s.includes('.')), // malformed token
            fc.constant(undefined) // no token
          ),
          endpoint: fc.constantFrom('/dashboard', '/users', '/claims')
        }),
        async ({ token, endpoint }) => {
          const requestBuilder = request(app).get(`/api/admin${endpoint}`);
          
          if (token !== undefined) {
            requestBuilder.set('Authorization', `Bearer ${token}`);
          }
          // If token is undefined, no Authorization header is set

          const response = await requestBuilder;

          // All invalid/missing tokens should receive 401 Unauthorized
          expect(response.status).toBe(401);
          expect(response.body).toEqual({ error: 'UNAUTHORIZED' });
        }
      ),
      { numRuns: 25 }
    );
  });
});