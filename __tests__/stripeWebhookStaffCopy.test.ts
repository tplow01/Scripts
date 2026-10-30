// __tests__/stripeWebhookStaffCopy.test.ts
//
// A paid order used to tell only the customer. Heath fulfils by hand on
// Tapstitch, so the same webhook now also sends a staff copy — once per order,
// never on a Stripe redelivery, and never at the cost of the order itself.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const constructEvent = vi.fn()
const listLineItems = vi.fn()
const createPaidOrder = vi.fn()
const sendEmail = vi.fn()
const getCopy = vi.fn()
const recordEvent = vi.fn()

vi.mock('@/lib/server/stripe', () => ({
  isStripeConfigured: () => true,
  stripe: () => ({
    webhooks: { constructEvent },
    checkout: { sessions: { listLineItems } },
  }),
  fromMinorUnits: (amount: number) => amount / 100,
}))
vi.mock('@/lib/server/orders.repo', () => ({ createPaidOrder }))
vi.mock('@/lib/server/email', () => ({ sendEmail }))
vi.mock('@/lib/server/emailCopy.repo', () => ({ getCopy }))
vi.mock('@/lib/server/emails/orderConfirmation', () => ({
  orderConfirmationEmail: () => ({ to: 'maya@example.com', subject: 'Order SCR-1060', html: '', text: '' }),
}))
vi.mock('@/lib/server/analytics.repo', () => ({ recordEvent }))

const SHIP_TO = { line1: '22 Rivington Street', line2: null, city: 'London', state: null, postal_code: 'EC2A 3DY', country: 'GB' }

const ORDER = {
  id: 'SCR-1060',
  customer: { name: 'Maya Okafor', email: 'maya@example.com', phone: '', address: ['22 Rivington Street', 'London, EC2A 3DY, GB'] },
  lineItems: [{ productName: '"ANXIETY" — White', size: 'M', qty: 1, unitPrice: 55 }],
  subtotal: 55,
  shipping: 0,
  total: 55,
  date: '2026-10-30',
  status: 'paid',
  paymentStatus: 'paid',
  timeline: { placedAt: '2026-10-30T10:00:00Z', makingAt: null, shippedAt: null, deliveredAt: null },
}

function req() {
  return new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'stripe-signature': 'sig_test' },
    body: 'raw-body',
  })
}

async function run() {
  constructEvent.mockReturnValue({
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_staff',
        payment_status: 'paid',
        metadata: {},
        customer_details: { name: 'Maya Okafor', email: 'maya@example.com', phone: '', address: SHIP_TO },
        collected_information: { shipping_details: { name: 'Maya Okafor', address: SHIP_TO } },
        amount_subtotal: 5500,
        shipping_cost: null,
        amount_total: 5500,
        payment_intent: 'pi_1',
      },
    },
  })
  const { POST } = await import('@/app/api/webhooks/stripe/route')
  return POST(req())
}

const recipients = () => sendEmail.mock.calls.map((c) => c[0].to)

beforeEach(() => {
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
  constructEvent.mockReset()
  listLineItems.mockReset().mockResolvedValue({ data: [] })
  createPaidOrder.mockReset().mockResolvedValue({ order: ORDER, created: true })
  sendEmail.mockReset().mockResolvedValue({ sent: true })
  getCopy.mockReset().mockResolvedValue({})
  recordEvent.mockReset().mockResolvedValue(undefined)
  // The live configuration: the sender is the forwarding inbox.
  vi.stubEnv('ORDER_NOTIFY_EMAIL', '')
  vi.stubEnv('EMAIL_FROM', 'SCR!PTS <orders@scripts.studio>')
})

afterEach(() => vi.unstubAllEnvs())

describe('POST /api/webhooks/stripe — the staff copy', () => {
  it('sends the customer their confirmation and the staff inbox a copy of the new order', async () => {
    const res = await run()
    expect(res.status).toBe(200)
    expect(recipients()).toEqual(['maya@example.com', 'orders@scripts.studio'])
    const staff = sendEmail.mock.calls[1][0]
    expect(staff.subject).toContain('SCR-1060')
    expect(staff.text).toContain('"ANXIETY" — White · M ×1')
  })

  it('sends nothing at all when Stripe redelivers an order already recorded', async () => {
    createPaidOrder.mockResolvedValue({ order: ORDER, created: false })
    const res = await run()
    expect(res.status).toBe(200)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('skips the staff copy, but not the customer, when no staff address is configured', async () => {
    vi.stubEnv('EMAIL_FROM', '')
    const res = await run()
    expect(res.status).toBe(200)
    expect(recipients()).toEqual(['maya@example.com'])
  })

  it('still acknowledges the order to Stripe when the staff copy fails to send', async () => {
    sendEmail.mockResolvedValueOnce({ sent: true }).mockResolvedValueOnce({ sent: false, reason: 'rate limited' })
    const res = await run()
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ received: true, order: 'SCR-1060', created: true })
  })
})
