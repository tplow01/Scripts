// __tests__/checkoutAnalytics.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { checkoutSessionSchema } from '@/lib/schemas/product'
import type { Product } from '@/types/product'

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

const { sessionsCreate, resolveVariants } = vi.hoisted(() => ({
  sessionsCreate: vi.fn(),
  resolveVariants: vi.fn(),
}))

describe('POST /api/checkout/session — analytics_session_id metadata', () => {
  vi.mock('@/lib/server/stripe', () => ({
    isStripeConfigured: () => true,
    stripe: () => ({ checkout: { sessions: { create: sessionsCreate } } }),
    toMinorUnits: (amount: number) => Math.round(amount * 100),
    fromMinorUnits: (amount: number) => amount / 100,
    CURRENCY: 'usd',
  }))
  vi.mock('@/lib/server/products.repo', () => ({ resolveVariants }))

  const product: Product = {
    id: 'p1', name: 'Tee', slug: 'tee', emotion: '', description: '', collection: '',
    isBasement: false, productType: '', vendor: '', tags: [], publishedStatus: 'active',
    skuRoot: '', shipDate: '', requiresShipping: true, seo: { title: '', description: '' },
    options: [], media: [], fit: '', fabric: '', fabricWeight: '', modelNote: '', careInstructions: [],
    variants: [{
      id: 'v1', productId: 'p1', optionValues: [], sku: 'sku1', barcode: null, price: 10,
      compareAtPrice: null, cost: null, stock: 10, trackInventory: false, allowBackorder: false,
      weightGrams: null, imageId: null, position: 0,
    }],
  }

  beforeEach(() => {
    sessionsCreate.mockReset().mockResolvedValue({ url: 'https://checkout.stripe.com/session/1' })
    resolveVariants.mockReset().mockResolvedValue([{ product, variantId: 'v1' }])
  })

  function req(body: unknown) {
    return new Request('http://localhost/api/checkout/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://scripts.example.com' },
      body: JSON.stringify(body),
    })
  }

  it('includes metadata.analytics_session_id when the client sends one', async () => {
    const { POST } = await import('@/app/api/checkout/session/route')
    const res = await POST(req({
      items: [{ variantId: 'v1', quantity: 1 }],
      analyticsSessionId: 'a-real-session-id',
    }))
    expect(res.status).toBe(200)
    expect(sessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { analytics_session_id: 'a-real-session-id' } }),
    )
  })

  it('omits metadata entirely when no analyticsSessionId is sent', async () => {
    const { POST } = await import('@/app/api/checkout/session/route')
    const res = await POST(req({ items: [{ variantId: 'v1', quantity: 1 }] }))
    expect(res.status).toBe(200)
    expect(sessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: undefined }),
    )
  })
})
