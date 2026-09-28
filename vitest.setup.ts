import { vi } from 'vitest'

// Mock server-only to allow testing server modules
// Trade-off (deliberate, reviewed — see the SDD ledger for Tasks 2/3): mocking
// `server-only` globally means the server/client import boundary it normally
// enforces (throwing if a `server-only`-guarded module is value-imported into
// client code) is never checked under test, repo-wide. Accepted knowingly, not
// an oversight.
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
