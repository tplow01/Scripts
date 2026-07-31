import { describe, expect, it } from 'vitest'
import { ADMIN_SLUG, adminPath } from '@/lib/admin/config'
import { MOCK_ORDERS } from '@/lib/admin/mockOrders'
import { TRAFFIC_14D, TRAFFIC_PREV_TOTALS } from '@/lib/admin/mockTraffic'

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
  it('has exactly 14 consecutive days ending 2026-07-30 with plausible ratios', () => {
    expect(TRAFFIC_14D).toHaveLength(14)
    expect(TRAFFIC_14D[13].date).toBe('2026-07-30')
    for (const d of TRAFFIC_14D) {
      expect(d.visitors).toBeGreaterThan(0)
      expect(d.pageViews).toBeGreaterThan(d.visitors)
    }
    expect(TRAFFIC_PREV_TOTALS.visitors).toBeGreaterThan(0)
    expect(TRAFFIC_PREV_TOTALS.pageViews).toBeGreaterThan(0)
  })
})
