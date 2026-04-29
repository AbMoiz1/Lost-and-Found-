import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { searchApi } from '../services/api';
import type { SearchParams, Item } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatDate, truncateText } from '../utils';

const Home: React.FC = () => {
  const [searchParams, setSearchParams] = useState<SearchParams>({});

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['items', searchParams],
    queryFn: async () => {
      const res = await searchApi.searchItems(searchParams);
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const params: SearchParams = {};
    const q = fd.get('q') as string; if (q) params.q = q;
    const category = fd.get('category') as string; if (category) params.category = category;
    const type = fd.get('type') as string; if (type) params.type = type as 'lost' | 'found';
    setSearchParams(params);
  };

  return (
    <div>
      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, var(--orange-600) 0%, var(--orange-500) 40%, #f59e0b 100%)',
        position: 'relative',
        overflow: 'hidden',
        padding: '5rem 1.5rem',
      }}>
        <div style={{ position: 'absolute', top: '-10rem', right: '-10rem', width: '30rem', height: '30rem', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: '-8rem', left: '-6rem', width: '24rem', height: '24rem', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <div style={{ maxWidth: '64rem', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <p className="fade-in-up" style={{
            display: 'inline-block',
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(8px)',
            color: 'white',
            padding: '0.35rem 1rem',
            borderRadius: '9999px',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '1.5rem',
          }}>
            Community-powered lost & found
          </p>
          <h1 className="fade-in-up delay-1" style={{
            color: 'white',
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: 800,
            lineHeight: 1.15,
            marginBottom: '1.25rem',
            letterSpacing: '-0.02em',
          }}>
            Lost Something?<br />Found Something?
          </h1>
          <p className="fade-in-up delay-2" style={{
            color: 'rgba(255,255,255,0.85)',
            fontSize: 'clamp(1rem, 2vw, 1.2rem)',
            maxWidth: '36rem',
            margin: '0 auto 2.5rem',
            lineHeight: 1.6,
          }}>
            Connect with your community to reunite lost items with their owners. Fast, simple, and effective.
          </p>
          <div className="fade-in-up delay-3" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/items/lost/new" className="btn btn-white">Report Lost Item</Link>
            <Link to="/items/found/new" className="btn btn-white-outline">Report Found Item</Link>
          </div>
        </div>
      </section>

      {/* Search */}
      <section style={{ padding: '3rem 1.5rem', background: 'white' }}>
        <div style={{ maxWidth: '64rem', margin: '0 auto' }}>
          <div className="fade-in-up" style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '0.5rem' }}>
              Search Lost & Found Items
            </h2>
            <p style={{ color: 'var(--gray-500)' }}>Browse through reported items or search for something specific</p>
          </div>

          <form onSubmit={handleSearch} className="fade-in-up delay-1">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <input type="text" name="q" placeholder="Search by keyword..." className="input" />
              <select name="category" className="input">
                <option value="">All Categories</option>
                {['Electronics','Clothing','Accessories','Documents','Keys','Pets','Bags','Wallets','Jewelry','Other'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select name="type" className="input">
                <option value="">Lost & Found</option>
                <option value="lost">Lost Items</option>
                <option value="found">Found Items</option>
              </select>
              <button type="submit" className="btn btn-primary">Search</button>
            </div>
          </form>
        </div>
      </section>

      {/* Results */}
      <section style={{ padding: '3rem 1.5rem', background: 'var(--gray-50)' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}><LoadingSpinner size="lg" /></div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
              <p style={{ color: '#dc2626' }}>Error loading items. Please try again.</p>
            </div>
          ) : items.length === 0 ? (
            <div className="fade-in-up" style={{ textAlign: 'center', padding: '3rem 0' }}>
              <p style={{ color: 'var(--gray-500)', fontSize: '1.1rem' }}>No items found. Try adjusting your search criteria.</p>
            </div>
          ) : (
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
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;
