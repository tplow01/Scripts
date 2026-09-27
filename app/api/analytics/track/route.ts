import { fail } from '@/lib/server/http'
import { isDatabaseConfigured } from '@/lib/server/supabase'
import { trackEventSchema } from '@/lib/schemas/analytics'
import { checkRateLimit } from '@/lib/server/rateLimit'
import { isLikelyBot } from '@/lib/server/botFilter'
import { recordEvent } from '@/lib/server/analytics.repo'
import type { ClientAnalyticsEvent } from '@/lib/analyticsEvents'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

/**
 * POST — one funnel event. Always resolves fast and never throws in a way
 * that reaches the page: a tracking gap is fine, a broken site is not.
 */
export async function POST(req: Request) {
  if (!isDatabaseConfigured()) return new Response(null, { status: 204 })

  if (isLikelyBot(req.headers.get('user-agent'))) {
    return new Response(null, { status: 204 })
  }

  if (!checkRateLimit(`analytics:${clientIp(req)}`, { limit: 60, windowMs: 60_000 })) {
    return fail(429, 'Too many events.')
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail(400, 'Expected a JSON body.')
  }

  const parsed = trackEventSchema.safeParse(body)
  if (!parsed.success) return fail(422, 'That event is not valid.', parsed.error.flatten())

  try {
    await recordEvent({
      event: parsed.data.event as ClientAnalyticsEvent,
      sessionId: parsed.data.sessionId,
      deviceType: parsed.data.deviceType,
      path: parsed.data.path ?? null,
      meta: parsed.data.meta,
    })
  } catch (err) {
    // A tracking failure must never surface to the visitor.
    console.error('[analytics] recordEvent failed:', err)
  }

  return new Response(null, { status: 204 })
}
