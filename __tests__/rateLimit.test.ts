// @vitest-environment node
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { checkRateLimit, _debugBucketCount } from '@/lib/server/rateLimit'

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

  it('evicts an idle key from memory once its window has fully expired, even though nothing ever calls that key again', () => {
    checkRateLimit('idle-key', { limit: 5, windowMs: 1_000 })
    const countWithIdleKey = _debugBucketCount()
    expect(countWithIdleKey).toBeGreaterThan(0)

    vi.advanceTimersByTime(1_001)
    // 'idle-key' is never touched again — a DIFFERENT key's call must still
    // sweep it out of memory, or a one-shot caller's bucket would live forever.
    checkRateLimit('some-other-key', { limit: 5, windowMs: 1_000 })

    // some-other-key's own bucket is now present, but idle-key's should be gone,
    // so the total is back down to what it was before idle-key was ever added.
    expect(_debugBucketCount()).toBe(countWithIdleKey)
  })
})
