import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { itemsApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatDate } from '../utils';

const ItemDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: item, isLoading, error } = useQuery({
    queryKey: ['item', id],
    queryFn: () => itemsApi.getItem(id!).then(r => r.data),
    enabled: !!id,
  });

  const claimMutation = useMutation({
    mutationFn: () => itemsApi.createClaim(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['item', id] }),
  });

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem 0' }}><LoadingSpinner size="lg" /></div>;
  if (error || !item) return (
    <div className="fade-in-up" style={{ textAlign: 'center', padding: '5rem 1.5rem' }}>
      <p style={{ color: '#dc2626', fontSize: '1.1rem', marginBottom: '1rem' }}>Item not found.</p>
      <Link to="/" className="btn btn-primary">Back to home</Link>
    </div>
  );

  const isOwner = user?.id === item.ownerId;
  const canClaim = isAuthenticated && !isOwner && item.type === 'found' && item.status === 'active';

  const infoBox: React.CSSProperties = {
    background: 'var(--gray-50)', borderRadius: 'var(--radius)', padding: '1rem',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
        <Link to="/" className="fade-in" style={{
          color: 'var(--orange-600)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500,
          display: 'inline-block', marginBottom: '1.5rem',
        }}>
          &larr; Back to browse
        </Link>

        <div className="card-static fade-in-up delay-1" style={{ padding: '2rem' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <span className={`badge ${item.type === 'lost' ? 'badge-error' : 'badge-success'}`} style={{ marginBottom: '0.5rem' }}>
                {item.type === 'lost' ? 'Lost' : 'Found'}
              </span>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--gray-900)' }}>{item.title}</h1>
            </div>
            <span className={`badge ${item.status === 'active' ? 'badge-info' : 'badge-warning'}`}>
              {item.status}
            </span>
          </div>

          {/* Image */}
          {item.imageUrl && (
            <img src={item.imageUrl} alt={item.title} style={{
              width: '100%', maxHeight: '24rem', objectFit: 'contain',
              borderRadius: 'var(--radius)', marginBottom: '1.5rem', background: 'var(--gray-100)',
            }} />
          )}

          {/* Info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={infoBox}>
              <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginBottom: '0.2rem' }}>Category</p>
              <p style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{item.category}</p>
            </div>
            <div style={infoBox}>
              <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginBottom: '0.2rem' }}>Location</p>
              <p style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{item.location}</p>
            </div>
            <div style={infoBox}>
              <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginBottom: '0.2rem' }}>Date</p>
              <p style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{formatDate(item.date)}</p>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--gray-900)', marginBottom: '0.5rem' }}>Description</h2>
            <p style={{ color: 'var(--gray-600)', lineHeight: 1.7 }}>{item.description}</p>
          </div>

          {/* Claim */}
          {canClaim && (
            <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: '1.5rem' }}>
              {claimMutation.error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
                  <p style={{ fontSize: '0.85rem', color: '#dc2626' }}>
                    {(claimMutation.error as any)?.response?.data?.error || 'Failed to submit claim.'}
                  </p>
                </div>
              )}
              {claimMutation.isSuccess ? (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius)', padding: '1rem' }}>
                  <p style={{ fontSize: '0.9rem', color: '#15803d' }}>Claim submitted successfully! An admin will review it.</p>
                </div>
              ) : (
                <button onClick={() => claimMutation.mutate()} disabled={claimMutation.isPending} className="btn btn-primary">
                  {claimMutation.isPending ? <><LoadingSpinner size="sm" className="mr-2" />Claiming...</> : 'Claim This Item'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Matches */}
        {item.matches && item.matches.length > 0 && (
          <div className="fade-in-up delay-2" style={{ marginTop: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '1rem' }}>Potential Matches</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {item.matches.map(match => (
                <Link key={match.id} to={`/items/${item.type === 'lost' ? match.foundItemId : match.lostItemId}`}
                  className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', color: 'inherit' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Match Score</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <div style={{ width: '6rem', height: '0.5rem', background: 'var(--gray-200)', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'var(--orange-500)', borderRadius: '9999px', width: `${match.score * 100}%` }} />
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{(match.score * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <span style={{ color: 'var(--orange-600)', fontSize: '0.85rem', fontWeight: 600 }}>View &rarr;</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemDetail;
