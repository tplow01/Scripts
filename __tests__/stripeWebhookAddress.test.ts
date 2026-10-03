// __tests__/stripeWebhookAddress.test.ts
//
// The webhook is the only thing that writes an order, so it decides where the
// shirt is sent. Stripe Checkout collects a SHIPPING address (where to send
// it) separately from the card's BILLING address, and the two differ for a
// gift or a card registered at a parent's house. The order must carry the
// shipping one.
import { describe, expect, it, vi, beforeEach } from 'vitest'

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
  orderConfirmationEmail: () => ({ to: 'a@b.com', subject: '', html: '', text: '' }),
}))
vi.mock('@/lib/server/analytics.repo', () => ({ recordEvent }))

const BILLING = { line1: '1 Market St', line2: null, city: 'San Francisco', state: 'CA', postal_code: '94105', country: 'US' }
const SHIP_TO = { line1: '22 Rivington Street', line2: 'Flat 4', city: 'London', state: null, postal_code: 'EC2A 3DY', country: 'GB' }

function req() {
  return new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'stripe-signature': 'sig_test' },
    body: 'raw-body',
  })
}

/** A completed, paid session. Override any field per test. */
function session(over: Record<string, unknown> = {}) {
  return {
    id: 'cs_test_addr',
    payment_status: 'paid',
    metadata: {},
    customer_details: { name: 'Maya Okafor', email: 'maya@example.com', phone: '+1 415 555 0123', address: BILLING },
    collected_information: { shipping_details: { name: 'Maya Okafor', address: SHIP_TO } },
    amount_subtotal: 5500,
    shipping_cost: null,
    amount_total: 5500,
    payment_intent: 'pi_1',
    ...over,
  }
}

async function run(s: ReturnType<typeof session>) {
  constructEvent.mockReturnValue({ type: 'checkout.session.completed', data: { object: s } })
  const { POST } = await import('@/app/api/webhooks/stripe/route')
  const res = await POST(req())
  expect(res.status).toBe(200)
  expect(createPaidOrder).toHaveBeenCalledTimes(1)
  return createPaidOrder.mock.calls[0][0]
}

beforeEach(() => {
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
  constructEvent.mockReset()
  listLineItems.mockReset().mockResolvedValue({ data: [] })
  createPaidOrder.mockReset().mockResolvedValue({
    order: { id: 'ORD-1', customer: { name: 'A', email: 'a@b.com', phone: '', address: [] } },
    created: true,
  })
  sendEmail.mockReset().mockResolvedValue({ sent: true })
  getCopy.mockReset().mockResolvedValue({})
  recordEvent.mockReset().mockResolvedValue(undefined)
})

describe('POST /api/webhooks/stripe — where the order ships', () => {
  it('records the collected shipping address, not the card billing address', async () => {
    const input = await run(session())
    expect(input.customer.address).toEqual(['22 Rivington Street, Flat 4', 'London, EC2A 3DY, GB'])
    expect(input.customer.address.join(' ')).not.toContain('Market St')
  })

  it('keeps the buyer as the customer even when the parcel goes elsewhere', async () => {
    const input = await run(session())
    expect(input.customer.name).toBe('Maya Okafor')
    expect(input.customer.email).toBe('maya@example.com')
  })

  it('puts the recipient on the first address line when it is not the buyer', async () => {
    // A gift: Maya pays, Dev receives. The label must say Dev.
    const input = await run(session({
      collected_information: { shipping_details: { name: 'Dev Patel', address: SHIP_TO } },
    }))
    expect(input.customer.name).toBe('Maya Okafor')
    expect(input.customer.address[0]).toBe('Dev Patel')
    expect(input.customer.address).toHaveLength(3)
  })

  it('falls back to the billing address only when no shipping address was collected', async () => {
    // Older sessions, or a future digital drop with no address collection.
    const input = await run(session({ collected_information: null }))
    expect(input.customer.address).toEqual(['1 Market St', 'San Francisco, CA 94105, US'])
  })

  it('treats a session with no shipping rate as zero shipping (flat pricing sends none)', async () => {
    const input = await run(session({ shipping_cost: null }))
    expect(input.shipping).toBe(0)
    expect(input.total).toBe(55)
  })
})
