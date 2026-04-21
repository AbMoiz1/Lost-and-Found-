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

import { pool, authPool, itemPool, matchingPool } from './db';

const mockAuthQuery = authPool.query as jest.Mock;
const mockItemQuery = itemPool.query as jest.Mock;
const mockMatchingQuery = matchingPool.query as jest.Mock;

// Test helper to create JWT tokens
const createTestToken = (role: string = 'admin') => {
  const secret = process.env.JWT_SECRET || 'test-secret';
  return jwt.sign(
    { sub: 'test-user-id', email: 'admin@test.com', role },
    secret,
    { expiresIn: '1h' }
  );
};

describe('Admin Service', () => {
  // Set test JWT secret
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ok',
        service: 'admin'
      });
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown-route')
        .expect(404);

      expect(response.body).toEqual({
        error: 'NOT_FOUND'
      });
    });
  });

  describe('Admin Routes Authentication', () => {
    it('should return 401 for requests without token', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .expect(401);

      expect(response.body).toEqual({
        error: 'UNAUTHORIZED'
      });
    });

    it('should return 401 for requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toEqual({
        error: 'UNAUTHORIZED'
      });
    });

    it('should return 403 for non-admin users', async () => {
      const userToken = createTestToken('user');
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body).toEqual({
        error: 'FORBIDDEN'
      });
    });
  });

  describe('Admin Routes', () => {
    const adminToken = createTestToken('admin');

    it('should respond to dashboard endpoint with admin token', async () => {
      // Mock database responses for dashboard stats
      mockAuthQuery.mockResolvedValueOnce({ rows: [{ count: '5' }] }); // users count
      mockItemQuery.mockResolvedValueOnce({ rows: [{ count: '10' }] }); // items count
      mockMatchingQuery.mockResolvedValueOnce({ rows: [{ count: '3' }] }); // matches count
      mockItemQuery.mockResolvedValueOnce({ rows: [{ count: '2' }] }); // claims count

      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toEqual({
        totalUsers: 5,
        totalItems: 10,
        totalMatches: 3,
        totalClaims: 2
      });
    });

    it('should respond to users endpoint with admin token', async () => {
      // Mock user search response
      mockAuthQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'user-1',
            email: 'user1@test.com',
            name: 'User One',
            role: 'user',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z'
          }
        ]
      });

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toHaveProperty('email', 'user1@test.com');
    });

    it('should respond to claims endpoint with admin token', async () => {
      // Mock pending claims response
      mockItemQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'claim-1',
            item_id: 'item-1',
            claimant_id: 'user-1',
            status: 'pending',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            item_title: 'Lost Wallet',
            item_type: 'found',
            item_category: 'Wallets',
            item_location: 'Downtown'
          }
        ]
      });

      const response = await request(app)
        .get('/api/admin/claims')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toHaveProperty('status', 'pending');
    });
  });
});