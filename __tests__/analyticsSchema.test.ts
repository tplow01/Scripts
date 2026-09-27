import { describe, expect, it } from 'vitest'
import { trackEventSchema } from '@/lib/schemas/analytics'

describe('trackEventSchema', () => {
  it('accepts a well-formed client event', () => {
    const result = trackEventSchema.safeParse({
      event: 'click_to_start',
      sessionId: 'a-real-session-id',
      deviceType: 'mobile',
      path: '/',
    })
    expect(result.success).toBe(true)
  })

  it('rejects purchase — that name is server-only', () => {
    const result = trackEventSchema.safeParse({
      event: 'purchase',
      sessionId: 'a-real-session-id',
      deviceType: 'mobile',
      path: '/',
    })
    expect(result.success).toBe(false)
  })

  it('rejects an unknown event name', () => {
    const result = trackEventSchema.safeParse({
      event: 'made_up_event',
      sessionId: 'a-real-session-id',
      deviceType: 'mobile',
      path: '/',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a sessionId that is too short or too long', () => {
    expect(trackEventSchema.safeParse({ event: 'add_to_cart', sessionId: 'x', deviceType: 'mobile' }).success).toBe(false)
    expect(trackEventSchema.safeParse({ event: 'add_to_cart', sessionId: 'x'.repeat(65), deviceType: 'mobile' }).success).toBe(false)
  })

  it('rejects meta with more than 10 keys', () => {
    const meta = Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`k${i}`, 'v']))
    const result = trackEventSchema.safeParse({
      event: 'add_to_cart', sessionId: 'a-real-session-id', deviceType: 'mobile', meta,
    })
    expect(result.success).toBe(false)
  })

  it('accepts a missing path and missing meta', () => {
    const result = trackEventSchema.safeParse({ event: 'add_to_cart', sessionId: 'a-real-session-id', deviceType: 'desktop' })
    expect(result.success).toBe(true)
  })
})
