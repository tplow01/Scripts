import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Product, ProductVariant } from '@/types/product'

const { sessionsCreate, resolveVariants } = vi.hoisted(() => ({
  sessionsCreate: vi.fn(),
  resolveVariants: vi.fn(),
}))

vi.mock('@/lib/server/stripe', () => ({
  isStripeConfigured: () => true,
  stripe: () => ({ checkout: { sessions: { create: sessionsCreate } } }),
  toMinorUnits: (amount: number) => Math.round(amount * 100),
  fromMinorUnits: (amount: number) => amount / 100,
  CURRENCY: 'usd',
}))
vi.mock('@/lib/server/products.repo', () => ({ resolveVariants }))

import { POST } from '@/app/api/checkout/session/route'

function product(variant: Partial<ProductVariant>): Product {
  return {
    id: 'p1', name: 'Tee', slug: 'tee', emotion: '', description: '', collection: '',
    isBasement: false, productType: '', vendor: '', tags: [], publishedStatus: 'active',
    skuRoot: '', shipDate: '', requiresShipping: true, seo: { title: '', description: '' },
    options: [], media: [], fit: '', fabric: '', fabricWeight: '', modelNote: '', careInstructions: [],
    variants: [{
      id: 'v1', productId: 'p1', optionValues: [], sku: 'sku1', barcode: null, price: 10,
      compareAtPrice: null, cost: null, stock: 3, trackInventory: true, allowBackorder: false,
      weightGrams: null, imageId: null, position: 0, ...variant,
    }],
  }
}

function req(items: { variantId: string; quantity: number }[]) {
  return new Request('http://localhost/api/checkout/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://scripts.example.com' },
    body: JSON.stringify({ items }),
  })
}

describe('POST /api/checkout/session — stock across duplicate lines', () => {
  beforeEach(() => {
    sessionsCreate.mockReset().mockResolvedValue({ url: 'https://checkout.stripe.com/session/1' })
    resolveVariants.mockReset().mockResolvedValue([{ product: product({}), variantId: 'v1' }])
  })

  it('refuses two lines of one variant that together exceed its stock', async () => {
    // 2 + 2 = 4 against 3 in stock: each line alone would pass.
    const res = await POST(req([{ variantId: 'v1', quantity: 2 }, { variantId: 'v1', quantity: 2 }]))
    expect(res.status).toBe(409)
    expect(sessionsCreate).not.toHaveBeenCalled()
  })

  it('sends duplicate lines to Stripe as one line with the summed quantity', async () => {
    const res = await POST(req([{ variantId: 'v1', quantity: 1 }, { variantId: 'v1', quantity: 2 }]))
    expect(res.status).toBe(200)
    const { line_items } = sessionsCreate.mock.calls[0][0]
    expect(line_items).toHaveLength(1)
    expect(line_items[0].quantity).toBe(3)
  })

  it('still lets backorderable variants through regardless of stock', async () => {
    resolveVariants.mockResolvedValue([{ product: product({ allowBackorder: true, stock: 0 }), variantId: 'v1' }])
    const res = await POST(req([{ variantId: 'v1', quantity: 5 }, { variantId: 'v1', quantity: 5 }]))
    expect(res.status).toBe(200)
  })
})

describe('POST /api/checkout/session — flat pricing', () => {
  beforeEach(() => {
    sessionsCreate.mockReset().mockResolvedValue({ url: 'https://checkout.stripe.com/session/1' })
    resolveVariants.mockReset().mockResolvedValue([{ product: product({}), variantId: 'v1' }])
  })

  it('sends no shipping option, so Stripe shows no shipping row at all', async () => {
    // A zero-cost rate is rendered by Stripe as "Free" next to its label,
    // which contradicts "included". The only way to say nothing is to send
    // nothing: the price already covers shipping.
    const res = await POST(req([{ variantId: 'v1', quantity: 1 }]))
    expect(res.status).toBe(200)
    const params = sessionsCreate.mock.calls[0][0]
    expect(params.shipping_options).toBeUndefined()
    // The address is still collected: the shirt has to go somewhere.
    expect(params.shipping_address_collection.allowed_countries).toContain('US')
  })
})
