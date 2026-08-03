import { describe, expect, it } from 'vitest'
import { isMigrated, migrateProducts } from '@/lib/admin/migrate'
import type { LegacyProduct } from '@/lib/admin/migrate'
import { totalStock } from '@/lib/admin/variants'

const legacy = (over: Partial<LegacyProduct> = {}): LegacyProduct => ({
  id: '1', name: '"ANXIETY" — White', emotion: 'ANXIETY', colorway: 'White',
  price: 44, collection: '1-800-Cyber-Love', status: 'pre-order',
  image: '/products/cutout/anxiety-white.png', backImage: '/products/cutout/back-white.png',
  slug: 'anxiety-white', description: 'copy', shipDate: 'July 2026',
  sizes: ['S', 'M', 'L', 'XL'], careInstructions: ['wash'], fit: 'boxy',
  fabric: '100% Cotton', fabricWeight: '260 g/m²', modelNote: 'note', ...over,
})

const CYBER = [
  legacy(),
  legacy({ id: '5', name: '"ANXIETY" — Army Green', colorway: 'Army Green', slug: 'anxiety-green', image: '/g.png' }),
]

describe('migrateProducts', () => {
  it('splits each colorway of one emotion into its own product', () => {
    const out = migrateProducts(CYBER)
    expect(out).toHaveLength(2)
    expect(out.map((p) => p.slug)).toEqual(['anxiety-white', 'anxiety-green'])
    expect(out.map((p) => p.name)).toEqual(['"ANXIETY" — White', '"ANXIETY" — Army Green'])
  })

  it('builds a Size axis and nothing else', () => {
    const [p] = migrateProducts(CYBER)
    expect(p.options.map((o) => o.name)).toEqual(['Size'])
    expect(p.options[0].values).toEqual(['S', 'M', 'L', 'XL'])
    expect(p.options[0].position).toBe(1)
  })

  it('creates one variant per size', () => {
    const [p] = migrateProducts(CYBER)
    expect(p.variants).toHaveLength(4)
    expect(new Set(p.variants.map((v) => v.sku)).size).toBe(4)
    expect(p.variants.every((v) => v.price === 44)).toBe(true)
  })

  it('derives skuRoot from collection, emotion and colourway', () => {
    const out = migrateProducts(CYBER)
    expect(out.map((p) => p.skuRoot)).toEqual(['SCR-ANX-WHI', 'SCR-ANX-ARM'])
  })

  it('gives a two-character emotion an unpadded segment', () => {
    const out = migrateProducts([legacy({ id: 'b1', emotion: 'MJ', collection: 'Basement', slug: 'mj-white' })])
    expect(out[0].skuRoot).toBe('BSM-MJ-WHI')
  })

  it('collects this colourway front shot first, then its back', () => {
    const [white, green] = migrateProducts(CYBER)
    expect(white.media[0].url).toBe('/products/cutout/anxiety-white.png')
    expect(white.media[0].position).toBe(0)
    expect(white.media[1].url).toBe('/products/cutout/back-white.png')
    expect(green.media[0].url).toBe('/g.png')
  })

  it('points every variant at this product single front image', () => {
    const [p] = migrateProducts(CYBER)
    expect(p.variants.every((v) => v.imageId === p.media[0].id)).toBe(true)
  })

  it('seeds deterministic non-zero stock', () => {
    const a = migrateProducts(CYBER)
    const b = migrateProducts(CYBER)
    expect(totalStock(a[0])).toBe(totalStock(b[0]))
    expect(totalStock(a[0])).toBeGreaterThan(0)
  })

  it('does not merge the same emotion across different collections', () => {
    const out = migrateProducts([
      legacy(),
      legacy({ id: 'b9', collection: 'Basement', slug: 'anxiety-basement' }),
    ])
    expect(out).toHaveLength(2)
  })

  it('carries editorial copy and sets publishedStatus to active', () => {
    const [p] = migrateProducts(CYBER)
    expect(p.description).toBe('copy')
    expect(p.careInstructions).toEqual(['wash'])
    expect(p.fabric).toBe('100% Cotton')
    expect(p.publishedStatus).toBe('active')
    expect(p.seo.title).toBe('"ANXIETY" — White')
  })

  it('sets allowBackorder from a pre-order source product', () => {
    const [p] = migrateProducts(CYBER)
    expect(p.variants.every((v) => v.allowBackorder)).toBe(true)
  })

  it('is idempotent when handed already-migrated products', () => {
    const once = migrateProducts(CYBER)
    expect(migrateProducts(once as unknown as LegacyProduct[])).toEqual(once)
  })

  it('handles mixed arrays: passes through migrated, migrates legacy, returns both', () => {
    const migrated = migrateProducts(CYBER)[0]
    const legacyItem = legacy({ id: 'new', emotion: 'NEW', slug: 'new-white' })
    const mixed = [migrated, legacyItem] as unknown as LegacyProduct[]
    const result = migrateProducts(mixed)

    expect(result).toHaveLength(2)
    expect(result[1]).toEqual(migrated)
    expect(result[0].emotion).toBe('NEW')
    expect(result[0].slug).toBe('new-white')
    expect(result[0].variants.length).toBeGreaterThan(0)
  })
})

describe('isMigrated', () => {
  it('recognises a v3 product', () => {
    expect(isMigrated(migrateProducts(CYBER)[0])).toBe(true)
  })

  it('rejects a legacy product', () => {
    expect(isMigrated(legacy())).toBe(false)
  })

  it('rejects junk', () => {
    expect(isMigrated(null)).toBe(false)
    expect(isMigrated({})).toBe(false)
  })
})
