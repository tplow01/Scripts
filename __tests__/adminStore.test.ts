import { describe, expect, it } from 'vitest'
import {
  addProduct, applyOrderStatus, deleteProduct,
  parseStoredState, seedState, setOrderStatus,
  toggleProductStatus, updateProduct,
} from '@/lib/admin/store'
import type { AdminState } from '@/lib/admin/store'
import { customerStats, delta, revenueByDay, statusCounts, topProducts } from '@/lib/admin/stats'
import type { Product } from '@/types/product'

const NOW = '2026-07-31T12:00:00Z'

const sample = (over: Partial<Product> = {}): Product => ({
  id: 'p1', name: '"TEST" — White', emotion: 'TEST', colorway: 'White',
  price: 44, collection: '1-800-Cyber-Love', status: 'available',
  image: null, backImage: null, slug: 'test-white', description: 'test',
  shipDate: 'July 2026', sizes: ['S', 'M'], careInstructions: [], fit: '',
  fabric: '', fabricWeight: '', modelNote: '', ...over,
})

describe('product actions (unchanged behaviour)', () => {
  it('add/update/delete/toggle still work', () => {
    let s: AdminState = { products: [sample()], orders: [] }
    s = addProduct(s, sample({ id: 'p2' }))
    s = updateProduct(s, sample({ id: 'p1', price: 60 }))
    s = toggleProductStatus(s, 'p1')
    expect(s.products.find((p) => p.id === 'p1')?.status).toBe('pre-order')
    s = deleteProduct(s, 'p2')
    expect(s.products).toHaveLength(1)
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

describe('parseStoredState v2', () => {
  it('rejects v1-shaped orders (no lineItems)', () => {
    const v1 = JSON.stringify({ products: [], orders: [{ id: 'SCR-1', items: 'x', total: 1 }] })
    expect(parseStoredState(v1)).toBeNull()
  })
  it('sanitizes blob urls in image, backImage and galleryImages', () => {
    const good = seedState()
    good.products[0] = { ...good.products[0], image: 'blob:http://x/1', backImage: '/products/a.png', galleryImages: ['blob:http://x/2', '/products/b.png'] }
    const parsed = parseStoredState(JSON.stringify(good))!
    expect(parsed.products[0].image).toBeNull()
    expect(parsed.products[0].backImage).toBe('/products/a.png')
    expect(parsed.products[0].galleryImages).toEqual(['/products/b.png'])
  })
})
