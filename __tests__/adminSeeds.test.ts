import { describe, expect, it } from 'vitest'
import { ADMIN_SLUG, adminPath } from '@/lib/admin/config'
import { MOCK_ORDERS } from '@/lib/admin/mockOrders'

describe('admin config', () => {
  it('slug is defined once and adminPath builds routes from it', () => {
    expect(ADMIN_SLUG).toBe('office-scr1pts-x7k2')
    expect(adminPath()).toBe('/office-scr1pts-x7k2')
    expect(adminPath('products')).toBe('/office-scr1pts-x7k2/products')
    expect(adminPath('orders')).toBe('/office-scr1pts-x7k2/orders')
  })
})

describe('mock orders', () => {
  it('seeds ~10 plausible orders with valid statuses and totals', () => {
    expect(MOCK_ORDERS.length).toBeGreaterThanOrEqual(8)
    for (const o of MOCK_ORDERS) {
      expect(o.id).toMatch(/^SCR-\d{4}$/)
      expect(['pending', 'shipped', 'delivered']).toContain(o.status)
      expect(o.total).toBeGreaterThan(0)
      expect(o.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(o.customer.length).toBeGreaterThan(0)
      expect(o.items.length).toBeGreaterThan(0)
    }
    const ids = new Set(MOCK_ORDERS.map((o) => o.id))
    expect(ids.size).toBe(MOCK_ORDERS.length)
  })
})
