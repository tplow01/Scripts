import 'server-only'

import { isDatabaseConfigured, serverClient } from './supabase'
import type { AnalyticsEventName } from '@/lib/analyticsEvents'

// ── Writes ────────────────────────────────────────────────────────────────

export interface RecordEventInput {
  event: AnalyticsEventName
  sessionId: string | null
  deviceType: 'mobile' | 'desktop' | null
  path: string | null
  meta?: Record<string, unknown>
}

export async function recordEvent(input: RecordEventInput): Promise<void> {
  if (!isDatabaseConfigured()) return

  const { error } = await serverClient().from('analytics_events').insert({
    session_id: input.sessionId,
    event: input.event,
    device_type: input.deviceType,
    path: input.path,
    meta: input.meta ?? {},
  })
  if (error) throw new Error(`recordEvent(${input.event}): ${error.message}`)
}

// ── Reads (admin only) ───────────────────────────────────────────────────

export interface AnalyticsBundle {
  visitorsByDay: { date: string; visitors: number; pageViews: number }[]
  topPages: { path: string; views: number }[]
  deviceSplit: { mobile: number; desktop: number }
  funnel: { event: string; sessions: number }[]
}

/** Always a fixed lookback, so the admin can slice "current" vs "previous"
 *  windows out of one array client-side — the same trick the old mock
 *  TRAFFIC_30D array supported. */
const VISITOR_LOOKBACK_DAYS = 60

function emptyBundle(): AnalyticsBundle {
  return { visitorsByDay: [], topPages: [], deviceSplit: { mobile: 0, desktop: 0 }, funnel: [] }
}

export async function getAnalyticsBundle(days: 7 | 14 | 30): Promise<AnalyticsBundle> {
  if (!isDatabaseConfigured()) return emptyBundle()

  const db = serverClient()
  const [visitorsRes, pagesRes, deviceRes, funnelRes] = await Promise.all([
    db.rpc('analytics_visitors_by_day', { p_days: VISITOR_LOOKBACK_DAYS }),
    db.rpc('analytics_top_pages', { p_days: days, p_limit: 5 }),
    db.rpc('analytics_device_split', { p_days: days }),
    db.rpc('analytics_funnel', { p_days: days }),
  ])
  if (visitorsRes.error) throw new Error(`analytics_visitors_by_day: ${visitorsRes.error.message}`)
  if (pagesRes.error) throw new Error(`analytics_top_pages: ${pagesRes.error.message}`)
  if (deviceRes.error) throw new Error(`analytics_device_split: ${deviceRes.error.message}`)
  if (funnelRes.error) throw new Error(`analytics_funnel: ${funnelRes.error.message}`)

  const visitorsByDay = (visitorsRes.data as { day: string; visitors: number; page_views: number }[]).map((d) => ({
    date: d.day,
    visitors: d.visitors,
    pageViews: d.page_views,
  }))

  const deviceRows = deviceRes.data as { device_type: 'mobile' | 'desktop'; sessions: number }[]
  const mobileSessions = deviceRows.find((d) => d.device_type === 'mobile')?.sessions ?? 0
  const desktopSessions = deviceRows.find((d) => d.device_type === 'desktop')?.sessions ?? 0
  const totalSessions = mobileSessions + desktopSessions
  // Desktop is 100 - mobile, not its own rounded percentage, so the two
  // always sum to exactly 100 (matching the old DEVICE_SPLIT contract).
  const mobilePct = totalSessions > 0 ? Math.round((mobileSessions / totalSessions) * 100) : 0
  const deviceSplit = { mobile: mobilePct, desktop: totalSessions > 0 ? 100 - mobilePct : 0 }

  return {
    visitorsByDay,
    topPages: pagesRes.data as { path: string; views: number }[],
    deviceSplit,
    funnel: funnelRes.data as { event: string; sessions: number }[],
  }
}
