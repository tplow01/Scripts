// __tests__/stripeWebhookAnalytics.test.ts
//
// Focused coverage for the one link the whole-branch review flagged as
// untested: a recordEvent() failure inside the webhook must never turn a
// paid order into a failed webhook response (Stripe would otherwise retry
// forever, and the order/email path must be unaffected).
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

function req(body = 'raw-body') {
  return new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'stripe-signature': 'sig_test' },
    body,
  })
}

beforeEach(() => {
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'

  constructEvent.mockReset()
  listLineItems.mockReset().mockResolvedValue({ data: [] })
  createPaidOrder.mockReset().mockResolvedValue({
    order: {
      id: 'ORD-1',
      customer: { name: 'A', email: 'a@b.com', phone: '', address: [] },
    },
    created: true,
  })
  sendEmail.mockReset().mockResolvedValue({ sent: true })
  getCopy.mockReset().mockResolvedValue({})
  recordEvent.mockReset()

  const session = {
    id: 'cs_test_1',
    payment_status: 'paid',
    metadata: { analytics_session_id: 'sess-123' },
    customer_details: { name: 'A', email: 'a@b.com', phone: '', address: {} },
    amount_subtotal: 1000,
    shipping_cost: { amount_total: 0 },
    amount_total: 1000,
    payment_intent: 'pi_1',
  }
  constructEvent.mockReturnValue({
    type: 'checkout.session.completed',
    data: { object: session },
  })
})

describe('POST /api/webhooks/stripe — recordEvent resilience', () => {
  it('still returns 2xx and records the order when recordEvent rejects', async () => {
    recordEvent.mockRejectedValue(new Error('db unreachable'))

    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const res = await POST(req())

    expect(res.status).toBeGreaterThanOrEqual(200)
    expect(res.status).toBeLessThan(300)
    const body = await res.json()
    expect(body).toMatchObject({ received: true, order: 'ORD-1', created: true })

    // The order and its confirmation email are unaffected by the analytics failure.
    expect(createPaidOrder).toHaveBeenCalledTimes(1)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(recordEvent).toHaveBeenCalledTimes(1)
  })

  it('carries the analytics_session_id from session metadata into the purchase event', async () => {
    recordEvent.mockResolvedValue(undefined)

    const { POST } = await import('@/app/api/webhooks/stripe/route')
    await POST(req())

    expect(recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'purchase', sessionId: 'sess-123' }),
    )
  })
})
