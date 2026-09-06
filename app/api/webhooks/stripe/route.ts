import type Stripe from 'stripe'

import { fail, ok } from '@/lib/server/http'
import { createPaidOrder, type NewOrderLine } from '@/lib/server/orders.repo'
import { fromMinorUnits, isStripeConfigured, stripe } from '@/lib/server/stripe'
import { sendEmail } from '@/lib/server/email'
import { orderConfirmationEmail } from '@/lib/server/emails/orderConfirmation'

// Node runtime, not edge: signature verification needs the raw request body.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Stripe calls this when a payment completes. It is the ONLY thing that writes
 * an order — the browser never does, because a browser can be closed, refreshed
 * or lied to. If the customer's connection drops the moment after paying, this
 * still fires and the order still exists.
 *
 * Two rules this handler lives by:
 *   1. Verify the signature. Anyone can POST here; only Stripe can sign.
 *   2. Be idempotent. Stripe retries on any non-2xx, and delivers at least once
 *      — so the same event will arrive twice sooner or later.
 */
export async function POST(req: Request) {
  if (!isStripeConfigured()) return fail(503, 'Payments are not configured.')

  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) return fail(503, 'STRIPE_WEBHOOK_SECRET is not set.')

  const signature = req.headers.get('stripe-signature')
  if (!signature) return fail(400, 'Missing stripe-signature header.')

  // Must be the raw text. Parsing to JSON first would change the bytes and
  // every signature check would fail.
  const raw = await req.text()

  let event: Stripe.Event
  try {
    event = stripe().webhooks.constructEvent(raw, signature, secret)
  } catch (err) {
    // Do not echo the reason back — an attacker probing this endpoint learns
    // nothing beyond "rejected".
    console.error('[stripe webhook] bad signature:', err instanceof Error ? err.message : err)
    return fail(400, 'Signature verification failed.')
  }

  if (event.type !== 'checkout.session.completed') {
    // Acknowledge everything else, or Stripe retries it forever.
    return ok({ received: true, ignored: event.type })
  }

  const session = event.data.object as Stripe.Checkout.Session

  // `complete` alone isn't enough — a session can complete unpaid.
  if (session.payment_status !== 'paid') {
    return ok({ received: true, skipped: `payment_status=${session.payment_status}` })
  }

  try {
    const lineItems = await stripe().checkout.sessions.listLineItems(session.id, {
      limit: 100,
      expand: ['data.price.product'],
    })

    const lines: NewOrderLine[] = lineItems.data.map((item) => {
      const product = item.price?.product as Stripe.Product | undefined
      return {
        // Written into product_data.metadata when the session was created.
        variantId: product?.metadata?.variant_id ?? null,
        productName: product?.metadata?.product_name ?? item.description ?? 'Unknown item',
        size: product?.description ?? '',
        qty: item.quantity ?? 1,
        unitPrice: fromMinorUnits(item.price?.unit_amount ?? 0),
      }
    })

    const d = session.customer_details
    const a = d?.address
    const address = [
      [a?.line1, a?.line2].filter(Boolean).join(', '),
      [a?.city, [a?.state, a?.postal_code].filter(Boolean).join(' '), a?.country]
        .filter(Boolean)
        .join(', '),
    ].filter(Boolean)

    const { order, created } = await createPaidOrder({
      stripeSessionId: session.id,
      stripePaymentIntent:
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id ?? null,
      customer: {
        name: d?.name ?? '',
        email: d?.email ?? '',
        phone: d?.phone ?? '',
        address,
      },
      lines,
      subtotal: fromMinorUnits(session.amount_subtotal ?? 0),
      shipping: fromMinorUnits(session.shipping_cost?.amount_total ?? 0),
      total: fromMinorUnits(session.amount_total ?? 0),
    })

    // Only a genuinely new order earns an email. Stripe redelivers, and a
    // retry must not tell the customer twice. Awaited rather than fired and
    // forgotten: a serverless function can be frozen the moment it responds.
    // sendEmail never throws — a mail failure must not cost a paid order.
    if (created) {
      const result = await sendEmail(orderConfirmationEmail(order))
      if (!result.sent) {
        console.error(`[order ${order.id}] confirmation not sent: ${result.reason}`)
      }
    }

    return ok({ received: true, order: order.id, created })
  } catch (err) {
    // Returning 500 makes Stripe retry, which is what we want for a transient
    // database problem — the payment already succeeded and must not be lost.
    console.error('[stripe webhook] failed to record order:', err)
    return fail(500, 'Could not record the order.')
  }
}
