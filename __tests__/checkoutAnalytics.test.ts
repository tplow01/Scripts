// __tests__/checkoutAnalytics.test.ts
import { describe, expect, it } from 'vitest'
import { checkoutSessionSchema } from '@/lib/schemas/product'

describe('checkoutSessionSchema', () => {
  it('accepts a cart with no analyticsSessionId (backward compatible)', () => {
    const result = checkoutSessionSchema.safeParse({ items: [{ variantId: 'v1', quantity: 1 }] })
    expect(result.success).toBe(true)
  })

  it('accepts a cart with an analyticsSessionId', () => {
    const result = checkoutSessionSchema.safeParse({
      items: [{ variantId: 'v1', quantity: 1 }],
      analyticsSessionId: 'a-real-session-id',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an analyticsSessionId that is too short', () => {
    const result = checkoutSessionSchema.safeParse({
      items: [{ variantId: 'v1', quantity: 1 }],
      analyticsSessionId: 'x',
    })
    expect(result.success).toBe(false)
  })
})
