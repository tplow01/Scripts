import { describe, expect, it, vi, beforeEach } from 'vitest'

const recordEvent = vi.fn()

vi.mock('@/lib/server/supabase', () => ({ isDatabaseConfigured: () => true }))
vi.mock('@/lib/server/analytics.repo', () => ({ recordEvent }))

function req(body: unknown, opts: { ip?: string; ua?: string } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (opts.ip) headers['x-forwarded-for'] = opts.ip
  if (opts.ua) headers['user-agent'] = opts.ua
  return new Request('http://localhost/api/analytics/track', { method: 'POST', headers, body: JSON.stringify(body) })
}

const validBody = { event: 'click_to_start', sessionId: 'a-real-session-id', deviceType: 'mobile', path: '/' }

beforeEach(() => {
  recordEvent.mockReset().mockResolvedValue(undefined)
})

describe('POST /api/analytics/track', () => {
  it('records a valid event and returns 204', async () => {
    const { POST } = await import('@/app/api/analytics/track/route')
    const res = await POST(req(validBody, { ip: '1.1.1.1' }))
    expect(res.status).toBe(204)
    expect(recordEvent).toHaveBeenCalledWith({
      event: 'click_to_start', sessionId: 'a-real-session-id', deviceType: 'mobile', path: '/', meta: undefined,
    })
  })

  it('rejects purchase with 422 and never records it', async () => {
    const { POST } = await import('@/app/api/analytics/track/route')
    const res = await POST(req({ ...validBody, event: 'purchase' }, { ip: '2.2.2.2' }))
    expect(res.status).toBe(422)
    expect(recordEvent).not.toHaveBeenCalled()
  })

  it('rejects a malformed body with 422', async () => {
    const { POST } = await import('@/app/api/analytics/track/route')
    const res = await POST(req({ event: 'not-a-real-event' }, { ip: '3.3.3.3' }))
    expect(res.status).toBe(422)
  })

  it('204s a known bot without recording it', async () => {
    const { POST } = await import('@/app/api/analytics/track/route')
    const res = await POST(req(validBody, { ip: '4.4.4.4', ua: 'Googlebot/2.1' }))
    expect(res.status).toBe(204)
    expect(recordEvent).not.toHaveBeenCalled()
  })

  it('rate limits the 61st request from one IP within a minute', async () => {
    const { POST } = await import('@/app/api/analytics/track/route')
    for (let i = 0; i < 60; i++) {
      const res = await POST(req(validBody, { ip: '5.5.5.5' }))
      expect(res.status).toBe(204)
    }
    const res = await POST(req(validBody, { ip: '5.5.5.5' }))
    expect(res.status).toBe(429)
  })

  it('never lets a repo failure throw past the route', async () => {
    recordEvent.mockRejectedValue(new Error('db down'))
    const { POST } = await import('@/app/api/analytics/track/route')
    const res = await POST(req(validBody, { ip: '6.6.6.6' }))
    expect(res.status).toBe(204)
  })
})
