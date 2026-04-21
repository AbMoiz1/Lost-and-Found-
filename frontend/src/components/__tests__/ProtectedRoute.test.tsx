import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import ProtectedRoute from '../ProtectedRoute';
import { useAuthStore } from '../../store/authStore';

const mockUseAuthStore = vi.mocked(useAuthStore);

describe('ProtectedRoute', () => {
  it('renders children when user is authenticated', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
      isAdmin: false,
      isLoading: false,
      checkTokenExpiration: vi.fn(() => false),
      token: 'valid-token',
      user: { id: '1', email: 'test@example.com', name: 'Test User', role: 'user' as const, smsEnabled: false, isActive: true, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      login: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
      setLoading: vi.fn(),
      initializeAuth: vi.fn(),
    });

    render(
      <BrowserRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
