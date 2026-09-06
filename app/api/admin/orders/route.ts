import { requireAdmin } from '@/lib/server/auth'
import { ok } from '@/lib/server/http'
import { listOrders } from '@/lib/server/orders.repo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied

  return ok({ orders: await listOrders() })
}
