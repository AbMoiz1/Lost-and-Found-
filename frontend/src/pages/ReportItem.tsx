import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { itemsApi, imagesApi } from '../services/api';
import { CATEGORIES } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

const itemSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.string().min(1, 'Please select a category'),
  location: z.string().min(2, 'Location is required'),
  date: z.string().min(1, 'Date is required'),
});

type ItemForm = z.infer<typeof itemSchema>;

const ReportItem: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isLost = location.pathname.includes('/lost/');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<ItemForm>({
    resolver: zodResolver(itemSchema),
  });

  const uploadMutation = useMutation({ mutationFn: imagesApi.uploadImage });
  const createMutation = useMutation({
    mutationFn: (data: ItemForm & { imageUrl?: string; thumbnailUrl?: string }) =>
      isLost ? itemsApi.createLostItem(data) : itemsApi.createFoundItem(data),
    onSuccess: (response) => navigate(`/items/${response.data.id}`),
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: ItemForm) => {
    let imageUrl: string | undefined;
    let thumbnailUrl: string | undefined;
    if (imageFile) {
      try {
        const res = await uploadMutation.mutateAsync(imageFile);
        imageUrl = res.data.originalUrl;
        thumbnailUrl = res.data.thumbnailUrl;
      } catch { return; }
    }
    createMutation.mutate({ ...data, imageUrl, thumbnailUrl });
  };

  const isPending = uploadMutation.isPending || createMutation.isPending;
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.4rem' };
  const errStyle: React.CSSProperties = { marginTop: '0.25rem', fontSize: '0.8rem', color: '#dc2626' };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', padding: '2.5rem 1.5rem' }}>
      <div style={{ maxWidth: '42rem', margin: '0 auto' }}>
        <div className="fade-in-up" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '3.5rem', height: '3.5rem',
            background: isLost
              ? 'linear-gradient(135deg, #ef4444, #dc2626)'
              : 'linear-gradient(135deg, #22c55e, #16a34a)',
            borderRadius: '1rem',
            marginBottom: '1rem',
            boxShadow: isLost ? '0 4px 14px rgba(239,68,68,0.3)' : '0 4px 14px rgba(34,197,94,0.3)',
          }}>
            <span style={{ color: 'white', fontSize: '1.5rem' }}>{isLost ? '🔍' : '📦'}</span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '0.5rem' }}>
            Report {isLost ? 'Lost' : 'Found'} Item
          </h1>
          <p style={{ color: 'var(--gray-500)' }}>
            {isLost ? 'Provide details so others can help find it' : 'Describe the item so the owner can claim it'}
          </p>
        </div>

        <div className="card-static fade-in-up delay-1" style={{ padding: '2rem' }}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>Title</label>
              <input {...register('title')} className="input" placeholder="e.g. Black leather wallet" />
              {errors.title && <p style={errStyle}>{errors.title.message}</p>}
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>Description</label>
              <textarea {...register('description')} className="input" rows={4} placeholder="Describe the item in detail..." />
              {errors.description && <p style={errStyle}>{errors.description.message}</p>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={labelStyle}>Category</label>
                <select {...register('category')} className="input">
                  <option value="">Select category</option>
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                {errors.category && <p style={errStyle}>{errors.category.message}</p>}
              </div>
              <div>
                <label style={labelStyle}>Date {isLost ? 'Lost' : 'Found'}</label>
                <input {...register('date')} type="date" className="input" />
                {errors.date && <p style={errStyle}>{errors.date.message}</p>}
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>Location</label>
              <input {...register('location')} className="input" placeholder="Where was it lost/found?" />
              {errors.location && <p style={errStyle}>{errors.location.message}</p>}
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>Image (optional)</label>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} className="input" />
              {imagePreview && (
                <img src={imagePreview} alt="Preview" style={{ marginTop: '0.5rem', width: '8rem', height: '8rem', objectFit: 'cover', borderRadius: '0.5rem' }} />
              )}
            </div>

            {(uploadMutation.error || createMutation.error) && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
                <p style={{ fontSize: '0.85rem', color: '#dc2626' }}>
                  {(createMutation.error as any)?.response?.data?.error
                    || (uploadMutation.error as any)?.response?.data?.error
                    || 'Something went wrong. Please try again.'}
                </p>
              </div>
            )}

            <button type="submit" disabled={isPending} className="btn btn-primary" style={{ width: '100%' }}>
              {isPending ? (
                <><LoadingSpinner size="sm" className="mr-2" />Submitting...</>
              ) : `Report ${isLost ? 'Lost' : 'Found'} Item`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReportItem;
