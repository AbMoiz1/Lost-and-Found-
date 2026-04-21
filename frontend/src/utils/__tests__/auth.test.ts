import { describe, it, expect } from 'vitest';
import { 
  decodeJWT, 
  isTokenExpired, 
  getTokenExpirationTime, 
  willTokenExpireSoon, 
  getUserFromToken 
} from '../auth';

describe('Auth Utilities', () => {
  // Create a mock JWT token for testing
  const createMockToken = (payload: any) => {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const encodedPayload = btoa(JSON.stringify(payload));
    const signature = 'mock-signature';
    return `${header}.${encodedPayload}.${signature}`;
  };

  describe('decodeJWT', () => {
    it('should decode a valid JWT token', () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'user',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };
      const token = createMockToken(payload);
      
      const decoded = decodeJWT(token);
      expect(decoded).toEqual(payload);
    });

    it('should return null for invalid token', () => {
      expect(decodeJWT('invalid-token')).toBeNull();
      expect(decodeJWT('')).toBeNull();
      expect(decodeJWT('not.enough.parts')).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for valid token', () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'user',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600 // Expires in 1 hour
      };
      const token = createMockToken(payload);
      
      expect(isTokenExpired(token)).toBe(false);
    });

    it('should return true for expired token', () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'user',
        iat: Math.floor(Date.now() / 1000) - 7200,
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      };
      const token = createMockToken(payload);
      
      expect(isTokenExpired(token)).toBe(true);
    });

    it('should return true for invalid token', () => {
      expect(isTokenExpired('invalid-token')).toBe(true);
    });
  });

  describe('getTokenExpirationTime', () => {
    it('should return correct expiration time for valid token', () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600;
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'user',
        iat: Math.floor(Date.now() / 1000),
        exp: futureTime
      };
      const token = createMockToken(payload);
      
      const expirationTime = getTokenExpirationTime(token);
      expect(expirationTime).toBeGreaterThan(3500); // Should be close to 3600 seconds
      expect(expirationTime).toBeLessThanOrEqual(3600);
    });

    it('should return 0 for expired token', () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'user',
        iat: Math.floor(Date.now() / 1000) - 7200,
        exp: Math.floor(Date.now() / 1000) - 3600
      };
      const token = createMockToken(payload);
      
      expect(getTokenExpirationTime(token)).toBe(0);
    });
  });

  describe('willTokenExpireSoon', () => {
    it('should return true if token expires within threshold', () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'user',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 200 // Expires in 200 seconds
      };
      const token = createMockToken(payload);
      
      expect(willTokenExpireSoon(token, 300)).toBe(true); // 300 second threshold
    });

    it('should return false if token expires after threshold', () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'user',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600 // Expires in 1 hour
      };
      const token = createMockToken(payload);
      
      expect(willTokenExpireSoon(token, 300)).toBe(false); // 300 second threshold
    });
  });

  describe('getUserFromToken', () => {
    it('should extract user info from valid token', () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'admin',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };
      const token = createMockToken(payload);
      
      const userInfo = getUserFromToken(token);
      expect(userInfo).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        role: 'admin'
      });
    });

    it('should return null for invalid token', () => {
      expect(getUserFromToken('invalid-token')).toBeNull();
    });
  });
});