import { describe, expect, it } from 'vitest'
import {
  addProduct, applyOrderStatus, blankProduct, deleteProduct,
  parseStoredState, seedState, setOrderStatus, setVariantStock,
  togglePublished, updateProduct,
} from '@/lib/admin/store'
import type { AdminState } from '@/lib/admin/store'
import { customerStats, delta, revenueByDay, statusCounts, topProducts } from '@/lib/admin/stats'
import type { Product } from '@/types/product'

const NOW = '2026-07-31T12:00:00Z'

const sample = (over: Partial<Product> = {}): Product => ({
  ...blankProduct('p1'), name: '"TEST"', slug: 'test', emotion: 'TEST', ...over,
})

describe('product actions (unchanged behaviour)', () => {
  it('add/update/delete still work', () => {
    let s: AdminState = { products: [sample()], orders: [] }
    s = addProduct(s, sample({ id: 'p2' }))
    s = updateProduct(s, sample({ id: 'p1', name: '"TEST" updated' }))
    expect(s.products.find((p) => p.id === 'p1')?.name).toBe('"TEST" updated')
    s = deleteProduct(s, 'p2')
    expect(s.products).toHaveLength(1)
  })
})

describe('togglePublished', () => {
  it('flips active to draft and back', () => {
    const s = { products: [sample({ publishedStatus: 'active' })], orders: [] }
    const drafted = togglePublished(s, 'p1')
    expect(drafted.products[0].publishedStatus).toBe('draft')
    expect(togglePublished(drafted, 'p1').products[0].publishedStatus).toBe('active')
  })
})

describe('setVariantStock', () => {
  it('sets one variant and floors at zero', () => {
    const p = sample()
    const s = { products: [p], orders: [] }
    const vid = p.variants[0].id
    expect(setVariantStock(s, 'p1', vid, 9).products[0].variants[0].stock).toBe(9)
    expect(setVariantStock(s, 'p1', vid, -4).products[0].variants[0].stock).toBe(0)
  })
})

describe('applyOrderStatus timeline stamping', () => {
  const base = seedState().orders.find((o) => o.status === 'pending')!

  it('pending → shipped stamps shippedAt', () => {
    const next = applyOrderStatus(base, 'shipped', NOW)
    expect(next.timeline.shippedAt).toBe(NOW)
    expect(next.timeline.deliveredAt).toBeNull()
  })
  it('pending → delivered stamps both', () => {
    const next = applyOrderStatus(base, 'delivered', NOW)
    expect(next.timeline.shippedAt).toBe(NOW)
    expect(next.timeline.deliveredAt).toBe(NOW)
  })
  it('delivered → shipped clears deliveredAt but keeps original shippedAt', () => {
    const delivered = seedState().orders.find((o) => o.status === 'delivered')!
    const next = applyOrderStatus(delivered, 'shipped', NOW)
    expect(next.timeline.shippedAt).toBe(delivered.timeline.shippedAt)
    expect(next.timeline.deliveredAt).toBeNull()
  })
  it('→ pending clears both', () => {
    const delivered = seedState().orders.find((o) => o.status === 'delivered')!
    const next = applyOrderStatus(delivered, 'pending', NOW)
    expect(next.timeline.shippedAt).toBeNull()
    expect(next.timeline.deliveredAt).toBeNull()
  })
  it('setOrderStatus routes through applyOrderStatus and touches only the target', () => {
    const s = seedState()
    const target = s.orders.find((o) => o.status === 'pending')!.id
    const next = setOrderStatus(s, target, 'shipped', NOW)
    expect(next.orders.find((o) => o.id === target)?.timeline.shippedAt).toBe(NOW)
    expect(next.orders.filter((o) => o.id !== target)).toEqual(s.orders.filter((o) => o.id !== target))
  })
})

