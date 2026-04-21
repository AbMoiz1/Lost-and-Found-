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

  if (isLoading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  if (error || !item) return (
    <div className="text-center py-20">
      <p className="text-red-600 text-lg">Item not found.</p>
      <Link to="/" className="text-orange-600 hover:text-orange-500 mt-4 inline-block">Back to home</Link>
    </div>
  );

  const isOwner = user?.id === item.ownerId;
  const canClaim = isAuthenticated && !isOwner && item.type === 'found' && item.status === 'active';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="text-orange-600 hover:text-orange-500 text-sm mb-6 inline-block">&larr; Back to browse</Link>

        <div className="card p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <span className={`badge ${item.type === 'lost' ? 'badge-error' : 'badge-success'} mb-2`}>
                {item.type === 'lost' ? 'Lost' : 'Found'}
              </span>
              <h1 className="text-3xl font-bold text-gray-900">{item.title}</h1>
            </div>
            <span className={`badge ${item.status === 'active' ? 'badge-info' : 'badge-warning'}`}>
              {item.status}
            </span>
          </div>

          {item.imageUrl && (
            <img src={item.imageUrl} alt={item.title} className="w-full max-h-96 object-contain rounded-lg mb-6 bg-gray-100" />
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Category</p>
              <p className="font-medium text-gray-900">{item.category}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Location</p>
              <p className="font-medium text-gray-900">{item.location}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Date</p>
              <p className="font-medium text-gray-900">{formatDate(item.date)}</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Description</h2>
            <p className="text-gray-700 leading-relaxed">{item.description}</p>
          </div>

          {canClaim && (
            <div className="border-t border-gray-200 pt-6">
              {claimMutation.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-red-600">
                    {(claimMutation.error as any)?.response?.data?.error || 'Failed to submit claim.'}
                  </p>
                </div>
              )}
              {claimMutation.isSuccess ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-700">Claim submitted successfully! An admin will review it.</p>
                </div>
              ) : (
                <button onClick={() => claimMutation.mutate()} disabled={claimMutation.isPending}
                  className="btn-primary flex items-center">
                  {claimMutation.isPending ? <><LoadingSpinner size="sm" className="mr-2" />Claiming...</> : 'Claim This Item'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Matches */}
        {item.matches && item.matches.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Potential Matches</h2>
            <div className="space-y-4">
              {item.matches.map(match => (
                <Link key={match.id} to={`/items/${item.type === 'lost' ? match.foundItemId : match.lostItemId}`}
                  className="card p-4 flex items-center justify-between hover:shadow-lg transition-all">
                  <div>
                    <span className="text-sm text-gray-500">Match Score</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500 rounded-full" style={{ width: `${match.score * 100}%` }} />
                      </div>
                      <span className="text-sm font-medium">{(match.score * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <span className="text-orange-600 text-sm font-medium">View &rarr;</span>
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
