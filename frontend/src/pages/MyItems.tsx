import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { itemsApi } from '../services/api';
import type { Item } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatDate } from '../utils';

const MyItems: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['myItems'],
    queryFn: () => itemsApi.getMyItems().then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => itemsApi.deleteItem(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myItems'] }),
  });

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem 0' }}><LoadingSpinner size="lg" /></div>;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
        <div className="fade-in-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--gray-900)' }}>My Items</h1>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link to="/items/lost/new" className="btn btn-primary">Report Lost</Link>
            <Link to="/items/found/new" className="btn btn-secondary">Report Found</Link>
          </div>
        </div>

        {error ? (
          <p style={{ color: '#dc2626' }}>Error loading your items.</p>
        ) : items.length === 0 ? (
          <div className="card-static fade-in-up delay-1" style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--gray-500)', fontSize: '1.1rem', marginBottom: '1rem' }}>You haven't reported any items yet.</p>
            <Link to="/items/lost/new" className="btn btn-primary">Report Your First Item</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {items.map((item: Item, i: number) => (
              <div key={item.id} className={`card fade-in-up delay-${Math.min(i + 1, 5)}`}
                style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
                  {item.thumbnailUrl && (
                    <img src={item.thumbnailUrl} alt={item.title}
                      style={{ width: '4rem', height: '4rem', objectFit: 'cover', borderRadius: '0.5rem', flexShrink: 0 }} />
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                      <span className={`badge ${item.type === 'lost' ? 'badge-error' : 'badge-success'}`}>{item.type}</span>
                      <span className={`badge ${item.status === 'active' ? 'badge-info' : 'badge-warning'}`}>{item.status}</span>
                    </div>
                    <Link to={`/items/${item.id}`} style={{
                      fontSize: '1.05rem', fontWeight: 600, color: 'var(--gray-900)', textDecoration: 'none',
                      display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--orange-600)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--gray-900)')}>
                      {item.title}
                    </Link>
                    <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>{item.category} · {item.location} · {formatDate(item.date)}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <Link to={`/items/${item.id}`} className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>View</Link>
                  {item.status === 'active' && (
                    <button onClick={() => deleteMutation.mutate(item.id)} disabled={deleteMutation.isPending}
                      className="btn btn-ghost" style={{ fontSize: '0.8rem', color: '#dc2626' }}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyItems;
