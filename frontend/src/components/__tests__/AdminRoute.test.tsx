import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import AdminRoute from '../AdminRoute';
import { useAuthStore } from '../../store/authStore';

const mockUseAuthStore = vi.mocked(useAuthStore);

const TestComponent = () => <div>Admin Content</div>;

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('AdminRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage to avoid persistence issues
    localStorage.clear();
  });

  it('shows loading spinner when auth is loading', async () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      isAdmin: false,
      isLoading: true,
      checkTokenExpiration: vi.fn(() => false),
      token: null,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
      setLoading: vi.fn(),
      initializeAuth: vi.fn(),
    });

    renderWithRouter(
      <AdminRoute>
        <TestComponent />
      </AdminRoute>
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders children when user is authenticated admin', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
      isAdmin: true,
      isLoading: false,
      checkTokenExpiration: vi.fn(() => false),
      token: 'valid-token',
      user: { id: '1', email: 'admin@example.com', name: 'Admin User', role: 'admin' as const, smsEnabled: false, isActive: true, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      login: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
      setLoading: vi.fn(),
      initializeAuth: vi.fn(),
    });

    renderWithRouter(
      <AdminRoute>
        <TestComponent />
      </AdminRoute>
    );

    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });

  it('redirects when user is authenticated but not admin', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
      isAdmin: false,
      isLoading: false,
      checkTokenExpiration: vi.fn(() => false),
      token: 'valid-token',
      user: { id: '1', email: 'user@example.com', name: 'Regular User', role: 'user' as const, smsEnabled: false, isActive: true, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      login: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
      setLoading: vi.fn(),
      initializeAuth: vi.fn(),
    });

    renderWithRouter(
      <AdminRoute>
        <TestComponent />
      </AdminRoute>
    );

    // Should not render the admin content
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });
});