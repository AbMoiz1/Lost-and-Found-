import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { itemsApi } from '../services/api';
import type { Claim } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatDateTime } from '../utils';

const statusColors: Record<string, string> = {
  pending: 'badge-warning',
  approved: 'badge-success',
  rejected: 'badge-error',
};

const MyClaims: React.FC = () => {
  const { data: claims = [], isLoading, error } = useQuery({
    queryKey: ['myClaims'],
    queryFn: () => itemsApi.getMyClaims().then(r => r.data),
  });

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem 0' }}><LoadingSpinner size="lg" /></div>;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
        <h1 className="fade-in-up" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '1.5rem' }}>
          My Claims
        </h1>

        {error ? (
          <p style={{ color: '#dc2626' }}>Error loading your claims.</p>
        ) : claims.length === 0 ? (
          <div className="card-static fade-in-up delay-1" style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--gray-500)', fontSize: '1.1rem', marginBottom: '1rem' }}>You haven't made any claims yet.</p>
            <Link to="/search" className="btn btn-primary">Browse Found Items</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {claims.map((claim: Claim, i: number) => (
              <div key={claim.id} className={`card fade-in-up delay-${Math.min(i + 1, 5)}`}
                style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ marginBottom: '0.3rem' }}>
                    <span className={`badge ${statusColors[claim.status]}`}>{claim.status}</span>
                  </div>
                  <Link to={`/items/${claim.itemId}`} style={{
                    fontSize: '1.05rem', fontWeight: 600, color: 'var(--gray-900)', textDecoration: 'none',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--orange-600)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--gray-900)')}>
                    View Item
                  </Link>
                  <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: '0.2rem' }}>Submitted {formatDateTime(claim.createdAt)}</p>
                </div>
                <Link to={`/items/${claim.itemId}`} className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>
                  Details &rarr;
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyClaims;
