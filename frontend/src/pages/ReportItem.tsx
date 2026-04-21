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
    mutationFn: (data: ItemForm & { imageUrl?: string; thumbnailUrl?: string }) => {
      return isLost ? itemsApi.createLostItem(data) : itemsApi.createFoundItem(data);
    },
    onSuccess: (response) => {
      navigate(`/items/${response.data.id}`);
    },
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
      } catch {
        return; // upload error shown via mutation state
      }
    }

    createMutation.mutate({ ...data, imageUrl, thumbnailUrl });
  };

  const isPending = uploadMutation.isPending || createMutation.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Report {isLost ? 'Lost' : 'Found'} Item
          </h1>
          <p className="mt-2 text-gray-600">
            {isLost
              ? 'Provide details about the item you lost so others can help find it'
              : 'Describe the item you found so the owner can claim it'}
          </p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
              <input {...register('title')} className="input" placeholder="e.g. Black leather wallet" />
              {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea {...register('description')} className="input" rows={4} placeholder="Describe the item in detail..." />
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select {...register('category')} className="input">
                  <option value="">Select category</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date {isLost ? 'Lost' : 'Found'}</label>
                <input {...register('date')} type="date" className="input" />
                {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <input {...register('location')} className="input" placeholder="Where was it lost/found?" />
              {errors.location && <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Image (optional)</label>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} className="input" />
              {imagePreview && (
                <img src={imagePreview} alt="Preview" className="mt-2 w-32 h-32 object-cover rounded-lg" />
              )}
            </div>

            {(uploadMutation.error || createMutation.error) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600">
                  {(createMutation.error as any)?.response?.data?.error
                    || (uploadMutation.error as any)?.response?.data?.error
                    || 'Something went wrong. Please try again.'}
                </p>
              </div>
            )}

            <button type="submit" disabled={isPending} className="btn-primary w-full flex items-center justify-center">
              {isPending ? (
                <><LoadingSpinner size="sm" className="mr-2" />Submitting...</>
              ) : (
                `Report ${isLost ? 'Lost' : 'Found'} Item`
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReportItem;
