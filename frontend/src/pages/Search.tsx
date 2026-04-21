import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { searchApi } from '../services/api';
import { CATEGORIES } from '../types';
import type { SearchParams, Item } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatDate, truncateText } from '../utils';

const Search: React.FC = () => {
  const [urlParams, setUrlParams] = useSearchParams();
  const [filters, setFilters] = useState<SearchParams>({
    q: urlParams.get('q') || '',
    category: urlParams.get('category') || '',
    location: urlParams.get('location') || '',
    type: (urlParams.get('type') as 'lost' | 'found') || undefined,
    from: urlParams.get('from') || '',
    to: urlParams.get('to') || '',
  });

  const activeParams: SearchParams = {};
  if (filters.q) activeParams.q = filters.q;
  if (filters.category) activeParams.category = filters.category;
  if (filters.location) activeParams.location = filters.location;
  if (filters.type) activeParams.type = filters.type;
  if (filters.from) activeParams.from = filters.from;
  if (filters.to) activeParams.to = filters.to;

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['search', activeParams],
    queryFn: async () => {
      const res = await searchApi.searchItems(activeParams);
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    setUrlParams(params);
  };

  const clearFilters = () => {
    setFilters({ q: '', category: '', location: '', type: undefined, from: '', to: '' });
    setUrlParams({});
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Search Items</h1>

        {/* Filters */}
        <form onSubmit={handleSearch} className="card p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input
              type="text" placeholder="Search by keyword..."
              className="input" value={filters.q || ''}
              onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
            />
            <select className="input" value={filters.category || ''}
              onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}>
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="input" value={filters.type || ''}
              onChange={e => setFilters(f => ({ ...f, type: (e.target.value || undefined) as any }))}>
              <option value="">Lost & Found</option>
              <option value="lost">Lost Items</option>
              <option value="found">Found Items</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input type="text" placeholder="Location..." className="input"
              value={filters.location || ''}
              onChange={e => setFilters(f => ({ ...f, location: e.target.value }))} />
            <input type="date" className="input" value={filters.from || ''}
              onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
            <input type="date" className="input" value={filters.to || ''}
              onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
          </div>
          <div className="flex gap-4">
            <button type="submit" className="btn-primary">Search</button>
            <button type="button" onClick={clearFilters} className="btn-ghost">Clear Filters</button>
          </div>
        </form>

        {/* Results */}
        {isLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
        ) : error ? (
          <div className="text-center py-12"><p className="text-red-600">Error loading items.</p></div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No items found. Try adjusting your filters.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">{items.length} item(s) found</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item: Item) => (
                <Link key={item.id} to={`/items/${item.id}`}
                  className="card p-6 hover:shadow-xl transition-all duration-200">
                  <div className="flex items-start justify-between mb-4">
                    <span className={`badge ${item.type === 'lost' ? 'badge-error' : 'badge-success'}`}>
                      {item.type === 'lost' ? 'Lost' : 'Found'}
                    </span>
                    <span className="text-sm text-gray-500">{formatDate(item.date)}</span>
                  </div>
                  {item.thumbnailUrl && (
                    <img src={item.thumbnailUrl} alt={item.title}
                      className="w-full h-48 object-cover rounded-lg mb-4" />
                  )}
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600 mb-4">{truncateText(item.description, 100)}</p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{item.category}</span>
                    <span>{item.location}</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Search;
