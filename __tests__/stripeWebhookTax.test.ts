// __tests__/stripeWebhookTax.test.ts
//
// Checkout prices every line item tax-exclusive: where Stripe Tax has a
// registration, the buyer pays $55 plus their state's tax. The webhook is the
// only thing that writes an order, so it is where that tax amount is captured.
import { beforeEach, describe, expect, it, vi } from 'vitest'

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

const SHIP_TO = { line1: '655 Valencia St', line2: null, city: 'San Francisco', state: 'CA', postal_code: '94110', country: 'US' }

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
    id: 'cs_test_tax',
    payment_status: 'paid',
    metadata: {},
    customer_details: { name: 'Maya Okafor', email: 'maya@example.com', phone: '', address: SHIP_TO },
    collected_information: { shipping_details: { name: 'Maya Okafor', address: SHIP_TO } },
    amount_subtotal: 5500,
    shipping_cost: null,
    total_details: { amount_discount: 0, amount_shipping: 0, amount_tax: 0 },
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
    order: { id: 'SCR-1061', customer: { name: 'Maya Okafor', email: 'maya@example.com', phone: '', address: [] } },
    created: true,
  })
  sendEmail.mockReset().mockResolvedValue({ sent: true })
  getCopy.mockReset().mockResolvedValue({})
  recordEvent.mockReset().mockResolvedValue(undefined)
})

describe('POST /api/webhooks/stripe — sales tax', () => {
  it('records the tax Stripe added on top, so the order adds up: $55 + $4.95 = $59.95', async () => {
    const input = await run(session({
      total_details: { amount_discount: 0, amount_shipping: 0, amount_tax: 495 },
      amount_total: 5995,
    }))
    expect(input.subtotal).toBe(55)
    expect(input.tax).toBe(4.95)
    expect(input.total).toBe(59.95)
  })

  it('records zero tax when Stripe added none, which is every order until the first state is registered', async () => {
    const input = await run(session())
    expect(input.tax).toBe(0)
    expect(input.total).toBe(55)
  })

  it('records zero tax when the payload carries no totals breakdown at all', async () => {
    const input = await run(session({ total_details: null }))
    expect(input.tax).toBe(0)
  })
})
