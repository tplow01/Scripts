import { describe, expect, it } from 'vitest'
import { isMigrated, migrateProducts } from '@/lib/admin/migrate'
import type { LegacyProduct } from '@/lib/admin/migrate'
import { totalStock, variantTitle } from '@/lib/admin/variants'

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
  it('folds colorways of one emotion into a single product', () => {
    const out = migrateProducts(CYBER)
    expect(out).toHaveLength(1)
    expect(out[0].slug).toBe('anxiety')
    expect(out[0].name).toBe('"ANXIETY"')
  })

  it('builds a Size axis and a Colorway axis in that order', () => {
    const [p] = migrateProducts(CYBER)
    expect(p.options.map((o) => o.name)).toEqual(['Size', 'Colorway'])
    expect(p.options[0].values).toEqual(['S', 'M', 'L', 'XL'])
    expect(p.options[1].values).toEqual(['White', 'Army Green'])
    expect(p.options.map((o) => o.position)).toEqual([1, 2])
  })

  it('creates one variant per size x colorway', () => {
    const [p] = migrateProducts(CYBER)
    expect(p.variants).toHaveLength(8)
    expect(new Set(p.variants.map((v) => v.sku)).size).toBe(8)
    expect(p.variants.every((v) => v.price === 44)).toBe(true)
  })

  it('seeds deterministic non-zero stock', () => {
    const a = migrateProducts(CYBER)
    const b = migrateProducts(CYBER)
    expect(totalStock(a[0])).toBe(totalStock(b[0]))
    expect(totalStock(a[0])).toBeGreaterThan(0)
  })

  it('collects one media item per colorway plus the shared backs', () => {
    const [p] = migrateProducts(CYBER)
    expect(p.media.length).toBeGreaterThanOrEqual(2)
    expect(p.media[0].position).toBe(0)
  })

  it('points every variant at the media for its colorway', () => {
    const [p] = migrateProducts(CYBER)
    const white = p.variants.find((v) => variantTitle(v.optionValues) === 'S / White')
    const green = p.variants.find((v) => variantTitle(v.optionValues) === 'S / Army Green')
    expect(white?.imageId).toBeTruthy()
    expect(green?.imageId).toBeTruthy()
    expect(white?.imageId).not.toBe(green?.imageId)
  })

  it('does not merge the same emotion across different collections', () => {
    const out = migrateProducts([
      legacy(),
      legacy({ id: 'b9', collection: 'Basement', slug: 'anxiety-basement' }),
    ])
    expect(out).toHaveLength(2)
  })

  it('keeps a single-colorway product as a one-value axis', () => {
    const out = migrateProducts([legacy({ id: 'b1', emotion: 'MJ', collection: 'Basement', slug: 'mj-white' })])
    expect(out[0].options[1].values).toEqual(['White'])
    expect(out[0].variants).toHaveLength(4)
  })

  it('derives skuRoot from the collection and emotion', () => {
    expect(migrateProducts(CYBER)[0].skuRoot).toBe('SCR-ANX')
  })

  it('carries editorial copy and sets publishedStatus to active', () => {
    const [p] = migrateProducts(CYBER)
    expect(p.description).toBe('copy')
    expect(p.careInstructions).toEqual(['wash'])
    expect(p.fabric).toBe('100% Cotton')
    expect(p.publishedStatus).toBe('active')
    expect(p.seo.title).toBe('"ANXIETY"')
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
    // First should be the newly-migrated one
    expect(result[1]).toEqual(migrated)
    // Second should be the legacy one, now migrated
    expect(result[0].emotion).toBe('NEW')
    expect(result[0].slug).toBe('new')
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
