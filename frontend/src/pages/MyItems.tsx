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

  if (isLoading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">My Items</h1>
          <div className="flex gap-2">
            <Link to="/items/lost/new" className="btn-primary">Report Lost</Link>
            <Link to="/items/found/new" className="btn-secondary">Report Found</Link>
          </div>
        </div>

        {error ? (
          <p className="text-red-600">Error loading your items.</p>
        ) : items.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-gray-500 text-lg mb-4">You haven't reported any items yet.</p>
            <Link to="/items/lost/new" className="btn-primary">Report Your First Item</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item: Item) => (
              <div key={item.id} className="card p-6 flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  {item.thumbnailUrl && (
                    <img src={item.thumbnailUrl} alt={item.title} className="w-16 h-16 object-cover rounded-lg" />
                  )}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`badge ${item.type === 'lost' ? 'badge-error' : 'badge-success'}`}>
                        {item.type}
                      </span>
                      <span className={`badge ${item.status === 'active' ? 'badge-info' : 'badge-warning'}`}>
                        {item.status}
                      </span>
                    </div>
                    <Link to={`/items/${item.id}`} className="text-lg font-semibold text-gray-900 hover:text-orange-600">
                      {item.title}
                    </Link>
                    <p className="text-sm text-gray-500">{item.category} · {item.location} · {formatDate(item.date)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link to={`/items/${item.id}`} className="btn-ghost text-sm">View</Link>
                  {item.status === 'active' && (
                    <button onClick={() => deleteMutation.mutate(item.id)}
                      disabled={deleteMutation.isPending}
                      className="btn-ghost text-sm text-red-600 hover:text-red-700">
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
