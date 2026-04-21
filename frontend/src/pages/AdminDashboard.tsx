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
  } catch {
    return 'N/A';
  }
}

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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

        {/* Stats */}
        {statsLoading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Users', value: stats.totalUsers, color: 'from-blue-500 to-blue-600' },
              { label: 'Total Items', value: stats.totalItems, color: 'from-orange-500 to-orange-600' },
              { label: 'Total Matches', value: stats.totalMatches, color: 'from-green-500 to-green-600' },
              { label: 'Total Claims', value: stats.totalClaims, color: 'from-purple-500 to-purple-600' },
            ].map(s => (
              <div key={s.label} className={`card p-6 bg-gradient-to-br ${s.color} text-white`}>
                <p className="text-sm opacity-80">{s.label}</p>
                <p className="text-3xl font-bold">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* User Search */}
          <div className="card p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">User Management</h2>
            <input type="text" placeholder="Search users by email or name..."
              className="input mb-4" value={userSearch}
              onChange={e => setUserSearch(e.target.value)} />
            {usersLoading ? <LoadingSpinner /> : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {users.map((u: User) => (
                  <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{u.name}</p>
                      <p className="text-sm text-gray-500">{u.email}</p>
                      <span className={`badge ${u.isActive ? 'badge-success' : 'badge-error'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {u.isActive && (
                      <button onClick={() => deactivateMutation.mutate(u.id)}
                        disabled={deactivateMutation.isPending}
                        className="btn-ghost text-sm text-red-600">
                        Deactivate
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Claims */}
          <div className="card p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Pending Claims</h2>
            {claimsLoading ? <LoadingSpinner /> : claims.length === 0 ? (
              <p className="text-gray-500">No pending claims.</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {claims.map((c: Claim) => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-500">Claim #{c.id.slice(0, 8)}</p>
                      <p className="text-sm text-gray-500">{safeFormatDate(c.createdAt)}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => claimMutation.mutate({ claimId: c.id, status: 'approved' })}
                        disabled={claimMutation.isPending}
                        className="btn-primary text-sm py-1 px-3">
                        Approve
                      </button>
                      <button onClick={() => claimMutation.mutate({ claimId: c.id, status: 'rejected' })}
                        disabled={claimMutation.isPending}
                        className="btn-ghost text-sm text-red-600">
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
