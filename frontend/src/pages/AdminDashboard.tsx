import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, itemsApi } from '../services/api';
import type { User, Claim } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

function safeFormatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return 'N/A'; }
}

const statGradients = [
  'linear-gradient(135deg, #3b82f6, #2563eb)',
  'linear-gradient(135deg, var(--orange-500), var(--orange-600))',
  'linear-gradient(135deg, #22c55e, #16a34a)',
  'linear-gradient(135deg, #a855f7, #7c3aed)',
];

const AdminDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const [userSearch, setUserSearch] = useState('');

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: () => adminApi.getDashboard().then(r => r.data),
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['adminUsers', userSearch],
    queryFn: () => adminApi.searchUsers(userSearch).then(r => r.data),
    enabled: userSearch.length > 0,
  });

  const { data: claims = [], isLoading: claimsLoading } = useQuery({
    queryKey: ['adminClaims'],
    queryFn: async () => {
      const r = await adminApi.getPendingClaims();
      return Array.isArray(r.data) ? r.data : [];
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (userId: string) => adminApi.deactivateUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminUsers'] }),
  });

  const claimMutation = useMutation({
    mutationFn: ({ claimId, status }: { claimId: string; status: 'approved' | 'rejected' }) =>
      itemsApi.updateClaim(claimId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminClaims'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] });
    },
  });

  const statItems = stats ? [
    { label: 'Total Users', value: stats.totalUsers },
    { label: 'Total Items', value: stats.totalItems },
    { label: 'Total Matches', value: stats.totalMatches },
    { label: 'Total Claims', value: stats.totalClaims },
  ] : [];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
        <h1 className="fade-in-up" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '2rem' }}>
          Admin Dashboard
        </h1>

        {/* Stats */}
        {statsLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}><LoadingSpinner /></div>
        ) : stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {statItems.map((s, i) => (
              <div key={s.label} className={`fade-in-up delay-${i + 1}`} style={{
                background: statGradients[i],
                borderRadius: 'var(--radius)',
                padding: '1.5rem',
                color: 'white',
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
              }}>
                <p style={{ fontSize: '0.8rem', opacity: 0.85, marginBottom: '0.25rem' }}>{s.label}</p>
                <p style={{ fontSize: '2rem', fontWeight: 800 }}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {/* User Management */}
          <div className="card-static fade-in-up delay-2" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '1rem' }}>User Management</h2>
            <input type="text" placeholder="Search users by email or name..."
              className="input" style={{ marginBottom: '1rem' }}
              value={userSearch} onChange={e => setUserSearch(e.target.value)} />
            {usersLoading ? <LoadingSpinner /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '20rem', overflowY: 'auto' }}>
                {users.map((u: User) => (
                  <div key={u.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.75rem', background: 'var(--gray-50)', borderRadius: '0.5rem',
                  }}>
                    <div>
                      <p style={{ fontWeight: 600, color: 'var(--gray-900)', fontSize: '0.9rem' }}>{u.name}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{u.email}</p>
                      <span className={`badge ${u.isActive ? 'badge-success' : 'badge-error'}`} style={{ marginTop: '0.25rem' }}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {u.isActive && (
                      <button onClick={() => deactivateMutation.mutate(u.id)}
                        disabled={deactivateMutation.isPending}
                        className="btn btn-ghost" style={{ fontSize: '0.8rem', color: '#dc2626' }}>
                        Deactivate
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Claims */}
          <div className="card-static fade-in-up delay-3" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '1rem' }}>Pending Claims</h2>
            {claimsLoading ? <LoadingSpinner /> : claims.length === 0 ? (
              <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>No pending claims.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '20rem', overflowY: 'auto' }}>
                {claims.map((c: Claim) => (
                  <div key={c.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.75rem', background: 'var(--gray-50)', borderRadius: '0.5rem',
                  }}>
                    <div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--gray-600)', fontWeight: 500 }}>Claim #{c.id.slice(0, 8)}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>{safeFormatDate(c.createdAt)}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button onClick={() => claimMutation.mutate({ claimId: c.id, status: 'approved' })}
                        disabled={claimMutation.isPending}
                        className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>
                        Approve
                      </button>
                      <button onClick={() => claimMutation.mutate({ claimId: c.id, status: 'rejected' })}
                        disabled={claimMutation.isPending}
                        className="btn btn-ghost" style={{ fontSize: '0.75rem', color: '#dc2626' }}>
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
