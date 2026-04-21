import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Set React act environment flag for React 19
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Mock localStorage for tests
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock the entire auth store module to prevent persistence issues
vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn(),
}));
