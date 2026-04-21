import React, { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useAuthStore } from '../store/authStore';
import { useTokenRefresh } from '../hooks/useTokenRefresh';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const authStore = useAuthStore();
  
  // Initialize token refresh monitoring
  useTokenRefresh();

  useEffect(() => {
    // Initialize auth state when the provider mounts
    authStore.initializeAuth();
  }, [authStore]);

  const contextValue: AuthContextType = {
    user: authStore.user,
    isAuthenticated: authStore.isAuthenticated,
    isAdmin: authStore.isAdmin,
    isLoading: authStore.isLoading,
    login: authStore.login,
    logout: authStore.logout,
    updateUser: authStore.updateUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

// Re-export the hook for convenience
export { useAuth } from '../hooks/useAuth';