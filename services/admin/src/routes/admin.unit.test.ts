import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../app';

// Mock all database pools
jest.mock('../db', () => ({
  pool: { query: jest.fn() },
  authPool: { query: jest.fn() },
  itemPool: { query: jest.fn() },
  matchingPool: { query: jest.fn() }
}));

import { authPool, itemPool } from '../db';

const mockAuthQuery = authPool.query as jest.Mock;
const mockItemQuery = itemPool.query as jest.Mock;

const createAdminToken = () => {
  const secret = process.env.JWT_SECRET || 'test-secret';
  return jwt.sign(
    { sub: 'admin-id', email: 'admin@test.com', role: 'admin' },
    secret,
    { expiresIn: '1h' }
  );
};

describe('Admin Routes Unit Tests', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('PUT /api/admin/users/:id/deactivate', () => {
    const adminToken = createAdminToken();

    it('should deactivate a user successfully', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      mockAuthQuery.mockResolvedValueOnce({
        rows: [{
          id: userId,
          email: 'user@test.com',
          is_active: false
        }]
      });

      const response = await request(app)
        .put(`/api/admin/users/${userId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toEqual({
        message: 'User deactivated successfully',
        user: {
          id: userId,
          email: 'user@test.com',
          is_active: false
        }
      });

      expect(mockAuthQuery).toHaveBeenCalledWith(
        'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id, email, is_active',
        [userId]
      );
    });

    it('should return 400 for invalid UUID', async () => {
      const response = await request(app)
        .put('/api/admin/users/invalid-uuid/deactivate')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body).toEqual({
        error: 'INVALID_USER_ID'
      });
    });

    it('should return 404 for non-existent user', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      mockAuthQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put(`/api/admin/users/${userId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body).toEqual({
        error: 'USER_NOT_FOUND'
      });
    });
  });

  describe('DELETE /api/admin/items/:id', () => {
    const adminToken = createAdminToken();

    it('should delete an item successfully', async () => {
      const itemId = '123e4567-e89b-12d3-a456-426614174000';
      
      // Mock item exists check
      mockItemQuery.mockResolvedValueOnce({
        rows: [{
          id: itemId,
          image_url: 'https://example.com/image.jpg',
          thumbnail_url: 'https://example.com/thumb.jpg'
        }]
      });

      // Mock item deletion
      mockItemQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .delete(`/api/admin/items/${itemId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Item removed successfully',
        itemId: itemId
      });

      expect(mockItemQuery).toHaveBeenCalledWith(
        'SELECT id, image_url, thumbnail_url FROM items WHERE id = $1 AND status != $2',
        [itemId, 'deleted']
      );

      expect(mockItemQuery).toHaveBeenCalledWith(
        'UPDATE items SET status = $1, updated_at = NOW() WHERE id = $2',
        ['deleted', itemId]
      );
    });

    it('should return 400 for invalid UUID', async () => {
      const response = await request(app)
        .delete('/api/admin/items/invalid-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body).toEqual({
        error: 'INVALID_ITEM_ID'
      });
    });

    it('should return 404 for non-existent item', async () => {
      const itemId = '123e4567-e89b-12d3-a456-426614174000';
      mockItemQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .delete(`/api/admin/items/${itemId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body).toEqual({
        error: 'ITEM_NOT_FOUND'
      });
    });
  });

  describe('GET /api/admin/users with search', () => {
    const adminToken = createAdminToken();

    it('should search users by email', async () => {
      mockAuthQuery.mockResolvedValueOnce({
        rows: [{
          id: 'user-1',
          email: 'john@test.com',
          name: 'John Doe',
          role: 'user',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z'
        }]
      });

      const response = await request(app)
        .get('/api/admin/users?q=john')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].email).toBe('john@test.com');

      expect(mockAuthQuery).toHaveBeenCalledWith(
        'SELECT id, email, name, role, is_active, created_at FROM users WHERE email ILIKE $1 OR name ILIKE $1 ORDER BY created_at DESC LIMIT 50',
        ['%john%']
      );
    });

    it('should return all users when no search query', async () => {
      mockAuthQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'user-1',
            email: 'user1@test.com',
            name: 'User One',
            role: 'user',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z'
          },
          {
            id: 'user-2',
            email: 'user2@test.com',
            name: 'User Two',
            role: 'user',
            is_active: true,
            created_at: '2024-01-02T00:00:00Z'
          }
        ]
      });

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);

      expect(mockAuthQuery).toHaveBeenCalledWith(
        'SELECT id, email, name, role, is_active, created_at FROM users ORDER BY created_at DESC LIMIT 50',
        []
      );
    });
  });
});