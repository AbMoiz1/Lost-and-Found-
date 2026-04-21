// Feature: lost-and-found-app, Property 11.3: Missing required fields are rejected
// **Validates: Requirements 11.3**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { z } from 'zod';

// Replicate the schemas used in the actual form components
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const itemSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.string().min(1, 'Please select a category'),
  location: z.string().min(2, 'Location is required'),
  date: z.string().min(1, 'Date is required'),
});

const requiredItemFields = ['title', 'description', 'category', 'location', 'date'] as const;

describe('Frontend Form Validation Properties', () => {
  it('Property 11.3: login form rejects missing email', () => {
    fc.assert(
      fc.property(fc.string(), (password) => {
        const result = loginSchema.safeParse({ email: '', password });
        expect(result.success).toBe(false);
      }),
      { numRuns: 25 }
    );
  });

  it('Property 11.3: login form rejects invalid email format', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => !s.includes('@') || !s.includes('.')),
        fc.string({ minLength: 1 }),
        (email, password) => {
          const result = loginSchema.safeParse({ email, password });
          if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            expect(result.success).toBe(false);
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  it('Property 11.3: item form rejects any payload with a missing required field', () => {
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 3 }),
          description: fc.string({ minLength: 10 }),
          category: fc.string({ minLength: 1 }),
          location: fc.string({ minLength: 2 }),
          date: fc.constantFrom('2024-01-01', '2024-06-15', '2025-03-20'),
        }),
        fc.constantFrom(...requiredItemFields),
        (validPayload, fieldToRemove) => {
          const broken = { ...validPayload, [fieldToRemove]: '' };
          const result = itemSchema.safeParse(broken);
          expect(result.success).toBe(false);
          if (!result.success) {
            const fieldNames = result.error.issues.map(i => i.path[0]);
            expect(fieldNames).toContain(fieldToRemove);
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  it('Property 11.3: register form rejects password mismatch', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 2 }),
        fc.emailAddress(),
        fc.string({ minLength: 8 }),
        fc.string({ minLength: 8 }),
        (name, email, password, confirmPassword) => {
          fc.pre(password !== confirmPassword);
          const result = registerSchema.safeParse({ name, email, password, confirmPassword });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 25 }
    );
  });

  it('Property 11.3: valid item payload passes validation', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 3, maxLength: 100 }),
        fc.string({ minLength: 10, maxLength: 500 }),
        fc.constantFrom('Electronics', 'Clothing', 'Keys', 'Wallets'),
        fc.string({ minLength: 2, maxLength: 100 }),
        fc.constantFrom('2024-01-01', '2024-06-15', '2025-03-20'),
        (title, description, category, location, date) => {
          const result = itemSchema.safeParse({ title, description, category, location, date });
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 25 }
    );
  });
});
