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
    const formData = new FormData(e.currentTarget);
    const params: SearchParams = {};
    
    const query = formData.get('q') as string;
    if (query) params.q = query;
    
    const category = formData.get('category') as string;
    if (category) params.category = category;
    
    const type = formData.get('type') as string;
    if (type) params.type = type as 'lost' | 'found';
    
    setSearchParams(params);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-orange-600 to-blue-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Lost Something? Found Something?
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-orange-100">
            Connect with your community to reunite lost items with their owners
          </p>
          <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/items/lost/new" style={{ padding: '0.75rem 2rem', backgroundColor: 'white', color: '#ea580c', borderRadius: '0.5rem', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
              Report Lost Item
            </Link>
            <Link to="/items/found/new" style={{ padding: '0.75rem 2rem', border: '2px solid white', color: 'white', borderRadius: '0.5rem', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
              Report Found Item
            </Link>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Search Lost & Found Items
            </h2>
            <p className="text-gray-600">
              Browse through reported items or search for something specific
            </p>
          </div>

          <form onSubmit={handleSearch} className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <input
                type="text"
                name="q"
                placeholder="Search by keyword..."
                className="input"
              />
              <select name="category" className="input">
                <option value="">All Categories</option>
                <option value="Electronics">Electronics</option>
                <option value="Clothing">Clothing</option>
                <option value="Accessories">Accessories</option>
                <option value="Documents">Documents</option>
                <option value="Keys">Keys</option>
                <option value="Pets">Pets</option>
                <option value="Bags">Bags</option>
                <option value="Wallets">Wallets</option>
                <option value="Jewelry">Jewelry</option>
                <option value="Other">Other</option>
              </select>
              <select name="type" className="input">
                <option value="">Lost & Found</option>
                <option value="lost">Lost Items</option>
                <option value="found">Found Items</option>
              </select>
              <button type="submit" className="btn-primary">
                Search
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Results Section */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600">Error loading items. Please try again.</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No items found. Try adjusting your search criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item: Item) => (
                <Link
                  key={item.id}
                  to={`/items/${item.id}`}
                  className="card p-6 hover:shadow-xl transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <span className={`badge ${
                      item.type === 'lost' ? 'badge-error' : 'badge-success'
                    }`}>
                      {item.type === 'lost' ? 'Lost' : 'Found'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatDate(item.date)}
                    </span>
                  </div>
                  
                  {item.thumbnailUrl && (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                  )}
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {item.title}
                  </h3>
                  
                  <p className="text-gray-600 mb-4">
                    {truncateText(item.description, 100)}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
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