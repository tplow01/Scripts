// __tests__/orderDrawerTax.test.ts
//
// The back-office drawer prints Subtotal, Shipping and Total. A taxed order
// needs its tax line between them, or the numbers on screen do not add up.
import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import type { AdminOrder } from '@/lib/admin/types'

const ORDER: AdminOrder = {
  id: 'SCR-1061',
  customer: { name: 'Maya Okafor', email: 'maya@example.com', phone: '+1 415 555 0123', address: ['655 Valencia St', 'San Francisco, CA 94110, US'] },
  lineItems: [{ productName: '"ANXIETY" — White', size: 'M', qty: 1, unitPrice: 55 }],
  subtotal: 55,
  shipping: 0,
  total: 55,
  date: '2026-11-06',
  status: 'paid',
  paymentStatus: 'paid',
  timeline: { placedAt: '2026-11-06T18:00:00Z', makingAt: null, shippedAt: null, deliveredAt: null },
}

let current: AdminOrder = ORDER

vi.mock('@/lib/admin/store', () => ({
  useAdmin: () => ({ state: { products: [], orders: [current], isSample: false }, setOrder: () => {} }),
}))

async function render(order: AdminOrder): Promise<string> {
  current = order
  const { default: OrderDrawer } = await import('@/components/admin/OrderDrawer')
  return renderToStaticMarkup(createElement(OrderDrawer, { order, onClose: () => {} }))
}

describe('OrderDrawer — sales tax', () => {
  it('prints a Sales tax row between Shipping and Total when the order carries tax', async () => {
    const html = await render({ ...ORDER, tax: 4.95, total: 59.95 })
    expect(html).toContain('Sales tax')
    expect(html).toContain('$4.95')
    expect(html).toContain('$59.95')
    expect(html.indexOf('Shipping')).toBeLessThan(html.indexOf('Sales tax'))
    expect(html.indexOf('Sales tax')).toBeLessThan(html.indexOf('>Total<'))
  })

  it('prints no tax row when there is none, as on every order so far', async () => {
    const html = await render(ORDER)
    expect(html).toContain('Subtotal')
    expect(html).not.toContain('Sales tax')
  })
})
