import { describe, it, expect } from 'vitest'

import type { AdminOrder } from '@/lib/admin/types'
import { orderConfirmationEmail } from '@/lib/server/emails/orderConfirmation'
import { orderShippedEmail } from '@/lib/server/emails/orderShipped'
import { orderDeliveredEmail } from '@/lib/server/emails/orderDelivered'
import { escapeHtml, money } from '@/lib/server/emails/layout'

const order = (over: Partial<AdminOrder> = {}): AdminOrder => ({
  id: 'SCR-1055',
  customer: {
    name: 'Maya Okafor',
    email: 'maya@example.com',
    phone: '+1 415 555 0123',
    address: ['22 Rivington Street', 'London, EC2A 3DY, UK'],
  },
  lineItems: [
    { productName: '"ANXIETY" — White', size: 'M', qty: 2, unitPrice: 44 },
    { productName: '"LOVE" — Army Green', size: 'L', qty: 1, unitPrice: 44 },
  ],
  subtotal: 132,
  shipping: 0,
  total: 132,
  date: '2026-09-06',
  status: 'paid',
  paymentStatus: 'paid',
  timeline: { makingAt: null, placedAt: '2026-09-06T10:00:00Z', shippedAt: null, deliveredAt: null },
  ...over,
})

describe.each([
  ['confirmation', orderConfirmationEmail],
  ['shipped', orderShippedEmail],
])('%s email', (_name, build) => {
  it('is addressed to the customer and names the order in the subject', () => {
    const mail = build(order())
    expect(mail.to).toBe('maya@example.com')
    expect(mail.subject).toContain('SCR-1055')
  })

  it('lists every line item, with size and quantity, in both formats', () => {
    const mail = build(order())
    for (const body of [mail.html, mail.text]) {
      expect(body).toContain('ANXIETY')
      expect(body).toContain('LOVE')
      expect(body).toContain('M')
      expect(body).toContain('L')
    }
    expect(mail.text).toContain('×2')
  })

  it('shows the real total, not a recomputed guess', () => {
    const mail = build(order({ subtotal: 132, shipping: 12, total: 144 }))
    expect(mail.html).toContain('$144.00')
    expect(mail.text).toContain('$144.00')
  })

  it('always carries a plain-text alternative', () => {
    const mail = build(order())
    expect(mail.text.length).toBeGreaterThan(80)
    expect(mail.text).not.toContain('<')
  })

  it('escapes customer-supplied text rather than injecting it raw', () => {
    const mail = build(
      order({
        customer: {
          name: '<script>alert(1)</script>',
          email: 'x@example.com',
          phone: '',
          address: ['<img src=x onerror=alert(1)>'],
        },
      }),
    )
    // What matters is that no live markup survives — the escaped text still
    // contains the words, harmlessly, inside &lt;…&gt;.
    expect(mail.html).not.toContain('<script>')
    expect(mail.html).not.toContain('<img')
    expect(mail.html).toContain('&lt;script&gt;')
    expect(mail.html).toContain('&lt;img src=x')
  })

  it('survives an order with no address on it', () => {
    const mail = build(order({ customer: { name: 'Ivy', email: 'ivy@example.com', phone: '', address: [] } }))
    expect(mail.html).toContain('SCR-1055')
    expect(mail.to).toBe('ivy@example.com')
  })

  it('falls back gracefully when the name is missing', () => {
    const mail = build(order({ customer: { name: '', email: 'a@b.co', phone: '', address: [] } }))
    expect(mail.text).toContain('there')
  })
})

describe('shipped email', () => {
  it('promises no tracking, because nothing captures one yet', () => {
    const mail = orderShippedEmail(order())
    expect(mail.text.toLowerCase()).not.toContain('tracking')
    expect(mail.html.toLowerCase()).not.toContain('tracking')
  })
})

describe('helpers', () => {
  it('formats money to two places', () => {
    expect(money(44)).toBe('$44.00')
    expect(money(132.5)).toBe('$132.50')
  })

  it('escapes every html-significant character', () => {
    expect(escapeHtml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;')
  })
})

describe('thank-you email (delivered)', () => {
  const sample: AdminOrder = {
    id: 'SCR-1042',
    customer: { name: 'Maya Okafor', email: 'maya@example.com', phone: '', address: [] },
    lineItems: [{ productName: '"ANXIETY" — White', size: 'M', qty: 1, unitPrice: 44 }],
    subtotal: 44, shipping: 0, total: 44,
    date: '2026-09-06', status: 'delivered', paymentStatus: 'paid',
    timeline: { placedAt: '2026-09-01T10:00:00Z', makingAt: '2026-09-02T10:00:00Z', shippedAt: '2026-09-04T10:00:00Z', deliveredAt: '2026-09-06T10:00:00Z' },
  }

  it('greets by name and carries the order number', () => {
    const mail = orderDeliveredEmail(sample)
    expect(mail.to).toBe('maya@example.com')
    expect(mail.text).toContain('Maya')
    expect(mail.text).toContain('SCR-1042')
  })

  it('invites them back with a working link', () => {
    const mail = orderDeliveredEmail(sample)
    expect(mail.html).toContain('https://scripts.studio')
    expect(mail.text).toContain('https://scripts.studio')
  })

  it('does not discount the brand to win the second order', () => {
    const mail = orderDeliveredEmail(sample)
    const body = (mail.html + mail.text).toLowerCase()
    for (const word of ['% off', 'discount', 'coupon', 'promo code']) {
      expect(body).not.toContain(word)
    }
  })

  it('has a plain-text alternative with no markup', () => {
    const mail = orderDeliveredEmail(sample)
    expect(mail.text.length).toBeGreaterThan(80)
    expect(mail.text).not.toContain('<')
  })
})
