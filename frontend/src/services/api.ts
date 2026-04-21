import axios, { type AxiosResponse } from 'axios';
import type { 
  AuthResponse, 
  LoginRequest, 
  RegisterRequest, 
  Item, 
  ItemRequest, 
  SearchParams, 
  Match, 
  Claim, 
  User 
} from '../types';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token is invalid or expired
      const authStore = useAuthStore.getState();
      authStore.logout();
      
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (data: LoginRequest): Promise<AxiosResponse<AuthResponse>> =>
    api.post('/auth/login', data),
  
  register: (data: RegisterRequest): Promise<AxiosResponse<AuthResponse>> =>
    api.post('/auth/register', data),
  
  requestPasswordReset: (email: string): Promise<AxiosResponse<void>> =>
    api.post('/auth/password-reset/request', { email }),
  
  confirmPasswordReset: (token: string, password: string): Promise<AxiosResponse<void>> =>
    api.post('/auth/password-reset/confirm', { token, password }),
};

export const itemsApi = {
  createLostItem: (data: ItemRequest): Promise<AxiosResponse<Item>> =>
    api.post('/items/lost', data),
  
  createFoundItem: (data: ItemRequest): Promise<AxiosResponse<Item>> =>
    api.post('/items/found', data),
  
  getItem: (id: string): Promise<AxiosResponse<Item & { matches?: Match[] }>> =>
    api.get(`/items/${id}`),
  
  updateItem: (id: string, data: Partial<ItemRequest>): Promise<AxiosResponse<Item>> =>
    api.put(`/items/${id}`, data),
  
  deleteItem: (id: string): Promise<AxiosResponse<void>> =>
    api.delete(`/items/${id}`),
  
  createClaim: (itemId: string): Promise<AxiosResponse<Claim>> =>
    api.post(`/items/${itemId}/claim`),
  
  getPendingClaims: (): Promise<AxiosResponse<Claim[]>> =>
    api.get('/items/claims/pending'),
  
  updateClaim: (claimId: string, status: 'approved' | 'rejected'): Promise<AxiosResponse<Claim>> =>
    api.put(`/items/claims/${claimId}`, { status }),

  getMyItems: (): Promise<AxiosResponse<Item[]>> =>
    api.get('/items/my'),

  getMyClaims: (): Promise<AxiosResponse<Claim[]>> =>
    api.get('/items/claims/my'),
};

export const searchApi = {
  searchItems: (params: SearchParams): Promise<AxiosResponse<Item[]>> =>
    api.get('/search/items', { params }),
};

export const imagesApi = {
  uploadImage: (file: File): Promise<AxiosResponse<{ originalUrl: string; thumbnailUrl: string }>> => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/images/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  deleteImage: (imageId: string): Promise<AxiosResponse<void>> =>
    api.delete(`/images/${imageId}`),
};

export const adminApi = {
  getDashboard: (): Promise<AxiosResponse<{
    totalUsers: number;
    totalItems: number;
    totalMatches: number;
    totalClaims: number;
  }>> =>
    api.get('/admin/dashboard'),
  
  searchUsers: (query: string): Promise<AxiosResponse<User[]>> =>
    api.get('/admin/users', { params: { q: query } }),
  
  deactivateUser: (userId: string): Promise<AxiosResponse<void>> =>
    api.put(`/admin/users/${userId}/deactivate`),
  
  deleteItem: (itemId: string): Promise<AxiosResponse<void>> =>
    api.delete(`/admin/items/${itemId}`),
  
  getPendingClaims: (): Promise<AxiosResponse<Claim[]>> =>
    api.get('/admin/claims'),
};

export default api;