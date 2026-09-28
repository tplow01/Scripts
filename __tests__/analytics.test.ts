import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { ANALYTICS_EVENTS } from '@/lib/analyticsEvents'

describe('ANALYTICS_EVENTS', () => {
  it('lists the 13 events in funnel order, with purchase last', () => {
    expect(ANALYTICS_EVENTS).toEqual([
      'click_to_start', 'inventory_shortcut', 'npc_interaction', 'karl_interaction',
      'vinyl_interaction', 'basement_discovered', 'inventory_view', 'basement_view',
      'product_click_inventory', 'product_click_basement', 'add_to_cart',
      'checkout_started', 'purchase',
    ])
  })

  it('matches the migration\'s CHECK constraint exactly (update both if this ever fails)', () => {
    // Hand-copied from supabase/migrations/0007_analytics_events.sql's
    // `event text not null check (event in (...))` list. If you change the
    // event list, update both this array and the migration.
    const sqlCheckConstraintList = [
      'click_to_start', 'inventory_shortcut', 'npc_interaction',
      'karl_interaction', 'vinyl_interaction', 'basement_discovered',
      'inventory_view', 'basement_view', 'product_click_inventory',
      'product_click_basement', 'add_to_cart', 'checkout_started', 'purchase',
    ]
    expect(ANALYTICS_EVENTS).toEqual(sqlCheckConstraintList)
  })
})

describe('track / getAnalyticsSessionId', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    window.localStorage.clear()
    fetchMock.mockReset().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    // The module memoizes the session id in a module-level variable, so each
    // test needs a fresh module instance to observe fresh behavior.
    vi.resetModules()
  })
  afterEach(() => vi.unstubAllGlobals())

  it('creates a session id once and persists it', async () => {
    const { getAnalyticsSessionId } = await import('@/lib/analytics')
    const first = getAnalyticsSessionId()
    const second = getAnalyticsSessionId()
    expect(first).toBe(second)
    expect(first.length).toBeGreaterThanOrEqual(8)
    expect(window.localStorage.getItem('scripts-analytics-sid')).toBe(first)
  })

  it('posts the event with sessionId, deviceType and path, using keepalive', async () => {
    const { track } = await import('@/lib/analytics')
    track('click_to_start')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/analytics/track',
      expect.objectContaining({
        method: 'POST',
        keepalive: true,
        body: expect.stringContaining('"event":"click_to_start"'),
      }),
    )
  })

  it('never throws, even if fetch rejects', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))
    const { track } = await import('@/lib/analytics')
    expect(() => track('add_to_cart')).not.toThrow()
  })

  it('returns the SAME id from repeated calls even when localStorage throws on every access', async () => {
    const getSpy = vi.spyOn(window.localStorage.__proto__, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })
    const setSpy = vi.spyOn(window.localStorage.__proto__, 'setItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })
    const { getAnalyticsSessionId } = await import('@/lib/analytics')
    const first = getAnalyticsSessionId()
    const second = getAnalyticsSessionId()
    expect(first).toBe(second)
    getSpy.mockRestore()
    setSpy.mockRestore()
  })

  it('never throws even when both crypto.randomUUID and localStorage are unavailable', async () => {
    const getSpy = vi.spyOn(window.localStorage.__proto__, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })
    const setSpy = vi.spyOn(window.localStorage.__proto__, 'setItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })
    const originalRandomUUID = crypto.randomUUID
    // @ts-expect-error -- simulating an environment without randomUUID
    crypto.randomUUID = undefined

    const { getAnalyticsSessionId } = await import('@/lib/analytics')
    let first = ''
    let second = ''
    expect(() => {
      first = getAnalyticsSessionId()
      second = getAnalyticsSessionId()
    }).not.toThrow()
    expect(first).toBe(second)
    expect(first.length).toBeGreaterThan(0)

    crypto.randomUUID = originalRandomUUID
    getSpy.mockRestore()
    setSpy.mockRestore()
  })
})
