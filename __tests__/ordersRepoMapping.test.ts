import { describe, expect, it } from 'vitest'

import { rowToOrder } from '@/lib/server/orders.repo'
import { shipToName } from '@/lib/admin/types'

const row = (over: Record<string, unknown> = {}) => ({
  id: 'SCR-1042',
  customer_name: 'Maya Okafor',
  customer_email: 'maya@example.com',
  customer_phone: '',
  address: ['22 Rivington Street', 'London, EC2A 3DY, UK'],
  ship_to_name: null,
  subtotal: '55.00',
  shipping: '0.00',
  total: '55.00',
  status: 'paid' as const,
  payment_status: 'paid' as const,
  placed_at: '2026-10-02T10:00:00Z',
  making_at: null,
  shipped_at: null,
  delivered_at: null,
  order_items: [],
  ...over,
})

describe('rowToOrder — who the parcel is for', () => {
  it('maps a stored ship-to name to the recipient', () => {
    const order = rowToOrder(row({ ship_to_name: 'Dev Patel' }))
    expect(order.customer.name).toBe('Maya Okafor')
    expect(order.customer.recipient).toBe('Dev Patel')
  })

  it('leaves the recipient unset when there is none, so the label falls back to the buyer', () => {
    // Orders written before the column existed, and every self-shipped order since.
    const order = rowToOrder(row({ ship_to_name: null }))
    expect(order.customer.recipient).toBeUndefined()
    expect(shipToName(order.customer)).toBe('Maya Okafor')
  })
})
