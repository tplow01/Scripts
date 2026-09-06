import { describe, it, expect } from 'vitest'

import { ALL_PRODUCTS, CYBER_LOVE_PRODUCTS, BASEMENT_PRODUCTS } from '@/lib/products'
import {
  mediaRows,
  optionRows,
  productToRow,
  rowToProduct,
  variantRows,
  type ProductRow,
} from '@/lib/server/mapping'

/** Rebuild the joined row shape Postgres would return for a product. */
function toRow(product: (typeof ALL_PRODUCTS)[number]): ProductRow {
  return {
    ...productToRow(product),
    product_options: optionRows(product),
    product_variants: variantRows(product),
    product_media: mediaRows(product),
  }
}

describe('rowToProduct / productToRow', () => {
  it('round-trips every seed product without loss', () => {
    for (const product of ALL_PRODUCTS) {
      expect(rowToProduct(toRow(product))).toEqual(product)
    }
  })

  it('carries isBasement across the boundary in both directions', () => {
    for (const p of CYBER_LOVE_PRODUCTS) expect(productToRow(p).is_basement).toBe(false)
    for (const p of BASEMENT_PRODUCTS) expect(productToRow(p).is_basement).toBe(true)

    const basement = rowToProduct(toRow(BASEMENT_PRODUCTS[0]))
    expect(basement.isBasement).toBe(true)
  })

  it('coerces numeric columns that arrive as strings', () => {
    const row = toRow(CYBER_LOVE_PRODUCTS[0])
    const stringly: ProductRow = {
      ...row,
      product_variants: (row.product_variants ?? []).map((v) => ({
        ...v,
        price: String(v.price),
        compare_at_price: v.compare_at_price === null ? null : String(v.compare_at_price),
        cost: v.cost === null ? null : String(v.cost),
      })),
    }
    const product = rowToProduct(stringly)
    for (const variant of product.variants) {
      expect(typeof variant.price).toBe('number')
      expect(Number.isNaN(variant.price)).toBe(false)
    }
    // A string price must not survive as a string and get concatenated later.
    expect(product.variants[0].price).toBe(CYBER_LOVE_PRODUCTS[0].variants[0].price)
  })

  it('sorts children by position regardless of row order', () => {
    const row = toRow(CYBER_LOVE_PRODUCTS[0])
    const shuffled: ProductRow = {
      ...row,
      product_variants: [...(row.product_variants ?? [])].reverse(),
      product_media: [...(row.product_media ?? [])].reverse(),
    }
    const product = rowToProduct(shuffled)
    const positions = product.variants.map((v) => v.position)
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
  })

  it('treats null array columns as empty, never undefined', () => {
    const row = toRow(CYBER_LOVE_PRODUCTS[0])
    const sparse: ProductRow = {
      ...row,
      tags: null,
      care_instructions: null,
      product_options: null,
      product_variants: null,
      product_media: null,
    }
    const product = rowToProduct(sparse)
    expect(product.tags).toEqual([])
    expect(product.careInstructions).toEqual([])
    expect(product.options).toEqual([])
    expect(product.variants).toEqual([])
    expect(product.media).toEqual([])
  })
})
