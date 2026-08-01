import { describe, expect, it } from 'vitest'
import { abbreviate, cartesian, generateSku, reconcileVariants, variantTitle } from '@/lib/admin/variants'
import type { ProductOption, ProductVariant } from '@/types/product'

describe('abbreviate', () => {
  it('uppercases and takes the first three alphanumerics', () => {
    expect(abbreviate('White')).toBe('WHI')
    expect(abbreviate('Army Green')).toBe('ARM')
  })

  it('keeps short values whole', () => {
    expect(abbreviate('S')).toBe('S')
    expect(abbreviate('XL')).toBe('XL')
  })

  it('strips punctuation and spaces', () => {
    expect(abbreviate('are you okay?')).toBe('ARE')
    expect(abbreviate('  -- ')).toBe('X')
  })
})

describe('generateSku', () => {
  it('joins the root with abbreviated option values', () => {
    expect(generateSku('SCR-ANX', ['M', 'Army Green'], new Set())).toBe('SCR-ANX-M-ARM')
  })

  it('suffixes on collision', () => {
    const taken = new Set(['SCR-ANX-M-ARM'])
    expect(generateSku('SCR-ANX', ['M', 'Army Green'], taken)).toBe('SCR-ANX-M-ARM-2')
  })

  it('keeps suffixing until the sku is free', () => {
    const taken = new Set(['SCR-ANX-M-ARM', 'SCR-ANX-M-ARM-2'])
    expect(generateSku('SCR-ANX', ['M', 'Army Green'], taken)).toBe('SCR-ANX-M-ARM-3')
  })

  it('falls back to SCR when the root is blank', () => {
    expect(generateSku('', ['S'], new Set())).toBe('SCR-S')
  })
})

const SIZE: ProductOption = { name: 'Size', values: ['S', 'M'], position: 1 }
const COLOR: ProductOption = { name: 'Colorway', values: ['White', 'Black'], position: 2 }

const DEFAULTS = {
  price: 44, compareAtPrice: null, cost: null, barcode: null,
  trackInventory: true, allowBackorder: false, weightGrams: null,
}

describe('cartesian', () => {
  it('expands one axis', () => {
    expect(cartesian([SIZE])).toEqual([['S'], ['M']])
  })

  it('expands two axes with the first axis varying slowest', () => {
    expect(cartesian([SIZE, COLOR])).toEqual([
      ['S', 'White'], ['S', 'Black'], ['M', 'White'], ['M', 'Black'],
    ])
  })

  it('returns a single empty combination when there are no options', () => {
    expect(cartesian([])).toEqual([[]])
  })

  it('returns nothing when an axis has no values', () => {
    expect(cartesian([{ name: 'Size', values: [], position: 1 }])).toEqual([])
  })
})

describe('variantTitle', () => {
  it('joins option values with a slash', () => {
    expect(variantTitle(['M', 'Army Green'])).toBe('M / Army Green')
  })

  it('falls back to Default for an optionless product', () => {
    expect(variantTitle([])).toBe('Default')
  })
})

describe('reconcileVariants', () => {
  it('creates a variant per combination with generated skus', () => {
    const out = reconcileVariants('p1', 'SCR-ANX', [SIZE], [], DEFAULTS)
    expect(out).toHaveLength(2)
    expect(out.map((v) => v.sku)).toEqual(['SCR-ANX-S', 'SCR-ANX-M'])
    expect(out.map((v) => v.optionValues)).toEqual([['S'], ['M']])
    expect(out.every((v) => v.stock === 0 && v.price === 44 && v.productId === 'p1')).toBe(true)
    expect(out.map((v) => v.position)).toEqual([0, 1])
  })

  it('preserves stock, price and sku of variants that still exist', () => {
    const first = reconcileVariants('p1', 'SCR-ANX', [SIZE], [], DEFAULTS)
    const edited: ProductVariant[] = first.map((v) =>
      v.optionValues[0] === 'M' ? { ...v, stock: 12, price: 49, sku: 'CUSTOM-M' } : v)
    const widened = { ...SIZE, values: ['S', 'M', 'L'] }
    const out = reconcileVariants('p1', 'SCR-ANX', [widened], edited, DEFAULTS)

    const m = out.find((v) => v.optionValues[0] === 'M')
    expect(m).toMatchObject({ stock: 12, price: 49, sku: 'CUSTOM-M' })
  })

  it('adds new combinations at zero stock', () => {
    const first = reconcileVariants('p1', 'SCR-ANX', [SIZE], [], DEFAULTS)
    const widened = { ...SIZE, values: ['S', 'M', 'L'] }
    const out = reconcileVariants('p1', 'SCR-ANX', [widened], first, DEFAULTS)
    expect(out).toHaveLength(3)
    expect(out.find((v) => v.optionValues[0] === 'L')?.stock).toBe(0)
  })

  it('drops variants whose combination no longer exists', () => {
    const first = reconcileVariants('p1', 'SCR-ANX', [SIZE], [], DEFAULTS)
    const narrowed = { ...SIZE, values: ['S'] }
    const out = reconcileVariants('p1', 'SCR-ANX', [narrowed], first, DEFAULTS)
    expect(out.map((v) => v.optionValues[0])).toEqual(['S'])
  })

  it('never generates a duplicate sku across a two-axis product', () => {
    const out = reconcileVariants('p1', 'SCR-ANX', [SIZE, COLOR], [], DEFAULTS)
    expect(out).toHaveLength(4)
    expect(new Set(out.map((v) => v.sku)).size).toBe(4)
  })

  it('does not reuse a sku already held by a preserved variant', () => {
    const first = reconcileVariants('p1', 'SCR', [SIZE], [], DEFAULTS)
    // Force a collision: rename S's sku to what L would generate.
    const clashed = first.map((v) =>
      v.optionValues[0] === 'S' ? { ...v, sku: 'SCR-L' } : v)
    const widened = { ...SIZE, values: ['S', 'M', 'L'] }
    const out = reconcileVariants('p1', 'SCR', [widened], clashed, DEFAULTS)
    expect(out.find((v) => v.optionValues[0] === 'L')?.sku).toBe('SCR-L-2')
  })

  it('does not mutate the variants passed in', () => {
    const first = reconcileVariants('p1', 'SCR-ANX', [SIZE], [], DEFAULTS)
    const snapshot = JSON.parse(JSON.stringify(first))
    reconcileVariants('p1', 'SCR-ANX', [{ ...SIZE, values: ['S'] }], first, DEFAULTS)
    expect(first).toEqual(snapshot)
  })
})
