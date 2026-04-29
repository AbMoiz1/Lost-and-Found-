import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import LoadingSpinner from '../components/LoadingSpinner';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  phone: z.string().optional(),
  smsEnabled: z.boolean().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { smsEnabled: false },
  });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (response) => {
      const { token, user } = response.data;
      login(token, user);
      navigate('/');
    },
  });

  const onSubmit = (data: RegisterForm) => {
    const { confirmPassword, ...payload } = data;
    registerMutation.mutate(payload);
  };

  const fieldStyle = { marginBottom: '1rem' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '0.4rem' };
  const errStyle: React.CSSProperties = { marginTop: '0.25rem', fontSize: '0.8rem', color: '#dc2626' };

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
        <div style={{ position: 'absolute', top: '-6rem', left: '-6rem', width: '22rem', height: '22rem', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: '-4rem', right: '-4rem', width: '18rem', height: '18rem', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />

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
            Join the Lost &<br />Found community
          </h1>
          <p className="fade-in-up delay-2" style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.1rem', lineHeight: 1.6, maxWidth: '28rem' }}>
            Create your account to report lost items, claim found belongings, and help others in your community.
          </p>

          <div className="fade-in-up delay-3" style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { icon: '🔍', text: 'Smart matching connects lost items with found reports' },
              { icon: '🔔', text: 'Real-time notifications when matches are found' },
              { icon: '🤝', text: 'Secure claim process with admin verification' },
            ].map(f => (
              <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.25rem' }}>{f.icon}</span>
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.95rem' }}>{f.text}</span>
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
        padding: '2rem 3rem',
        background: 'var(--gray-50)',
        overflowY: 'auto',
      }}>
        <div style={{ width: '100%', maxWidth: '24rem' }}>
          <h2 className="fade-in-up" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '0.5rem' }}>
            Create account
          </h2>
          <p className="fade-in-up delay-1" style={{ color: 'var(--gray-500)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            Fill in your details to get started
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="fade-in-up delay-2">
            <div style={fieldStyle}>
              <label style={labelStyle}>Display Name</label>
              <input {...register('name')} type="text" className="input" placeholder="Your name" />
              {errors.name && <p style={errStyle}>{errors.name.message}</p>}
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Email address</label>
              <input {...register('email')} type="email" className="input" placeholder="you@example.com" />
              {errors.email && <p style={errStyle}>{errors.email.message}</p>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', ...fieldStyle }}>
              <div>
                <label style={labelStyle}>Password</label>
                <input {...register('password')} type="password" className="input" placeholder="8+ characters" />
                {errors.password && <p style={errStyle}>{errors.password.message}</p>}
              </div>
              <div>
                <label style={labelStyle}>Confirm</label>
                <input {...register('confirmPassword')} type="password" className="input" placeholder="Repeat" />
                {errors.confirmPassword && <p style={errStyle}>{errors.confirmPassword.message}</p>}
              </div>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Phone (optional)</label>
              <input {...register('phone')} type="tel" className="input" placeholder="+1 (555) 000-0000" />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <input {...register('smsEnabled')} type="checkbox" id="smsEnabled" style={{ accentColor: 'var(--orange-500)' }} />
              <label htmlFor="smsEnabled" style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>Enable SMS notifications for matches</label>
            </div>

            {registerMutation.error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
                <p style={{ fontSize: '0.85rem', color: '#dc2626' }}>
                  {(registerMutation.error as any)?.response?.data?.error || 'Registration failed. Please try again.'}
                </p>
              </div>
            )}

            <button type="submit" disabled={registerMutation.isPending} className="btn btn-primary" style={{ width: '100%' }}>
              {registerMutation.isPending ? (
                <><LoadingSpinner size="sm" className="mr-2" />Creating account...</>
              ) : 'Create Account'}
            </button>
          </form>

          <p className="fade-in-up delay-3" style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--gray-500)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--orange-600)', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
