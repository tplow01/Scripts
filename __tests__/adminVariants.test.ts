import { describe, expect, it } from 'vitest'
import {
  abbreviate, addOption, addOptionValue, cartesian, deriveAvailability, generateSku, impactOfRemoval,
  reconcileVariants, removeOption, removeOptionValue, renameOptionValue, reorderOptionValues,
  totalStock, variantCount, variantTitle,
} from '@/lib/admin/variants'
import type { Product, ProductOption, ProductVariant } from '@/types/product'

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

const base = (over: Partial<Product> = {}): Product => ({
  id: 'p1', name: 'ANXIETY', slug: 'anxiety', emotion: 'ANXIETY',
  description: '', collection: '1-800-Cyber-Love', productType: 'Tee',
  vendor: 'SCR!PTS', tags: [], publishedStatus: 'active', skuRoot: 'SCR-ANX',
  shipDate: 'July 2026', requiresShipping: true, seo: { title: '', description: '' },
  options: [{ name: 'Size', values: ['S', 'M'], position: 1 }],
  variants: [], media: [], fit: '', fabric: '', fabricWeight: '',
  modelNote: '', careInstructions: [], ...over,
})

const withVariants = (over: Partial<Product> = {}): Product => {
  const p = base(over)
  return { ...p, variants: reconcileVariants(p.id, p.skuRoot, p.options, [], DEFAULTS) }
}

const stocked = (p: Product, stocks: Record<string, number>): Product => ({
  ...p,
  variants: p.variants.map((v) => ({ ...v, stock: stocks[variantTitle(v.optionValues)] ?? v.stock })),
})

describe('addOptionValue', () => {
  it('adds the new combinations at zero stock and keeps the rest', () => {
    const p = stocked(withVariants(), { S: 7, M: 3 })
    const out = addOptionValue(p, 0, 'L', DEFAULTS)
    expect(out.options[0].values).toEqual(['S', 'M', 'L'])
    expect(out.variants).toHaveLength(3)
    expect(totalStock(out)).toBe(10)
  })

  it('ignores a duplicate value', () => {
    const p = withVariants()
    expect(addOptionValue(p, 0, 'S', DEFAULTS).variants).toHaveLength(2)
  })
})

describe('removeOptionValue', () => {
  it('drops the value and its variants', () => {
    const p = stocked(withVariants(), { S: 7, M: 3 })
    const out = removeOptionValue(p, 0, 'M', DEFAULTS)
    expect(out.options[0].values).toEqual(['S'])
    expect(totalStock(out)).toBe(7)
  })
})

describe('impactOfRemoval', () => {
  it('reports how many variants and how much stock a removal destroys', () => {
    const p = stocked(withVariants({
      options: [
        { name: 'Size', values: ['S', 'M'], position: 1 },
        { name: 'Colorway', values: ['White', 'Black'], position: 2 },
      ],
    }), { 'S / Black': 4, 'M / Black': 6 })
    expect(impactOfRemoval(p, 1, 'Black')).toEqual({ variants: 2, stock: 10 })
  })
})

describe('renameOptionValue', () => {
  it('keeps variants and their stock', () => {
    const p = stocked(withVariants({
      options: [{ name: 'Colorway', values: ['Army Green', 'White'], position: 1 }],
    }), { 'Army Green': 9 })
    const out = renameOptionValue(p, 0, 'Army Green', 'Olive', DEFAULTS)
    expect(out.options[0].values).toEqual(['Olive', 'White'])
    expect(out.variants).toHaveLength(2)
    expect(out.variants.find((v) => v.optionValues[0] === 'Olive')?.stock).toBe(9)
  })

  it('leaves the existing sku alone', () => {
    const p = withVariants({ options: [{ name: 'Colorway', values: ['Army Green'], position: 1 }] })
    const before = p.variants[0].sku
    expect(renameOptionValue(p, 0, 'Army Green', 'Olive', DEFAULTS).variants[0].sku).toBe(before)
  })
})

describe('reorderOptionValues', () => {
  it('reorders variants without losing stock', () => {
    const p = stocked(withVariants(), { S: 7, M: 3 })
    const out = reorderOptionValues(p, 0, ['M', 'S'], DEFAULTS)
    expect(out.variants.map((v) => v.optionValues[0])).toEqual(['M', 'S'])
    expect(out.variants.map((v) => v.stock)).toEqual([3, 7])
    expect(out.variants.map((v) => v.position)).toEqual([0, 1])
  })
})

describe('addOption', () => {
  it('multiplies the variant grid and keeps stock on the first value', () => {
    const p = stocked(withVariants(), { S: 7, M: 3 })
    const out = addOption(p, 'Colorway', ['White', 'Black'], DEFAULTS)
    expect(out.variants).toHaveLength(4)
    expect(out.variants.find((v) => variantTitle(v.optionValues) === 'S / White')?.stock).toBe(7)
    expect(out.variants.find((v) => variantTitle(v.optionValues) === 'S / Black')?.stock).toBe(0)
  })

  it('refuses a fourth axis', () => {
    const p = withVariants({
      options: [
        { name: 'A', values: ['1'], position: 1 },
        { name: 'B', values: ['1'], position: 2 },
        { name: 'C', values: ['1'], position: 3 },
      ],
    })
    expect(addOption(p, 'D', ['1'], DEFAULTS)).toBe(p)
  })
})

describe('removeOption', () => {
  it('keeps the variants sitting on the first value of the removed axis', () => {
    const p = stocked(withVariants({
      options: [
        { name: 'Size', values: ['S', 'M'], position: 1 },
        { name: 'Colorway', values: ['White', 'Black'], position: 2 },
      ],
    }), { 'S / White': 7, 'M / White': 3, 'S / Black': 5 })
    const out = removeOption(p, 1, DEFAULTS)
    expect(out.options.map((o) => o.name)).toEqual(['Size'])
    expect(out.variants).toHaveLength(2)
    expect(totalStock(out)).toBe(10)
  })

  it('renumbers the positions of remaining axes', () => {
    const p = withVariants({
      options: [
        { name: 'Size', values: ['S'], position: 1 },
        { name: 'Colorway', values: ['White'], position: 2 },
      ],
    })
    expect(removeOption(p, 0, DEFAULTS).options[0].position).toBe(1)
  })
})

describe('deriveAvailability', () => {
  it('is sold-out when every tracked variant is empty', () => {
    expect(deriveAvailability(stocked(withVariants(), { S: 0, M: 0 }))).toBe('sold-out')
  })

  it('is available when any variant has stock', () => {
    expect(deriveAvailability(stocked(withVariants(), { S: 0, M: 2 }))).toBe('available')
  })

  it('is pre-order when empty but backorder is allowed', () => {
    const p = stocked(withVariants(), { S: 0, M: 0 })
    const backorder = { ...p, variants: p.variants.map((v) => ({ ...v, allowBackorder: true })) }
    expect(deriveAvailability(backorder)).toBe('pre-order')
  })

  it('is available when inventory is not tracked', () => {
    const p = stocked(withVariants(), { S: 0, M: 0 })
    const untracked = { ...p, variants: p.variants.map((v) => ({ ...v, trackInventory: false })) }
    expect(deriveAvailability(untracked)).toBe('available')
  })

  it('is sold-out for a product with no variants at all', () => {
    expect(deriveAvailability(base())).toBe('sold-out')
  })
})

describe('variantCount', () => {
  it('counts variants', () => {
    expect(variantCount(withVariants())).toBe(2)
  })
})
