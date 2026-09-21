import { describe, expect, it } from 'vitest'
import { CYBER_LOVE_PRODUCTS } from '@/lib/products'
import { toStorefrontProduct } from '@/lib/storefront'
import { LOW_STOCK_THRESHOLD } from '@/lib/admin/config'

describe('toStorefrontProduct', () => {
  const source = {
    ...CYBER_LOVE_PRODUCTS[0],
    variants: CYBER_LOVE_PRODUCTS[0].variants.map((v, i) => ({
      ...v, sku: 'SECRET-SKU', barcode: '123', cost: 9.5, weightGrams: 300, stock: i === 0 ? 0 : 500,
    })),
  }
  const out = toStorefrontProduct(source)

  it('removes back-office fields', () => {
    for (const v of out.variants) {
      expect(v.sku).toBe('')
      expect(v.barcode).toBeNull()
      expect(v.cost).toBeNull()
      expect(v.weightGrams).toBeNull()
    }
    expect(out.skuRoot).toBe('')
    expect(JSON.stringify(out)).not.toContain('SECRET-SKU')
  })

  it('hides the real stock count but keeps sold-out and low-stock behaviour', () => {
    expect(out.variants[0].stock).toBe(0)
    expect(out.variants[1].stock).toBe(LOW_STOCK_THRESHOLD + 1)
  })

  it('keeps price and ids, and does not mutate the input', () => {
    expect(out.variants[1].price).toBe(source.variants[1].price)
    expect(out.variants[1].id).toBe(source.variants[1].id)
    expect(source.variants[1].cost).toBe(9.5)
  })
})
