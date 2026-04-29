import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTokenRefresh } from '../hooks/useTokenRefresh';

const Layout: React.FC = () => {
  const { isAuthenticated, isAdmin, user, logout } = useAuthStore();
  const navigate = useNavigate();

  useTokenRefresh();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header */}
      <header className="fade-in" style={{
        background: 'white',
        borderBottom: '1px solid var(--gray-200)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backdropFilter: 'blur(12px)',
        backgroundColor: 'rgba(255,255,255,0.92)',
      }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '4rem' }}>
            {/* Logo */}
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
              <div style={{
                width: '2.25rem',
                height: '2.25rem',
                background: 'linear-gradient(135deg, var(--orange-500), var(--orange-600))',
                borderRadius: '0.6rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(234,88,12,0.3)',
              }}>
                <span style={{ color: 'white', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.02em' }}>L&F</span>
              </div>
              <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--gray-900)' }}>
                Lost <span style={{ color: 'var(--orange-500)' }}>&</span> Found
              </span>
            </Link>

            {/* Navigation */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} className="hidden md:flex">
              {[
                { to: '/', label: 'Browse' },
                ...(isAuthenticated ? [
                  { to: '/items/lost/new', label: 'Report Lost' },
                  { to: '/items/found/new', label: 'Report Found' },
                  { to: '/my-items', label: 'My Items' },
                  { to: '/my-claims', label: 'My Claims' },
                  ...(isAdmin ? [{ to: '/admin', label: 'Admin' }] : []),
                ] : []),
              ].map(link => (
                <Link key={link.to} to={link.to} className="btn-ghost" style={{ fontSize: '0.85rem', fontWeight: 500, borderRadius: '0.5rem' }}>
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Auth */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {isAuthenticated ? (
                <>
                  <span style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                    {user?.name}
                    {isAdmin && (
                      <span style={{
                        marginLeft: '0.4rem',
                        fontSize: '0.65rem',
                        background: 'var(--orange-100)',
                        color: 'var(--orange-800)',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        fontWeight: 600,
                      }}>Admin</span>
                    )}
                  </span>
                  <button onClick={handleLogout} className="btn-ghost" style={{ fontSize: '0.85rem' }}>
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn-ghost" style={{ fontSize: '0.85rem' }}>Login</Link>
                  <Link to="/register" className="btn btn-primary" style={{ fontSize: '0.85rem' }}>Register</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="fade-in" style={{
        background: 'var(--gray-900)',
        color: 'var(--gray-400)',
        marginTop: 'auto',
      }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '3rem 1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <div style={{
                  width: '2rem', height: '2rem',
                  background: 'linear-gradient(135deg, var(--orange-500), var(--orange-600))',
                  borderRadius: '0.5rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ color: 'white', fontWeight: 800, fontSize: '0.6rem' }}>L&F</span>
                </div>
                <span style={{ color: 'white', fontWeight: 700, fontSize: '1rem' }}>Lost & Found</span>
              </div>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
                Helping reunite people with their belongings through community-powered search.
              </p>
            </div>
            <div>
              <p style={{ color: 'white', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.75rem' }}>Quick Links</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {[
                  { to: '/', label: 'Browse Items' },
                  { to: '/search', label: 'Search' },
                  { to: '/items/lost/new', label: 'Report Lost' },
                  { to: '/items/found/new', label: 'Report Found' },
                ].map(l => (
                  <Link key={l.to} to={l.to} style={{ color: 'var(--gray-400)', textDecoration: 'none', fontSize: '0.85rem', transition: 'color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--orange-400)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--gray-400)')}>
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <p style={{ color: 'white', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.75rem' }}>Support</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {['Help Center', 'Contact Us', 'Privacy Policy', 'Terms of Service'].map(t => (
                  <span key={t} style={{ fontSize: '0.85rem', cursor: 'default' }}>{t}</span>
                ))}
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--gray-800)', paddingTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem' }}>
            &copy; {new Date().getFullYear()} Lost & Found Portal. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
