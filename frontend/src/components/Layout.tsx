import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTokenRefresh } from '../hooks/useTokenRefresh';

const Layout: React.FC = () => {
  const { isAuthenticated, isAdmin, user, logout } = useAuthStore();
  const navigate = useNavigate();
  
  // Initialize token refresh monitoring
  useTokenRefresh();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">L&F</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Lost & Found</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link 
                to="/" 
                className="text-gray-600 hover:text-orange-600 transition-colors font-medium"
              >
                Browse
              </Link>
              {isAuthenticated && (
                <>
                  <Link 
                    to="/items/lost/new" 
                    className="text-gray-600 hover:text-orange-600 transition-colors font-medium"
                  >
                    Report Lost
                  </Link>
                  <Link 
                    to="/items/found/new" 
                    className="text-gray-600 hover:text-orange-600 transition-colors font-medium"
                  >
                    Report Found
                  </Link>
                  <Link 
                    to="/my-items" 
                    className="text-gray-600 hover:text-orange-600 transition-colors font-medium"
                  >
                    My Items
                  </Link>
                  <Link 
                    to="/my-claims" 
                    className="text-gray-600 hover:text-orange-600 transition-colors font-medium"
                  >
                    My Claims
                  </Link>
                  {isAdmin && (
                    <Link 
                      to="/admin" 
                      className="text-gray-600 hover:text-orange-600 transition-colors font-medium"
                    >
                      Admin
                    </Link>
                  )}
                </>
              )}
            </nav>

            {/* Auth buttons */}
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    Welcome, {user?.name}
                    {isAdmin && <span className="ml-1 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">Admin</span>}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="btn-ghost"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link to="/login" className="btn-ghost">
                    Login
                  </Link>
                  <Link to="/register" className="btn-primary">
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2024 Lost & Found Portal. Helping reunite people with their belongings.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;