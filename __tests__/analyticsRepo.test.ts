import { describe, expect, it, vi, beforeEach } from 'vitest'

const insert = vi.fn()
const rpc = vi.fn()

vi.mock('@/lib/server/supabase', () => ({
  isDatabaseConfigured: () => true,
  serverClient: () => ({
    from: () => ({ insert }),
    rpc,
  }),
}))

beforeEach(() => {
  insert.mockReset().mockResolvedValue({ error: null })
  rpc.mockReset()
})

describe('recordEvent', () => {
  it('inserts the row with all fields', async () => {
    const { recordEvent } = await import('@/lib/server/analytics.repo')
    await recordEvent({ event: 'add_to_cart', sessionId: 's1', deviceType: 'mobile', path: '/inventory', meta: { productId: 'p1' } })
    expect(insert).toHaveBeenCalledWith({
      session_id: 's1', event: 'add_to_cart', device_type: 'mobile', path: '/inventory', meta: { productId: 'p1' },
    })
  })

  it('defaults meta to an empty object', async () => {
    const { recordEvent } = await import('@/lib/server/analytics.repo')
    await recordEvent({ event: 'purchase', sessionId: null, deviceType: null, path: null })
    expect(insert).toHaveBeenCalledWith({
      session_id: null, event: 'purchase', device_type: null, path: null, meta: {},
    })
  })

  it('throws on a database error, so the caller can decide how to log it', async () => {
    insert.mockResolvedValue({ error: { message: 'boom' } })
    const { recordEvent } = await import('@/lib/server/analytics.repo')
    await expect(
      recordEvent({ event: 'add_to_cart', sessionId: 's1', deviceType: 'mobile', path: '/' }),
    ).rejects.toThrow('boom')
  })
})

describe('getAnalyticsBundle', () => {
  it('shapes the four RPC results, converting device split to percentages that sum to 100', async () => {
    rpc.mockImplementation((fn: string) => {
      if (fn === 'analytics_visitors_by_day') return Promise.resolve({ data: [{ day: '2026-09-27', visitors: 5, page_views: 12 }], error: null })
      if (fn === 'analytics_top_pages') return Promise.resolve({ data: [{ path: '/inventory', views: 20 }], error: null })
      if (fn === 'analytics_device_split') return Promise.resolve({ data: [{ device_type: 'mobile', sessions: 3 }, { device_type: 'desktop', sessions: 1 }], error: null })
      if (fn === 'analytics_funnel') return Promise.resolve({ data: [{ event: 'click_to_start', sessions: 10 }], error: null })
      throw new Error(`unexpected rpc ${fn}`)
    })
    const { getAnalyticsBundle } = await import('@/lib/server/analytics.repo')
    const bundle = await getAnalyticsBundle(14)
    expect(bundle.visitorsByDay).toEqual([{ date: '2026-09-27', visitors: 5, pageViews: 12 }])
    expect(bundle.topPages).toEqual([{ path: '/inventory', views: 20 }])
    expect(bundle.deviceSplit).toEqual({ mobile: 75, desktop: 25 })
    expect(bundle.funnel).toEqual([{ event: 'click_to_start', sessions: 10 }])
  })

  it('device split is 0/0 with no sessions, never NaN', async () => {
    rpc.mockImplementation((fn: string) => {
      if (fn === 'analytics_device_split') return Promise.resolve({ data: [], error: null })
      return Promise.resolve({ data: [], error: null })
    })
    const { getAnalyticsBundle } = await import('@/lib/server/analytics.repo')
    const bundle = await getAnalyticsBundle(7)
    expect(bundle.deviceSplit).toEqual({ mobile: 0, desktop: 0 })
  })

  it('calls the visitors RPC with a fixed 60-day lookback regardless of the requested range', async () => {
    rpc.mockResolvedValue({ data: [], error: null })
    const { getAnalyticsBundle } = await import('@/lib/server/analytics.repo')
    await getAnalyticsBundle(7)
    expect(rpc).toHaveBeenCalledWith('analytics_visitors_by_day', { p_days: 60 })
    expect(rpc).toHaveBeenCalledWith('analytics_top_pages', { p_days: 7, p_limit: 5 })
    expect(rpc).toHaveBeenCalledWith('analytics_device_split', { p_days: 7 })
    expect(rpc).toHaveBeenCalledWith('analytics_funnel', { p_days: 7 })
  })
})
