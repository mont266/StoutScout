// vitest.setup.ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock the window.matchMedia API for jsdom environment.
// This is necessary for components that use hooks like useIsDesktop.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock URL.createObjectURL which is not implemented in JSDOM.
// This is crucial for tests involving file previews (e.g., image cropper).
if (typeof window.URL.createObjectURL === 'undefined') {
  Object.defineProperty(window.URL, 'createObjectURL', {
    writable: true,
    value: vi.fn().mockReturnValue('blob:http://localhost/mock-blob-url'),
  });
}
