import { describe, expect, it, vi, beforeEach } from 'vitest'

const requireAdmin = vi.fn()
const getAnalyticsBundle = vi.fn()

vi.mock('@/lib/server/auth', () => ({ requireAdmin }))
vi.mock('@/lib/server/analytics.repo', () => ({ getAnalyticsBundle }))

beforeEach(() => {
  requireAdmin.mockReset().mockResolvedValue(null)
  getAnalyticsBundle.mockReset().mockResolvedValue({ visitorsByDay: [], topPages: [], deviceSplit: { mobile: 0, desktop: 0 }, funnel: [] })
})

describe('GET /api/admin/analytics', () => {
  it('is gated by requireAdmin', async () => {
    requireAdmin.mockResolvedValue(new Response(null, { status: 401 }))
    const { GET } = await import('@/app/api/admin/analytics/route')
    const res = await GET(new Request('http://localhost/api/admin/analytics?days=14'))
    expect(res.status).toBe(401)
    expect(getAnalyticsBundle).not.toHaveBeenCalled()
  })

  it('defaults to 14 days when no query param is given', async () => {
    const { GET } = await import('@/app/api/admin/analytics/route')
    await GET(new Request('http://localhost/api/admin/analytics'))
    expect(getAnalyticsBundle).toHaveBeenCalledWith(14)
  })

  it('passes through a valid days value', async () => {
    const { GET } = await import('@/app/api/admin/analytics/route')
    await GET(new Request('http://localhost/api/admin/analytics?days=30'))
    expect(getAnalyticsBundle).toHaveBeenCalledWith(30)
  })

  it('falls back to 14 for an invalid days value', async () => {
    const { GET } = await import('@/app/api/admin/analytics/route')
    await GET(new Request('http://localhost/api/admin/analytics?days=999'))
    expect(getAnalyticsBundle).toHaveBeenCalledWith(14)
  })
})
