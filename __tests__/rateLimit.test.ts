// @vitest-environment node
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { checkRateLimit } from '@/lib/server/rateLimit'

describe('checkRateLimit', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('allows up to the limit, then refuses', () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit('1.2.3.4', { limit: 5, windowMs: 60_000 })).toBe(true)
    }
    expect(checkRateLimit('1.2.3.4', { limit: 5, windowMs: 60_000 })).toBe(false)
  })

  it('tracks keys independently', () => {
    for (let i = 0; i < 5; i++) checkRateLimit('a', { limit: 5, windowMs: 60_000 })
    expect(checkRateLimit('b', { limit: 5, windowMs: 60_000 })).toBe(true)
  })

  it('resets once the window has passed', () => {
    for (let i = 0; i < 5; i++) checkRateLimit('c', { limit: 5, windowMs: 1_000 })
    expect(checkRateLimit('c', { limit: 5, windowMs: 1_000 })).toBe(false)
    vi.advanceTimersByTime(1_001)
    expect(checkRateLimit('c', { limit: 5, windowMs: 1_000 })).toBe(true)
  })
})
