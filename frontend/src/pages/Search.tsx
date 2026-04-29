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
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
        <h1 className="fade-in-up" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '1.5rem' }}>
          Search Items
        </h1>

        {/* Filters */}
        <form onSubmit={handleSearch} className="card-static fade-in-up delay-1" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <input type="text" placeholder="Search by keyword..." className="input"
              value={filters.q || ''} onChange={e => setFilters(f => ({ ...f, q: e.target.value }))} />
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            <input type="text" placeholder="Location..." className="input"
              value={filters.location || ''} onChange={e => setFilters(f => ({ ...f, location: e.target.value }))} />
            <input type="date" className="input" value={filters.from || ''}
              onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
            <input type="date" className="input" value={filters.to || ''}
              onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="submit" className="btn btn-primary">Search</button>
            <button type="button" onClick={clearFilters} className="btn btn-ghost">Clear Filters</button>
          </div>
        </form>

        {/* Results */}
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}><LoadingSpinner size="lg" /></div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}><p style={{ color: '#dc2626' }}>Error loading items.</p></div>
        ) : items.length === 0 ? (
          <div className="fade-in-up" style={{ textAlign: 'center', padding: '3rem 0' }}>
            <p style={{ color: 'var(--gray-500)', fontSize: '1.1rem' }}>No items found. Try adjusting your filters.</p>
          </div>
        ) : (
          <>
            <p className="fade-in" style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: '1rem' }}>{items.length} item(s) found</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {items.map((item: Item, i: number) => (
                <Link key={item.id} to={`/items/${item.id}`}
                  className={`card fade-in-up delay-${Math.min(i % 6 + 1, 5)}`}
                  style={{ padding: '1.5rem', textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <span className={`badge ${item.type === 'lost' ? 'badge-error' : 'badge-success'}`}>
                      {item.type === 'lost' ? 'Lost' : 'Found'}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>{formatDate(item.date)}</span>
                  </div>
                  {item.thumbnailUrl && (
                    <img src={item.thumbnailUrl} alt={item.title}
                      style={{ width: '100%', height: '12rem', objectFit: 'cover', borderRadius: '0.5rem', marginBottom: '0.75rem' }} />
                  )}
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--gray-900)', marginBottom: '0.4rem' }}>{item.title}</h3>
                  <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                    {truncateText(item.description, 100)}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--gray-400)' }}>
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
