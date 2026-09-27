/**
 * The 13 real events, in the order a visitor actually hits them: arrival,
 * exploration, Basement discovery, purchase. This is the single TypeScript
 * source of truth — the migration's CHECK constraint lists the same 13
 * strings and must be kept in sync by hand (see __tests__/analytics.test.ts's
 * drift-guard test).
 *
 * `device_type` is deliberately not here: the source event table listed it
 * as a 14th row, but "mobile vs desktop behaviour" only makes sense as a
 * property on every other event, not a thing that happens on its own — it's
 * a column on the row, not an event name.
 */
export const ANALYTICS_EVENTS = [
  'click_to_start',
  'inventory_shortcut',
  'npc_interaction',
  'karl_interaction',
  'vinyl_interaction',
  'basement_discovered',
  'inventory_view',
  'basement_view',
  'product_click_inventory',
  'product_click_basement',
  'add_to_cart',
  'checkout_started',
  'purchase',
] as const

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number]

/** Everything except 'purchase' — the only names the browser may post. */
export type ClientAnalyticsEvent = Exclude<AnalyticsEventName, 'purchase'>
