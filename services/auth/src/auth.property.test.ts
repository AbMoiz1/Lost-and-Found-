// Feature: lost-and-found-app, Property 1, Property 2
import * as fc from 'fast-check';
import bcrypt from 'bcrypt';
import { signToken, verifyToken } from './jwt';

// Set JWT_SECRET for tests
beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-for-property-tests';
  process.env.JWT_EXPIRY = '1h';
});

/**
 * Property 1: Password hashing is irreversible
 * For any plaintext, hash ≠ plaintext and verify(plaintext, hash) = true
 * Validates: Requirements 1.6
 */
describe('Property 1: Password hashing is irreversible', () => {
  it(
    'hash never equals plaintext and bcrypt.compare returns true for correct input',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 8, maxLength: 64 }).filter((s) => s.trim().length >= 8),
          async (plaintext) => {
            const hash = await bcrypt.hash(plaintext, 10);
            // Hash must not equal plaintext
            expect(hash).not.toBe(plaintext);
            // Correct plaintext must verify
            const correct = await bcrypt.compare(plaintext, hash);
            expect(correct).toBe(true);
            // Any other string must not verify
            const wrong = await bcrypt.compare(plaintext + '_wrong', hash);
            expect(wrong).toBe(false);
          },
        ),
        { numRuns: 20 }, // bcrypt is slow; 20 runs is sufficient
      );
    },
    60000, // 60s timeout for bcrypt-heavy property test
  );
});

/**
 * Property 2: JWT claims round-trip
 * sign then decode produces same userId and role
 * Validates: Requirements 1.2
 */
describe('Property 2: JWT claims round-trip', () => {
  it('decoded JWT payload matches original userId and role', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 3, maxLength: 50 }),
        fc.constantFrom('user', 'admin'),
        (userId, email, role) => {
          const token = signToken({ sub: userId, email, role });
          const decoded = verifyToken(token);
          expect(decoded.sub).toBe(userId);
          expect(decoded.role).toBe(role);
          expect(decoded.email).toBe(email);
        },
      ),
      { numRuns: 100 },
    );
  });
});
