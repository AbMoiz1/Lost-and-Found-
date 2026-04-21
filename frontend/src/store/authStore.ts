import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import { isTokenExpired } from '../utils/auth';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  initializeAuth: () => void;
  checkTokenExpiration: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      isLoading: true,
      
      login: (token: string, user: User) => {
        localStorage.setItem('token', token);
        set({
          token,
          user,
          isAuthenticated: true,
          isAdmin: user.role === 'admin',
          isLoading: false,
        });
      },
      
      logout: () => {
        localStorage.removeItem('token');
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          isAdmin: false,
          isLoading: false,
        });
      },
      
      updateUser: (user: User) => {
        set({
          user,
          isAdmin: user.role === 'admin',
        });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      initializeAuth: () => {
        const token = localStorage.getItem('token');
        
        if (token && !isTokenExpired(token)) {
          // Token exists and is valid, keep current state
          set({ isLoading: false });
        } else {
          // Token is expired or doesn't exist, clear auth state
          localStorage.removeItem('token');
          set({
            token: null,
            user: null,
            isAuthenticated: false,
            isAdmin: false,
            isLoading: false,
          });
        }
      },

      checkTokenExpiration: () => {
        const { token } = get();
        if (!token) return true;
        
        const expired = isTokenExpired(token);
        if (expired) {
          // Auto-logout if token is expired
          get().logout();
        }
        return expired;
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isAdmin: state.isAdmin,
      }),
      onRehydrateStorage: () => (state) => {
        // Initialize auth state after rehydration
        if (state) {
          state.initializeAuth();
        }
      },
    }
  )
);