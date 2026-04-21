import { useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { willTokenExpireSoon, getTokenExpirationTime } from '../utils/auth';

/**
 * Hook to handle automatic token refresh and expiration warnings
 */
export const useTokenRefresh = () => {
  const { token, checkTokenExpiration } = useAuthStore();

  const checkAndHandleExpiration = useCallback(() => {
    if (!token) return;

    // Check if token is expired
    if (checkTokenExpiration()) {
      return;
    }

    // Warn user if token will expire soon (within 5 minutes)
    if (willTokenExpireSoon(token, 300)) {
      console.warn('Token will expire soon. Consider implementing refresh token logic.');
      // In a real app, you would implement token refresh here
      // For now, we'll just log a warning
    }
  }, [token, checkTokenExpiration]);

  useEffect(() => {
    if (!token) return;

    // Check token expiration immediately
    checkAndHandleExpiration();

    // Set up periodic checks every minute
    const interval = setInterval(checkAndHandleExpiration, 60000);

    return () => clearInterval(interval);
  }, [token, checkAndHandleExpiration]);

  return {
    checkTokenExpiration: checkAndHandleExpiration,
    timeUntilExpiration: token ? getTokenExpirationTime(token) : 0,
  };
};