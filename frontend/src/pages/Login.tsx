import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import LoadingSpinner from '../components/LoadingSpinner';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (response) => {
      const { token, user } = response.data;
      login(token, user);
      navigate('/');
    },
  });

  const onSubmit = (data: LoginForm) => loginMutation.mutate(data);

  return (
    <div style={{ minHeight: 'calc(100vh - 4rem)', display: 'flex' }}>
      {/* Left panel — branding */}
      <div className="slide-in-left" style={{
        flex: 1,
        background: 'linear-gradient(135deg, var(--orange-600) 0%, var(--orange-500) 50%, #f59e0b 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '3rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: '-5rem', right: '-5rem', width: '20rem', height: '20rem', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ position: 'absolute', bottom: '-8rem', left: '-4rem', width: '24rem', height: '24rem', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="fade-in-up" style={{
            width: '4rem', height: '4rem',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '2rem',
            backdropFilter: 'blur(8px)',
          }}>
            <span style={{ color: 'white', fontWeight: 800, fontSize: '1.1rem' }}>L&F</span>
          </div>
          <h1 className="fade-in-up delay-1" style={{ color: 'white', fontSize: '2.5rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '1rem' }}>
            Welcome back to<br />Lost & Found
          </h1>
          <p className="fade-in-up delay-2" style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.1rem', lineHeight: 1.6, maxWidth: '28rem' }}>
            Sign in to track your reported items, manage claims, and help reunite lost belongings with their owners.
          </p>
          <div className="fade-in-up delay-3" style={{ marginTop: '2.5rem', display: 'flex', gap: '2rem' }}>
            {[
              { num: '10K+', label: 'Items Reunited' },
              { num: '50K+', label: 'Active Users' },
              { num: '95%', label: 'Success Rate' },
            ].map(s => (
              <div key={s.label}>
                <p style={{ color: 'white', fontSize: '1.5rem', fontWeight: 800 }}>{s.num}</p>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="slide-in-right" style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem',
        background: 'var(--gray-50)',
      }}>
        <div style={{ width: '100%', maxWidth: '24rem' }}>
          <h2 className="fade-in-up" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '0.5rem' }}>
            Sign in
          </h2>
          <p className="fade-in-up delay-1" style={{ color: 'var(--gray-500)', marginBottom: '2rem', fontSize: '0.95rem' }}>
            Enter your credentials to access your account
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="fade-in-up delay-2">
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.4rem' }}>
                Email address
              </label>
              <input {...register('email')} type="email" className="input" placeholder="you@example.com" />
              {errors.email && <p style={{ marginTop: '0.25rem', fontSize: '0.8rem', color: '#dc2626' }}>{errors.email.message}</p>}
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.4rem' }}>
                Password
              </label>
              <input {...register('password')} type="password" className="input" placeholder="Enter your password" />
              {errors.password && <p style={{ marginTop: '0.25rem', fontSize: '0.8rem', color: '#dc2626' }}>{errors.password.message}</p>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
              <Link to="/forgot-password" style={{ fontSize: '0.85rem', color: 'var(--orange-600)', textDecoration: 'none', fontWeight: 500 }}>
                Forgot password?
              </Link>
            </div>

            {loginMutation.error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
                <p style={{ fontSize: '0.85rem', color: '#dc2626' }}>
                  {(loginMutation.error as any)?.response?.data?.error || 'Login failed. Please try again.'}
                </p>
              </div>
            )}

            <button type="submit" disabled={loginMutation.isPending} className="btn btn-primary" style={{ width: '100%' }}>
              {loginMutation.isPending ? (
                <><LoadingSpinner size="sm" className="mr-2" />Signing in...</>
              ) : 'Sign in'}
            </button>
          </form>

          <p className="fade-in-up delay-3" style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--gray-500)' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--orange-600)', textDecoration: 'none', fontWeight: 600 }}>Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
