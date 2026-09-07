import { requireAdmin } from '@/lib/server/auth'
import { fail, notConfigured, ok } from '@/lib/server/http'
import { setOrderStatus } from '@/lib/server/orders.repo'
import { sendEmail } from '@/lib/server/email'
import { orderShippedEmail } from '@/lib/server/emails/orderShipped'
import { orderDeliveredEmail } from '@/lib/server/emails/orderDelivered'
import { getCopy } from '@/lib/server/emailCopy.repo'
import { isDatabaseConfigured } from '@/lib/server/supabase'
import { orderStatusSchema } from '@/lib/schemas/product'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

/** PATCH — advance fulfilment status; the repo stamps the timeline. */
export async function PATCH(req: Request, { params }: Ctx) {
  const denied = await requireAdmin()
  if (denied) return denied
  if (!isDatabaseConfigured()) return notConfigured()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail(400, 'Expected a JSON body.')
  }

  const parsed = orderStatusSchema.safeParse(body)
  if (!parsed.success) return fail(422, 'That status is not valid.', parsed.error.flatten())

  const { id } = await params
  const { order, changed } = await setOrderStatus(id, parsed.data.status)
  if (!order) return fail(404, 'No order with that id.')

  // Only on the actual transition. The back office can PATCH the same status
  // repeatedly, and each one must not mail the customer again. Moving to
  // 'making' is bookkeeping — the customer hears nothing until it ships.
  const mail =
    changed && parsed.data.status === 'shipped'
      ? { build: orderShippedEmail, template: 'order_shipped' as const, label: 'shipping notice' }
      : changed && parsed.data.status === 'delivered'
        ? { build: orderDeliveredEmail, template: 'order_delivered' as const, label: 'thank-you' }
        : null

  if (mail) {
    // Heath's wording from the back office; falls back to the defaults.
    const copy = await getCopy(mail.template)
    const result = await sendEmail(mail.build(order, copy))
    if (!result.sent) {
      console.error(`[order ${order.id}] ${mail.label} not sent: ${result.reason}`)
    }
  }

  return ok({ order })
}
