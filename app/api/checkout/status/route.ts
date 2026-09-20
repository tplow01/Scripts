import Stripe from 'stripe'

import { fail, ok } from '@/lib/server/http'
import { findOrderBySession } from '@/lib/server/orders.repo'
import { isStripeConfigured, stripe } from '@/lib/server/stripe'
import { isDatabaseConfigured } from '@/lib/server/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET ?session_id=… — has the webhook recorded this order yet?
 *
 * The shopper returns from Stripe before the webhook necessarily lands, so the
 * confirmation page polls this. Only the session's own buyer has the id (it's
 * in their return URL), and the reply deliberately omits their address and
 * phone — the page only needs to show what they bought.
 */
export async function GET(req: Request) {
  if (!isDatabaseConfigured()) return fail(503, 'The database is not configured.')

  const sessionId = new URL(req.url).searchParams.get('session_id')
  if (!sessionId) return fail(400, 'Missing session_id.')

  const order = await findOrderBySession(sessionId)
  if (!order) return ok({ status: 'pending', paid: await sessionPaid(sessionId) })

  return ok({
    status: 'ready',
    order: {
      number: order.id,
      items: order.lineItems.map((l) => ({
        name: l.productName,
        size: l.size,
        qty: l.qty,
        lineTotal: l.unitPrice * l.qty,
      })),
      total: order.total,
    },
  })
}

/**
 * Did Stripe actually take payment for this session?
 *
 * `true`  — paid; the order just hasn't been written yet (webhook in flight).
 * `false` — no such session, or it was never paid. Never say "payment received".
 * `null`  — couldn't find out (Stripe unreachable/unconfigured). Say nothing.
 */
async function sessionPaid(sessionId: string): Promise<boolean | null> {
  if (!/^cs_/.test(sessionId)) return false
  if (!isStripeConfigured()) return null
  try {
    const session = await stripe().checkout.sessions.retrieve(sessionId)
    return session.payment_status === 'paid'
  } catch (err) {
    return err instanceof Stripe.errors.StripeInvalidRequestError ? false : null
  }
}
