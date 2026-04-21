import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';
import type { LoginRequest, RegisterRequest } from '../types';

export const useAuth = () => {
  const navigate = useNavigate();
  const { login, logout, user, isAuthenticated, isAdmin, isLoading } = useAuthStore();

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (response) => {
      const { token, user } = response.data;
      login(token, user);
      navigate('/');
    },
    onError: (error: any) => {
      console.error('Login failed:', error);
    },
  });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (response) => {
      const { token, user } = response.data;
      login(token, user);
      navigate('/');
    },
    onError: (error: any) => {
      console.error('Registration failed:', error);
    },
  });

  const handleLogin = useCallback((data: LoginRequest) => {
    loginMutation.mutate(data);
  }, [loginMutation]);

  const handleRegister = useCallback((data: RegisterRequest) => {
    registerMutation.mutate(data);
  }, [registerMutation]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  return {
    user,
    isAuthenticated,
    isAdmin,
    isLoading,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    loginMutation,
    registerMutation,
  };
};

export const useRequireAuth = () => {
  const { isAuthenticated, isLoading } = useAuthStore();
  const navigate = useNavigate();

  if (!isLoading && !isAuthenticated) {
    navigate('/login');
  }

  return { isAuthenticated, isLoading };
};

export const useRequireAdmin = () => {
  const { isAuthenticated, isAdmin, isLoading } = useAuthStore();
  const navigate = useNavigate();

  if (!isLoading && (!isAuthenticated || !isAdmin)) {
    navigate(isAuthenticated ? '/' : '/login');
  }

  return { isAuthenticated, isAdmin, isLoading };
};