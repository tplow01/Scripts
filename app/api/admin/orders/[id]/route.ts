import { requireAdmin } from '@/lib/server/auth'
import { fail, notConfigured, ok } from '@/lib/server/http'
import { setOrderStatus } from '@/lib/server/orders.repo'
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
  const order = await setOrderStatus(id, parsed.data.status)
  if (!order) return fail(404, 'No order with that id.')
  return ok({ order })
}
