// __tests__/newOrderStaffEmail.test.ts
//
// The customer gets a confirmation; until now nobody on the SCR!PTS side was
// told at all. The staff copy is what Heath places the Tapstitch order from, so
// it has to carry everything that needs: what, which size, how many, where to.
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { AdminOrder } from '@/lib/admin/types'
import { newOrderStaffEmail, staffAddress } from '@/lib/server/emails/newOrderStaff'

const order = (over: Partial<AdminOrder> = {}): AdminOrder => ({
  id: 'SCR-1060',
  customer: {
    name: 'Maya Okafor',
    email: 'maya@example.com',
    phone: '+1 415 555 0123',
    address: ['22 Rivington Street, Flat 4', 'London, EC2A 3DY, GB'],
  },
  lineItems: [
    { productName: '"ANXIETY" — White', size: 'M', qty: 2, unitPrice: 55 },
    { productName: '"LOVE" — Army Green', size: 'L', qty: 1, unitPrice: 55 },
  ],
  subtotal: 165,
  shipping: 0,
  total: 165,
  date: '2026-10-30',
  status: 'paid',
  paymentStatus: 'paid',
  timeline: { placedAt: '2026-10-30T10:00:00Z', makingAt: null, shippedAt: null, deliveredAt: null },
  ...over,
})

describe('newOrderStaffEmail', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('goes to the staff address, not the customer, and names the order in the subject', () => {
    const email = newOrderStaffEmail(order(), 'orders@scripts.studio')
    expect(email.to).toBe('orders@scripts.studio')
    expect(email.subject).toContain('SCR-1060')
    expect(email.subject).toContain('$165')
  })

  it('lists every line with its size and quantity, in text and HTML', () => {
    const email = newOrderStaffEmail(order(), 'orders@scripts.studio')
    expect(email.text).toContain('"ANXIETY" — White · M ×2')
    expect(email.text).toContain('"LOVE" — Army Green · L ×1')
    expect(email.html).toContain('&quot;ANXIETY&quot; — White')
    expect(email.html).toContain('&quot;LOVE&quot; — Army Green')
  })

  it('carries the ship-to name and address and how to reach the buyer', () => {
    const email = newOrderStaffEmail(order(), 'orders@scripts.studio')
    expect(email.text).toContain('Maya Okafor')
    expect(email.text).toContain('22 Rivington Street, Flat 4')
    expect(email.text).toContain('London, EC2A 3DY, GB')
    expect(email.text).toContain('maya@example.com')
    expect(email.text).toContain('+1 415 555 0123')
  })

  it('prints the recipient above the address and the buyer separately when the parcel is a gift', () => {
    const email = newOrderStaffEmail(
      order({ customer: { ...order().customer, recipient: 'Dev Patel' } }),
      'orders@scripts.studio',
    )
    const shipTo = email.text.indexOf('Dev Patel')
    const address = email.text.indexOf('22 Rivington Street')
    expect(shipTo).toBeGreaterThan(-1)
    expect(shipTo).toBeLessThan(address)
    expect(email.text).toContain('Ordered by: Maya Okafor')
  })

  it('links to the back-office orders page on the live site', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.scripts.studio')
    const email = newOrderStaffEmail(order(), 'orders@scripts.studio')
    expect(email.text).toContain('https://www.scripts.studio/office-scr1pts-x7k2/orders')
    expect(email.html).toContain('href="https://www.scripts.studio/office-scr1pts-x7k2/orders"')
  })
})

describe('staffAddress', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('prefers ORDER_NOTIFY_EMAIL when set', () => {
    vi.stubEnv('ORDER_NOTIFY_EMAIL', ' heath@example.com ')
    vi.stubEnv('EMAIL_FROM', 'SCR!PTS <orders@scripts.studio>')
    expect(staffAddress()).toBe('heath@example.com')
  })

  it('falls back to the address inside EMAIL_FROM, which is the forwarding inbox', () => {
    vi.stubEnv('ORDER_NOTIFY_EMAIL', '')
    vi.stubEnv('EMAIL_FROM', 'SCR!PTS <orders@scripts.studio>')
    expect(staffAddress()).toBe('orders@scripts.studio')
  })

  it('accepts a bare address in EMAIL_FROM', () => {
    vi.stubEnv('ORDER_NOTIFY_EMAIL', '')
    vi.stubEnv('EMAIL_FROM', 'orders@scripts.studio')
    expect(staffAddress()).toBe('orders@scripts.studio')
  })

  it('is null when neither is set, so the onboarding sender is never used as a staff inbox', () => {
    vi.stubEnv('ORDER_NOTIFY_EMAIL', '')
    vi.stubEnv('EMAIL_FROM', '')
    expect(staffAddress()).toBeNull()
  })
})
