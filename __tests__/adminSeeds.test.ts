import { describe, expect, it } from 'vitest'
import { ADMIN_SLUG, adminPath } from '@/lib/admin/config'
import { MOCK_ORDERS } from '@/lib/admin/mockOrders'
import { DEVICE_SPLIT, TOP_PAGES, TRAFFIC_30D } from '@/lib/admin/mockTraffic'
import { ALL_PRODUCTS, BASEMENT_PRODUCTS, CYBER_LOVE_PRODUCTS, LEGACY_SLUG_REDIRECTS, colorwayLabel, siblingColorways } from '@/lib/products'
import { deriveAvailability, totalStock } from '@/lib/admin/variants'

describe('admin config', () => {
  it('slug and adminPath unchanged', () => {
    expect(ADMIN_SLUG).toBe('office-scr1pts-x7k2')
    expect(adminPath('orders')).toBe('/office-scr1pts-x7k2/orders')
  })
})

describe('rich mock orders', () => {
  it('every order is internally consistent', () => {
    expect(MOCK_ORDERS.length).toBeGreaterThanOrEqual(8)
    for (const o of MOCK_ORDERS) {
      expect(o.id).toMatch(/^SCR-\d{4}$/)
      expect(o.customer.name.length).toBeGreaterThan(0)
      expect(o.customer.email).toContain('@')
      expect(o.customer.address.length).toBeGreaterThanOrEqual(2)
      expect(o.lineItems.length).toBeGreaterThanOrEqual(1)
      const subtotal = o.lineItems.reduce((s, li) => s + li.qty * li.unitPrice, 0)
      expect(o.subtotal).toBe(subtotal)
      expect(o.total).toBe(o.subtotal + o.shipping)
      expect(['paid', 'refunded']).toContain(o.paymentStatus)
      // timeline consistent with status
      expect(o.timeline.placedAt.startsWith(o.date)).toBe(true)
      if (o.status === 'pending') { expect(o.timeline.shippedAt).toBeNull(); expect(o.timeline.deliveredAt).toBeNull() }
      if (o.status === 'shipped') { expect(o.timeline.shippedAt).not.toBeNull(); expect(o.timeline.deliveredAt).toBeNull() }
      if (o.status === 'delivered') { expect(o.timeline.shippedAt).not.toBeNull(); expect(o.timeline.deliveredAt).not.toBeNull() }
    }
    expect(MOCK_ORDERS.some((o) => o.shipping > 0)).toBe(true)
  })
})

describe('traffic seed', () => {
  it('has exactly 30 consecutive days ending 2026-07-30 with plausible ratios', () => {
    expect(TRAFFIC_30D).toHaveLength(30)
    expect(TRAFFIC_30D[0].date).toBe('2026-07-01')
    expect(TRAFFIC_30D[29].date).toBe('2026-07-30')
    for (let i = 1; i < 30; i++) {
      const prev = new Date(`${TRAFFIC_30D[i - 1].date}T00:00:00Z`)
      prev.setUTCDate(prev.getUTCDate() + 1)
      expect(TRAFFIC_30D[i].date).toBe(prev.toISOString().slice(0, 10))
    }
    for (const d of TRAFFIC_30D) {
      expect(d.visitors).toBeGreaterThan(0)
      expect(d.pageViews).toBeGreaterThan(d.visitors)
    }
  })
  it('top pages: 5 entries, descending views; device split sums to 100', () => {
    expect(TOP_PAGES).toHaveLength(5)
    for (let i = 1; i < TOP_PAGES.length; i++) expect(TOP_PAGES[i].views).toBeLessThanOrEqual(TOP_PAGES[i - 1].views)
    expect(DEVICE_SPLIT.mobile + DEVICE_SPLIT.desktop).toBe(100)
  })
})

describe('split catalog', () => {
  it('ships 8 inventory and 4 Basement products', () => {
    expect(CYBER_LOVE_PRODUCTS).toHaveLength(8)
    expect(BASEMENT_PRODUCTS).toHaveLength(4)
    expect(ALL_PRODUCTS).toHaveLength(12)
  })

  it('gives every product a single Size axis, plus variants and media', () => {
    for (const p of ALL_PRODUCTS) {
      expect(p.options.map((o) => o.name)).toEqual(['Size'])
      expect(p.variants).toHaveLength(4)
      expect(p.media.length).toBeGreaterThan(0)
    }
  })

  it('resolves every variant imageId to a real media entry on its own product', () => {
    for (const p of ALL_PRODUCTS) {
      expect(p.media.length).toBeGreaterThan(0)
      const mediaIds = new Set(p.media.map((m) => m.id))
      for (const v of p.variants) {
        expect(v.imageId).not.toBeNull()
        expect(mediaIds.has(v.imageId as string)).toBe(true)
      }
    }
  })

  it('has unique slugs, sku roots and variant skus across all twelve', () => {
    expect(new Set(ALL_PRODUCTS.map((p) => p.slug)).size).toBe(12)
    expect(new Set(ALL_PRODUCTS.map((p) => p.skuRoot)).size).toBe(12)
    const skus = ALL_PRODUCTS.flatMap((p) => p.variants.map((v) => v.sku))
    expect(new Set(skus).size).toBe(skus.length)
  })

  it('redirects every merged slug to a live White product', () => {
    const entries = Object.entries(LEGACY_SLUG_REDIRECTS)
    expect(entries).toHaveLength(6)
    expect(Object.keys(LEGACY_SLUG_REDIRECTS).sort()).toEqual(
      ['anxiety', 'are-you-okay', 'confusion', 'love', 'mj', 'rage'],
    )
    for (const [, to] of entries) {
      expect(to.endsWith('-white')).toBe(true)
      expect(ALL_PRODUCTS.some((p) => p.slug === to)).toBe(true)
    }
  })

  it('ships stock, so nothing reads as sold out', () => {
    for (const p of ALL_PRODUCTS) {
      expect(totalStock(p)).toBeGreaterThan(0)
      expect(deriveAvailability(p)).not.toBe('sold-out')
    }
  })

  it('links sibling colourways: 1 for inventory, 2 for ARE YOU OKAY, 0 for MJ', () => {
    const anxietyWhite = ALL_PRODUCTS.find((p) => p.slug === 'anxiety-white')!
    expect(siblingColorways(anxietyWhite).map((p) => p.slug)).toEqual(['anxiety-green'])

    const areBlack = ALL_PRODUCTS.find((p) => p.slug === 'are-you-okay-black')!
    expect(siblingColorways(areBlack)).toHaveLength(2)

    const mj = ALL_PRODUCTS.find((p) => p.slug === 'mj-white')!
    expect(siblingColorways(mj)).toHaveLength(0)
  })

  it('reads the colourway label off the product name', () => {
    const green = ALL_PRODUCTS.find((p) => p.slug === 'anxiety-green')!
    expect(colorwayLabel(green)).toBe('Army Green')
  })
})
