/**
 * JWT token validation and management utilities
 */

export interface JWTPayload {
  sub: string; // user ID
  email: string;
  role: 'user' | 'admin';
  iat: number; // issued at
  exp: number; // expiration time
}

/**
 * Decode JWT token payload without verification
 * @param token JWT token string
 * @returns Decoded payload or null if invalid
 */
export const decodeJWT = (token: string): JWTPayload | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(atob(parts[1]));
    return payload as JWTPayload;
  } catch {
    return null;
  }
};

/**
 * Check if JWT token is expired
 * @param token JWT token string
 * @returns true if token is expired or invalid
 */
export const isTokenExpired = (token: string): boolean => {
  const payload = decodeJWT(token);
  if (!payload) {
    return true;
  }

  const currentTime = Date.now() / 1000;
  return payload.exp < currentTime;
};

/**
 * Get time until token expiration in seconds
 * @param token JWT token string
 * @returns seconds until expiration, or 0 if expired/invalid
 */
export const getTokenExpirationTime = (token: string): number => {
  const payload = decodeJWT(token);
  if (!payload) {
    return 0;
  }

  const currentTime = Date.now() / 1000;
  const timeUntilExpiration = payload.exp - currentTime;
  return Math.max(0, timeUntilExpiration);
};

/**
 * Check if token will expire within the specified number of seconds
 * @param token JWT token string
 * @param seconds Number of seconds to check ahead
 * @returns true if token will expire within the specified time
 */
export const willTokenExpireSoon = (token: string, seconds: number = 300): boolean => {
  const timeUntilExpiration = getTokenExpirationTime(token);
  return timeUntilExpiration <= seconds;
};

/**
 * Extract user information from JWT token
 * @param token JWT token string
 * @returns User info or null if invalid
 */
export const getUserFromToken = (token: string) => {
  const payload = decodeJWT(token);
  if (!payload) {
    return null;
  }

  return {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
  };
};