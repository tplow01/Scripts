/**
 * Mock site analytics — the one purely-fake dataset on the dashboard.
 * Swapped for real analytics (Vercel Analytics / GA4) in a later phase.
 * Static: not in the store, not persisted.
 */
export const TRAFFIC_30D: { date: string; visitors: number; pageViews: number }[] = [
  { date: '2026-07-01', visitors: 84, pageViews: 231 },
  { date: '2026-07-02', visitors: 91, pageViews: 244 },
  { date: '2026-07-03', visitors: 88, pageViews: 236 },
  { date: '2026-07-04', visitors: 103, pageViews: 279 },
  { date: '2026-07-05', visitors: 97, pageViews: 260 },
  { date: '2026-07-06', visitors: 112, pageViews: 305 },
  { date: '2026-07-07', visitors: 106, pageViews: 288 },
  { date: '2026-07-08', visitors: 118, pageViews: 322 },
  { date: '2026-07-09', visitors: 111, pageViews: 301 },
  { date: '2026-07-10', visitors: 124, pageViews: 341 },
  { date: '2026-07-11', visitors: 132, pageViews: 366 },
  { date: '2026-07-12', visitors: 121, pageViews: 330 },
  { date: '2026-07-13', visitors: 138, pageViews: 383 },
  { date: '2026-07-14', visitors: 129, pageViews: 352 },
  { date: '2026-07-15', visitors: 144, pageViews: 398 },
  { date: '2026-07-16', visitors: 136, pageViews: 371 },
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

/** Ranked pages for the visitors drill-down; views are full-30-day totals. */
export const TOP_PAGES: { path: string; views: number }[] = [
  { path: '/', views: 4210 },
  { path: '/products/rage', views: 1875 },
  { path: '/basement', views: 1432 },
  { path: '/products/love', views: 1204 },
  { path: '/inventory', views: 986 },
]

/** Mobile/desktop visit share, percentages summing to 100. */
export const DEVICE_SPLIT = { mobile: 68, desktop: 32 }
