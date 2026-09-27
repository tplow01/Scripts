import { vi } from 'vitest'

// Mock server-only to allow testing server modules
vi.mock('server-only', () => ({}))

// Polyfill matchMedia for jsdom
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  } as MediaQueryList)
}
