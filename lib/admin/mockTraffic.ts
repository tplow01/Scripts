/**
 * Mock site analytics — the one purely-fake dataset on the dashboard.
 * Swapped for real analytics (Vercel Analytics / GA4) in a later phase.
 * Static: not in the store, not persisted.
 */
export const TRAFFIC_14D: { date: string; visitors: number; pageViews: number }[] = [
  { date: '2026-07-17', visitors: 128, pageViews: 342 },
  { date: '2026-07-18', visitors: 141, pageViews: 371 },
  { date: '2026-07-19', visitors: 133, pageViews: 355 },
  { date: '2026-07-20', visitors: 152, pageViews: 401 },
  { date: '2026-07-21', visitors: 149, pageViews: 415 },
  { date: '2026-07-22', visitors: 167, pageViews: 458 },
  { date: '2026-07-23', visitors: 158, pageViews: 430 },
  { date: '2026-07-24', visitors: 181, pageViews: 512 },
  { date: '2026-07-25', visitors: 196, pageViews: 549 },
  { date: '2026-07-26', visitors: 172, pageViews: 468 },
  { date: '2026-07-27', visitors: 204, pageViews: 587 },
  { date: '2026-07-28', visitors: 218, pageViews: 634 },
  { date: '2026-07-29', visitors: 226, pageViews: 671 },
  { date: '2026-07-30', visitors: 239, pageViews: 702 },
]

/** Totals for the 14 days before TRAFFIC_14D — drives the "vs previous period" delta. */
export const TRAFFIC_PREV_TOTALS = { visitors: 2261, pageViews: 5904 }