describe('stats helpers', () => {
  const s = seedState()

  it('revenueByDay returns consecutive days ending at newest order date, totals only on order days', () => {
    const days = revenueByDay(s.orders, 14)
    expect(days).toHaveLength(14)
    expect(days[13].date).toBe('2026-07-29')
    const total = days.reduce((sum, d) => sum + d.total, 0)
    expect(total).toBe(s.orders.filter((o) => o.date >= days[0].date).reduce((sum, o) => sum + o.total, 0))
  })
  it('topProducts ranks by units across line items', () => {
    const top = topProducts(s.orders, 3)
    expect(top).toHaveLength(3)
    expect(top[0].units).toBeGreaterThanOrEqual(top[1].units)
    expect(top[1].units).toBeGreaterThanOrEqual(top[2].units)
  })
  it('statusCounts sums to order count', () => {
    const c = statusCounts(s.orders)
    expect(c.pending + c.shipped + c.delivered).toBe(s.orders.length)
  })
  it('customerStats counts unique emails and new-this-week', () => {
    const c = customerStats(s.orders)
    expect(c.total).toBe(10)
    // newest order 2026-07-29; within 7 days = 2026-07-22..29 first orders
    expect(c.newThisWeek).toBeGreaterThan(0)
    expect(c.newThisWeek).toBeLessThanOrEqual(c.total)
  })
  it('delta handles zero previous and flat changes without NaN', () => {
    expect(delta(100, 0)).toEqual({ pct: 0, dir: 'flat' })
    expect(delta(0, 0)).toEqual({ pct: 0, dir: 'flat' })
    expect(delta(110, 100).dir).toBe('up')
    expect(delta(90, 100).dir).toBe('down')
    expect(delta(100.2, 100).dir).toBe('flat')
  })
  it('stats survive empty orders', () => {
    expect(revenueByDay([], 14)).toHaveLength(0)
    expect(topProducts([], 3)).toHaveLength(0)
    expect(customerStats([]).total).toBe(0)
  })
})

describe('parseStoredState', () => {
  it('rejects v1-shaped orders (no lineItems)', () => {
    const v1 = JSON.stringify({ products: [], orders: [{ id: 'SCR-1', items: 'x', total: 1 }] })
    expect(parseStoredState(v1)).toBeNull()
  })
  it('sanitizes blob urls in media', () => {
    const good = seedState()
    good.products[0] = {
      ...good.products[0],
      media: [
        { id: 'm1', url: 'blob:http://x/1', alt: '', position: 0 },
        { id: 'm2', url: '/products/a.png', alt: '', position: 1 },
      ],
    }
    const parsed = parseStoredState(JSON.stringify(good))!
    expect(parsed.products[0].media).toEqual([{ id: 'm2', url: '/products/a.png', alt: '', position: 1 }])
  })
  it('nulls variant.imageId pointing at media removed by blob-url sanitizing', () => {
    const good = seedState()
    good.products[0] = {
      ...good.products[0],
      media: [
        { id: 'm1', url: 'blob:http://x/1', alt: '', position: 0 },
        { id: 'm2', url: '/products/a.png', alt: '', position: 1 },
      ],
      variants: good.products[0].variants.map((v, i) => ({
        ...v,
        imageId: i === 0 ? 'm1' : 'm2',
      })),
    }
    const parsed = parseStoredState(JSON.stringify(good))!
    const variants = parsed.products[0].variants
    expect(variants[0].imageId).toBeNull()
    expect(variants[1].imageId).toBe('m2')
  })
  it('migrates a v2 payload in place', () => {
    const v2 = JSON.stringify({
      products: [{
        id: '1', name: '"ANXIETY" — White', emotion: 'ANXIETY', colorway: 'White',
        price: 44, collection: '1-800-Cyber-Love', status: 'pre-order',
        image: '/a.png', backImage: '/b.png', slug: 'anxiety-white',
        description: 'x', shipDate: 'July 2026', sizes: ['S', 'M'],
        careInstructions: [], fit: '', fabric: '', fabricWeight: '', modelNote: '',
      }],
      orders: [],
    })
    const out = parseStoredState(v2)
    expect(out?.products[0].variants).toHaveLength(2)
    expect(out?.products[0].slug).toBe('anxiety')
  })
})
