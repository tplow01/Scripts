import { describe, expect, it } from 'vitest'
import { ALL_PRODUCTS } from '@/lib/products'
import { buildLegacyIndex, buildVariantIndex, parseStoredCart } from '@/lib/cartStorage'

const index = buildVariantIndex(ALL_PRODUCTS)
const legacy = buildLegacyIndex(ALL_PRODUCTS)

describe('buildVariantIndex', () => {
  it('indexes every variant of every product', () => {
    expect(index.size).toBe(ALL_PRODUCTS.reduce((n, p) => n + p.variants.length, 0))
  })

  it('resolves a variant back to its product', () => {
    const anxiety = ALL_PRODUCTS.find((p) => p.slug === 'anxiety-white')!
    expect(index.get(anxiety.variants[0].id)?.product.slug).toBe('anxiety-white')
  })
})

describe('parseStoredCart', () => {
  it('returns nothing for null or junk', () => {
    expect(parseStoredCart(null, index, legacy)).toEqual([])
    expect(parseStoredCart('not json', index, legacy)).toEqual([])
    expect(parseStoredCart('{}', index, legacy)).toEqual([])
  })

  it('keeps valid v3 entries', () => {
    const anxiety = ALL_PRODUCTS.find((p) => p.slug === 'anxiety-white')!
    const vid = anxiety.variants[0].id
    const raw = JSON.stringify([{ variantId: vid, quantity: 2 }])
    expect(parseStoredCart(raw, index, legacy)).toEqual([{ variantId: vid, quantity: 2 }])
  })

  it('drops entries for unknown variants and non-positive quantities', () => {
    const anxiety = ALL_PRODUCTS.find((p) => p.slug === 'anxiety-white')!
    const raw = JSON.stringify([
      { variantId: 'gone', quantity: 1 },
      { variantId: anxiety.variants[0].id, quantity: 0 },
    ])
    expect(parseStoredCart(raw, index, legacy)).toEqual([])
  })

  it('migrates a legacy {id,size} entry to a variant id', () => {
    const raw = JSON.stringify([{ id: '1', size: 'M', quantity: 3 }])
    const out = parseStoredCart(raw, index, legacy)
    expect(out).toHaveLength(1)
    expect(out[0].quantity).toBe(3)
    const ref = index.get(out[0].variantId)!
    expect(ref.product.slug).toBe('anxiety-white')
    expect(ref.variant.optionValues).toContain('M')
  })

  it('drops a legacy entry whose product no longer exists', () => {
    const raw = JSON.stringify([{ id: 'nope', size: 'M', quantity: 1 }])
    expect(parseStoredCart(raw, index, legacy)).toEqual([])
  })

  it('drops a legacy entry whose size no longer exists', () => {
    const raw = JSON.stringify([{ id: '1', size: 'XXL', quantity: 1 }])
    expect(parseStoredCart(raw, index, legacy)).toEqual([])
  })
})
