import { describe, expect, it } from 'vitest'
import { ADMIN_SLUG, adminPath } from '@/lib/admin/config'
import { MOCK_ORDERS } from '@/lib/admin/mockOrders'
import { DEVICE_SPLIT, TOP_PAGES, TRAFFIC_30D } from '@/lib/admin/mockTraffic'
import { ALL_PRODUCTS, BASEMENT_PRODUCTS, CYBER_LOVE_PRODUCTS, LEGACY_SLUG_REDIRECTS } from '@/lib/products'
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

describe('migrated catalog', () => {
  it('folds twelve legacy products into six', () => {
    expect(CYBER_LOVE_PRODUCTS).toHaveLength(4)
    expect(BASEMENT_PRODUCTS).toHaveLength(2)
  })

  it('gives every product options, variants and media', () => {
    for (const p of ALL_PRODUCTS) {
      expect(p.options.length).toBeGreaterThan(0)
      expect(p.variants.length).toBeGreaterThan(0)
      expect(p.media.length).toBeGreaterThan(0)
    }
  })

  it('has unique slugs and globally unique variant skus', () => {
    expect(new Set(ALL_PRODUCTS.map((p) => p.slug)).size).toBe(ALL_PRODUCTS.length)
    const skus = ALL_PRODUCTS.flatMap((p) => p.variants.map((v) => v.sku))
    expect(new Set(skus).size).toBe(skus.length)
  })

  it('redirects all twelve legacy slugs to a live product', () => {
    const entries = Object.entries(LEGACY_SLUG_REDIRECTS)
    expect(entries).toHaveLength(12)
    for (const [, to] of entries) {
      expect(ALL_PRODUCTS.some((p) => p.slug === to)).toBe(true)
    }
  })

  it('ships stock, so nothing reads as sold out', () => {
    for (const p of ALL_PRODUCTS) {
      expect(totalStock(p)).toBeGreaterThan(0)
      expect(deriveAvailability(p)).not.toBe('sold-out')
    }
  })

  it('gives ARE YOU OKAY a three-value colorway axis', () => {
    const p = BASEMENT_PRODUCTS.find((x) => x.emotion === 'ARE YOU OKAY')
    expect(p?.options[1].values).toHaveLength(3)
    expect(p?.variants).toHaveLength(12)
  })
})
