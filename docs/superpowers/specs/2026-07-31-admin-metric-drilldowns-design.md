# Admin Metric Drill-Downs — SaaS Detail Pages

**Date:** 2026-07-31
**Scope:** Third admin iteration (after `2026-07-30-admin-dashboard-prototype-design.md` and `2026-07-31-admin-v2-design.md`, both merged). Clicking any Overview stat card opens a full-page SaaS-style drill-down. Still mock-data/no-backend; same `AdminProvider` + localStorage pattern, no new dependencies.

## Route & navigation

- One dynamic route: `app/office-scr1pts-x7k2/metrics/[metric]/page.tsx` with `metric ∈ { revenue, orders, aov, visitors }`. Unknown metric → `notFound()`.
- Each Overview `StatCard` becomes a link (`adminPath('metrics/revenue')` etc.) — whole card clickable, hover lift, small "view →" affordance on hover. StatCard gains an optional `href` prop; without it it renders as today.
- Drill-down page header: breadcrumb `Overview / <Metric>` (Overview segment links back), no sidebar changes.

## Shared page template

`components/admin/MetricPage.tsx` renders from a per-metric config (defined in the page file):

1. **Header block:** breadcrumb; metric title (40px Bebas); headline value for the selected range + delta badge vs the previous same-length period (reuses `delta()`; visitors compares against the preceding window of the traffic dataset).
2. **Range selector:** pill toggle `7d / 14d / 30d` (default 14d), pink active state, keyboard focusable. Selecting a range recomputes everything on the page; the chart crossfades (~150ms opacity) on change. Range state is local (`useState`), not in the URL.
3. **Large chart:** existing hand-rolled SVG charts (`LineChart`/`BarChart`) at ~200px height, upgraded (see below).
4. **Breakdown row:** 2–3 metric-specific `Card`s.
5. **Data table:** the rows behind the number, range-filtered, using the admin table conventions (right-aligned tabular-nums, hover rows, empty state).

### Chart upgrades (`components/admin/charts.tsx`)
- Optional `ticks?: string[]` prop: sparse x-axis day labels (first / middle / last) rendered under the chart in 8px grey.
- Hover/tap value readout: an invisible per-day hit column; hovering shows a small tooltip box (date + value(s)) positioned above the column, and a vertical guide line. Implemented with plain React state — still no chart library. Touch: tap toggles the same readout.
- `BarChart` keeps `<title>` fallbacks; `LineChart` gets the same values via the new hover readout (closes the v2 parked "LineChart lacks tooltips" note).

## Per-metric content

All metrics derive live from store orders except traffic (mock dataset). "Range" = last N days ending at the newest order date (orders-derived metrics) or the last traffic date (visitors).

### Revenue (`/metrics/revenue`)
- Headline: range revenue sum + delta. Chart: revenue `BarChart` by day.
- Breakdown cards: **Revenue by product** (top 5, name + bar + $ amount); **Payment split** (paid vs refunded $ with pink/grey pills).
- Table: orders in range (id, customer, date, total, status) sorted newest first; row click opens the existing `OrderDrawer`.

### Orders (`/metrics/orders`)
- Headline: order count + delta. Chart: orders-per-day `BarChart`.
- Breakdown cards: **Status mix** (pending/shipped/delivered counts + % of range); **Avg items per order** (mean of Σ qty, 1 decimal).
- Table: same order table as revenue.

### AOV (`/metrics/aov`)
- Headline: range AOV (range revenue ÷ range orders, $0 when none) + delta. Chart: AOV-by-day `LineChart` — days with no orders are skipped (gaps, not zeros; implemented by splitting into segments or omitting points — the chart must not dip to 0 on empty days; simplest compliant approach: only plot days with orders as a single series of those points with matching sparse ticks).
- Breakdown cards: **Highest order** and **Lowest order** in range (id, customer, total; click opens OrderDrawer).
- Table: orders in range sorted by total descending.

### Visitors (`/metrics/visitors`)
- Headline: visitors sum in range + delta vs preceding window. Chart: visitors (pink) + page views (grey) `LineChart`.
- Breakdown cards: **Conversion rate** (orders in range ÷ visitors in range, 1 decimal %, "—" when visitors 0); **Top pages** (static ranked list in the traffic mock: `/`, `/products/rage-black`, `/basement`, `/products/love-white`, `/inventory` with view counts scaled to the range); **Devices** (mobile vs desktop % as a split bar, from the mock).
- Table: daily traffic rows (date, visitors, page views, orders that day, conversion %).

## Data layer

- **New `lib/admin/stats.ts`** — move the v2 stats helpers (`revenueByDay`, `topProducts`, `statusCounts`, `customerStats`, `delta`) out of `store.tsx` (it has grown past one responsibility) and add: `ordersInRange(orders, days)`, `countByDay(orders, days)`, `aovPoints(orders, days)` (only days with orders: `{date, aov}[]`), `revenueByProduct(orders, days, limit)`, `paymentSplit(orders, days)`, `avgItemsPerOrder(orders, days)`, `minMaxOrders(orders, days)`, `trafficInRange(traffic, days)`, `conversionRate(ordersCount, visitors)`. All pure, all unit-tested. `store.tsx` re-exports the moved five so existing imports (Overview) keep working, or Overview's imports update — pick ONE: update Overview's imports to `lib/admin/stats` and remove them from store.tsx exports.
- **`lib/admin/mockTraffic.ts` extended to 30 days** (2026-07-01 → 2026-07-30, same plausible upward trend; `TRAFFIC_PREV_TOTALS` recomputed for the 14d comparison and per-range previous windows derived from the 30-day array where available, falling back to `TRAFFIC_PREV_TOTALS` scaled — simplest compliant rule: previous window = the N days immediately before the selected range inside the dataset; if fewer than N days remain, compare against what exists; if none, delta is flat). Adds `TOP_PAGES: { path: string; views: number }[]` (5 entries, views for the full 30d — range-scaled by visitors share) and `DEVICE_SPLIT = { mobile: number; desktop: number }` (percentages summing to 100).
- Order seeds unchanged — 30d ranges legitimately show a quiet first half.

## Error handling / edge cases

- Unknown `[metric]` slug → `notFound()`.
- Empty range (no orders): headline $0/0, charts render baseline with "No orders in this range" line, tables show the empty state; deltas flat — never NaN/∞ (all division guarded).
- AOV chart with a single qualifying day renders the flat-line fallback already built into `LineChart`.
- Hover readout never renders off-viewport (clamp x position at both edges).
- Range toggle with traffic data shorter than requested (can't happen at 30d cap, but guard: slice to what exists).

## Testing

- Vitest on all new `lib/admin/stats.ts` helpers: range filtering boundaries (day N inclusive), AOV gap behaviour (no zero-days), conversion rate zero-visitor guard, previous-window delta derivation, paymentSplit/minMax on empty input.
- Seed test extended: 30 traffic entries consecutive, TOP_PAGES 5 entries, DEVICE_SPLIT sums to 100.
- Manual: all four pages from their stat cards; range toggle recomputes headline/chart/cards/table; chart hover readouts; OrderDrawer opens from revenue/orders/aov tables and cards; breadcrumb back; mobile layout (range pills wrap, charts shrink, tables scroll).

## Out of scope

Real analytics wiring, URL-persisted range state, CSV export, date-range picker, customers drill-down — later.
