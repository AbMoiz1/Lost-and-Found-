export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  phone?: string;
  smsEnabled: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Item {
  id: string;
  type: 'lost' | 'found';
  title: string;
  description: string;
  category: string;
  location: string;
  date: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  status: 'active' | 'claimed' | 'deleted';
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Match {
  id: string;
  lostItemId: string;
  foundItemId: string;
  score: number;
  createdAt: string;
}

export interface Claim {
  id: string;
  itemId: string;
  claimantId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
  smsEnabled?: boolean;
}

export interface ItemRequest {
  title: string;
  description: string;
  category: string;
  location: string;
  date: string;
  imageUrl?: string;
  thumbnailUrl?: string;
}

export interface SearchParams {
  q?: string;
  category?: string;
  location?: string;
  from?: string;
  to?: string;
  type?: 'lost' | 'found';
}

export interface ApiError {
  error: string;
  detail?: string;
  fields?: string[];
}

export const CATEGORIES = [
  'Electronics',
  'Clothing',
  'Accessories',
  'Documents',
  'Keys',
  'Pets',
  'Bags',
  'Wallets',
  'Jewelry',
  'Other'
] as const;

export type Category = typeof CATEGORIES[number];