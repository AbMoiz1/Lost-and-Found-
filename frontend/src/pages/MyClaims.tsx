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

  if (isLoading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">My Claims</h1>

        {error ? (
          <p className="text-red-600">Error loading your claims.</p>
        ) : claims.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-gray-500 text-lg mb-4">You haven't made any claims yet.</p>
            <Link to="/search" className="btn-primary">Browse Found Items</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {claims.map((claim: Claim) => (
              <div key={claim.id} className="card p-6 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge ${statusColors[claim.status]}`}>{claim.status}</span>
                  </div>
                  <Link to={`/items/${claim.itemId}`} className="text-lg font-semibold text-gray-900 hover:text-orange-600">
                    View Item
                  </Link>
                  <p className="text-sm text-gray-500">Submitted {formatDateTime(claim.createdAt)}</p>
                </div>
                <Link to={`/items/${claim.itemId}`} className="btn-ghost text-sm">Details &rarr;</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyClaims;
