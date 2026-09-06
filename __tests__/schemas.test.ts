import { describe, it, expect } from 'vitest'

import { ALL_PRODUCTS } from '@/lib/products'
import {
  cartResolveSchema,
  newsletterSchema,
  orderStatusSchema,
  productSchema,
  publishToggleSchema,
} from '@/lib/schemas/product'

describe('productSchema', () => {
  it('accepts every product the app already ships', () => {
    for (const product of ALL_PRODUCTS) {
      expect(productSchema.safeParse(product).success).toBe(true)
    }
  })

  it('rejects a slug that is not url-safe', () => {
    const bad = { ...ALL_PRODUCTS[0], slug: 'Anxiety White!' }
    expect(productSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects an unknown published status', () => {
    const bad = { ...ALL_PRODUCTS[0], publishedStatus: 'live' }
    expect(productSchema.safeParse(bad).success).toBe(false)
  })

  it('requires isBasement — the flag must never default silently', () => {
    const { isBasement: _omitted, ...withoutFlag } = ALL_PRODUCTS[0]
    expect(productSchema.safeParse(withoutFlag).success).toBe(false)
  })

  it('rejects a negative price', () => {
    const product = ALL_PRODUCTS[0]
    const bad = {
      ...product,
      variants: [{ ...product.variants[0], price: -1 }],
    }
    expect(productSchema.safeParse(bad).success).toBe(false)
  })
})

describe('request schemas', () => {
  it('accepts a well-formed cart', () => {
    const parsed = cartResolveSchema.safeParse({
      items: [{ variantId: 'v1', quantity: 2 }],
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects a zero or fractional quantity', () => {
    expect(cartResolveSchema.safeParse({ items: [{ variantId: 'v1', quantity: 0 }] }).success).toBe(false)
    expect(cartResolveSchema.safeParse({ items: [{ variantId: 'v1', quantity: 1.5 }] }).success).toBe(false)
  })

  it('rejects a malformed email', () => {
    expect(newsletterSchema.safeParse({ email: 'nope' }).success).toBe(false)
    expect(newsletterSchema.safeParse({ email: 'a@b.co' }).success).toBe(true)
  })

  it('constrains order status and publish toggle to known values', () => {
    expect(orderStatusSchema.safeParse({ status: 'shipped' }).success).toBe(true)
    expect(orderStatusSchema.safeParse({ status: 'lost' }).success).toBe(false)
    expect(publishToggleSchema.safeParse({ publishedStatus: 'active' }).success).toBe(true)
    expect(publishToggleSchema.safeParse({ publishedStatus: 'public' }).success).toBe(false)
  })
})
