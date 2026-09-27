import { vi } from 'vitest'

// Mock server-only to allow testing server modules
vi.mock('server-only', () => ({}))
