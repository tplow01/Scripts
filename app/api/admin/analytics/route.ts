import { requireAdmin } from '@/lib/server/auth'
import { ok } from '@/lib/server/http'
import { getAnalyticsBundle } from '@/lib/server/analytics.repo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_DAYS = [7, 14, 30] as const
type Days = (typeof VALID_DAYS)[number]

function parseDays(req: Request): Days {
  const raw = Number(new URL(req.url).searchParams.get('days'))
  return (VALID_DAYS as readonly number[]).includes(raw) ? (raw as Days) : 14
}

export async function GET(req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  return ok(await getAnalyticsBundle(parseDays(req)))
}
