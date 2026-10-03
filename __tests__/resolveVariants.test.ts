import { describe, expect, it, vi } from 'vitest'

import { ALL_PRODUCTS } from '@/lib/products'
import type { Product } from '@/types/product'

// Seed-catalog mode: no database, so resolveVariants reads ALL_PRODUCTS,
// which we extend with one draft and one archived product.
vi.mock('@/lib/server/supabase', () => ({
  isDatabaseConfigured: () => false,
  serverClient: () => { throw new Error('no database in this test') },
}))

vi.mock('@/lib/products', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/products')>()
  const base = real.ALL_PRODUCTS[0]
  const withStatus = (status: Product['publishedStatus'], suffix: string): Product => ({
    ...base,
    id: `${base.id}-${suffix}`,
    slug: `${base.slug}-${suffix}`,
    publishedStatus: status,
    variants: base.variants.map((v) => ({ ...v, id: `${v.id}-${suffix}`, productId: `${base.id}-${suffix}` })),
  })
  return {
    ...real,
    ALL_PRODUCTS: [...real.ALL_PRODUCTS, withStatus('draft', 'draft'), withStatus('archived', 'archived')],
  }
})

import { resolveVariants } from '@/lib/server/products.repo'

describe('resolveVariants', () => {
  const active = ALL_PRODUCTS[0].variants[0].id

  it('resolves variants of active products', async () => {
    const found = await resolveVariants([active])
    expect(found.map((f) => f.variantId)).toEqual([active])
  })

  it('never resolves a draft or archived product, so it cannot be bought', async () => {
    const found = await resolveVariants([`${active}-draft`, `${active}-archived`])
    expect(found).toEqual([])
  })
})
