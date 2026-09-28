# Admin Metric Drill-Downs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full-page SaaS drill-downs for the four Overview stat cards (revenue / orders / aov / visitors) with a 7/14/30d range toggle, upgraded charts with hover readouts, per-metric breakdowns and drill-down tables, per `docs/superpowers/specs/2026-07-31-admin-metric-drilldowns-design.md`.

**Architecture:** New pure stats module `lib/admin/stats.ts` (v2 helpers move here + range helpers added); traffic mock extends to 30 days with top-pages/device data; a `MetricShell` template + one small component per metric under `components/admin/metrics/`; a dynamic `app/office-scr1pts-x7k2/metrics/[metric]/page.tsx` maps slug → component. Charts gain sparse ticks + hover/tap readouts (still hand-rolled SVG).

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind brand tokens, Bebas via `style={{ fontFamily: 'var(--font-bebas)' }}`, lucide-react (installed), Vitest. No new dependencies.

## Global Constraints

- No new dependencies; no chart library — charts stay hand-rolled SVG in `components/admin/charts.tsx`.
- Unknown `[metric]` slug → `notFound()`. Valid slugs exactly: `revenue`, `orders`, `aov`, `visitors`.
- Range toggle: `7d / 14d / 30d`, default 14d, local state (not URL). Everything on the page recomputes from the range; chart crossfades ~150ms opacity on change.
- Ranges end at the newest order date (order-derived metrics) or last traffic date (visitors). Previous window for deltas = the N days immediately before the range within available data; insufficient/empty previous data → flat. Never NaN/∞.
- AOV chart plots ONLY days that have orders — no zero-dips on empty days.
- Conversion rate = orders-in-range ÷ visitors-in-range, 1 decimal %, "—" when visitors 0.
- All division guarded; every list/chart/table has an empty state ("No orders in this range").
- Shared admin conventions: `Card` shell, tabular-nums right-aligned numerics, Bebas headings, pink `#FF8AC7` accent, status tones unchanged.
- Stats move: Overview imports update to `lib/admin/stats`; `store.tsx` no longer exports `revenueByDay/topProducts/statusCounts/customerStats/delta` (single home = stats.ts). `applyOrderStatus`/actions/provider stay in store.tsx.
- Do not touch anything outside: `lib/admin/*`, `components/admin/*`, `app/office-scr1pts-x7k2/*`, `__tests__/admin*`, `PRD.md`.

---

### Task 1: Traffic mock — 30 days, top pages, device split

**Files:**
- Modify: `lib/admin/mockTraffic.ts` (full replacement)
- Modify: `__tests__/adminSeeds.test.ts` (replace the `traffic seed` describe block only)

**Interfaces:**
- Produces: `TRAFFIC_30D: { date: string; visitors: number; pageViews: number }[]` (exactly 30 consecutive days 2026-07-01→2026-07-30), `TOP_PAGES: { path: string; views: number }[]` (5 entries, descending views), `DEVICE_SPLIT: { mobile: number; desktop: number }` (sums to 100). The old `TRAFFIC_14D`/`TRAFFIC_PREV_TOTALS` exports are REPLACED — Task 2 gives Overview its traffic numbers via stats helpers; until Task 2 lands, Overview's imports break `tsc` (plan-mandated, this task's green check is the seeds test file only).

- [ ] **Step 1: Replace the `traffic seed` describe block in `__tests__/adminSeeds.test.ts`**

Update the import line to `import { DEVICE_SPLIT, TOP_PAGES, TRAFFIC_30D } from '@/lib/admin/mockTraffic'` and replace the whole `describe('traffic seed', …)` with:

```ts
describe('traffic seed', () => {
  it('has exactly 30 consecutive days ending 2026-07-30 with plausible ratios', () => {
    expect(TRAFFIC_30D).toHaveLength(30)
    expect(TRAFFIC_30D[0].date).toBe('2026-07-01')
    expect(TRAFFIC_30D[29].date).toBe('2026-07-30')
    for (let i = 1; i < 30; i++) {
      const prev = new Date(`${TRAFFIC_30D[i - 1].date}T00:00:00Z`)
      prev.setUTCDate(prev.getUTCDate() + 1)
      expect(TRAFFIC_30D[i].date).toBe(prev.toISOString().slice(0, 10))
    }
    for (const d of TRAFFIC_30D) {
      expect(d.visitors).toBeGreaterThan(0)
      expect(d.pageViews).toBeGreaterThan(d.visitors)
    }
  })
  it('top pages: 5 entries, descending views; device split sums to 100', () => {
    expect(TOP_PAGES).toHaveLength(5)
    for (let i = 1; i < TOP_PAGES.length; i++) expect(TOP_PAGES[i].views).toBeLessThanOrEqual(TOP_PAGES[i - 1].views)
    expect(DEVICE_SPLIT.mobile + DEVICE_SPLIT.desktop).toBe(100)
  })
})
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run __tests__/adminSeeds.test.ts`
Expected: FAIL (new exports missing).

- [ ] **Step 3: Replace `lib/admin/mockTraffic.ts`**

```ts
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
  { path: '/products/rage-black', views: 1875 },
  { path: '/basement', views: 1432 },
  { path: '/products/love-white', views: 1204 },
  { path: '/inventory', views: 986 },
]

/** Mobile/desktop visit share, percentages summing to 100. */
export const DEVICE_SPLIT = { mobile: 68, desktop: 32 }
```

- [ ] **Step 4: Run the seeds test**

Run: `npx vitest run __tests__/adminSeeds.test.ts`
Expected: PASS. (Overview/`tsc` red on removed `TRAFFIC_14D`/`TRAFFIC_PREV_TOTALS` — fixed in Task 2.)

- [ ] **Step 5: Commit**

```bash
git add lib/admin/mockTraffic.ts __tests__/adminSeeds.test.ts
git commit -m "feat(admin): 30-day traffic seed with top pages and device split"
```

---

### Task 2: Stats module — move v2 helpers, add range helpers, rewire imports

**Files:**
- Create: `lib/admin/stats.ts`
- Modify: `lib/admin/store.tsx` (remove the five stats helpers + their now-unused imports; keep everything else)
- Modify: `app/office-scr1pts-x7k2/page.tsx` (imports only — stats from `@/lib/admin/stats`, traffic via new helpers)
- Modify: `__tests__/adminStore.test.ts` (stats imports move to `@/lib/admin/stats`)
- Test: `__tests__/adminStats.test.ts` (new — covers the NEW helpers)

**Interfaces:**
- Consumes: `AdminOrder`, `OrderStatus` from `lib/admin/types.ts`; `TRAFFIC_30D` from Task 1.
- Produces in `lib/admin/stats.ts` (Tasks 4–5 rely on exact names) — moved verbatim from store.tsx: `revenueByDay`, `topProducts`, `statusCounts`, `customerStats`, `delta`, plus the private `addDays` (moves too). NEW:
  - `newestOrderDate(orders: AdminOrder[]): string | null`
  - `ordersInRange(orders: AdminOrder[], days: number): AdminOrder[]` (range = `days` consecutive days ending at newest order date, inclusive)
  - `countByDay(orders: AdminOrder[], days: number): { date: string; count: number }[]` (consecutive days like `revenueByDay`)
  - `aovPoints(orders: AdminOrder[], days: number): { date: string; aov: number }[]` (ONLY days with ≥1 order; aov = day revenue ÷ day count, rounded)
  - `revenueByProduct(orders: AdminOrder[], days: number, limit?: number): { productName: string; revenue: number }[]` (default limit 5, descending)
  - `paymentSplit(orders: AdminOrder[], days: number): { paid: number; refunded: number }` ($ totals)
  - `avgItemsPerOrder(orders: AdminOrder[], days: number): number` (mean of Σ qty per order, 1 decimal via `Math.round(x*10)/10`; 0 when empty)
  - `minMaxOrders(orders: AdminOrder[], days: number): { min: AdminOrder | null; max: AdminOrder | null }`
  - `prevWindowDelta(orders: AdminOrder[], days: number, value: (o: AdminOrder[]) => number)` → `ReturnType<typeof delta>` (current range vs the `days` immediately before; previous empty → flat)
  - `trafficInRange(traffic: { date: string; visitors: number; pageViews: number }[], days: number): typeof traffic` (last `days` entries; slice to what exists)
  - `trafficPrevWindow(traffic, days)` (the `days` entries before the range; may be shorter/empty)
  - `conversionRate(ordersCount: number, visitors: number): string` (`'—'` when visitors ≤ 0, else 1-decimal percent string like `'2.4%'`)
- `store.tsx` continues to export: state type, actions, `applyOrderStatus`, `parseStoredState`, `seedState`, `NEW_PRODUCT_DEFAULTS`, `AdminProvider`, `useAdmin` — and NOT the moved five.

- [ ] **Step 1: Write the failing test `__tests__/adminStats.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import {
  aovPoints, avgItemsPerOrder, conversionRate, countByDay, delta, minMaxOrders,
  newestOrderDate, ordersInRange, paymentSplit, prevWindowDelta, revenueByProduct,
  trafficInRange, trafficPrevWindow,
} from '@/lib/admin/stats'
import { seedState } from '@/lib/admin/store'
import { TRAFFIC_30D } from '@/lib/admin/mockTraffic'

const orders = seedState().orders // dates 2026-07-16..2026-07-29

describe('range filtering', () => {
  it('newestOrderDate finds 2026-07-29; null on empty', () => {
    expect(newestOrderDate(orders)).toBe('2026-07-29')
    expect(newestOrderDate([])).toBeNull()
  })
  it('ordersInRange is inclusive at both ends', () => {
    const seven = ordersInRange(orders, 7) // 2026-07-23..29
    expect(seven.every((o) => o.date >= '2026-07-23' && o.date <= '2026-07-29')).toBe(true)
    expect(ordersInRange(orders, 30)).toHaveLength(orders.length)
    expect(ordersInRange([], 7)).toHaveLength(0)
  })
  it('countByDay returns exactly N consecutive days summing to range count', () => {
    const days = countByDay(orders, 14)
    expect(days).toHaveLength(14)
    expect(days.reduce((s, d) => s + d.count, 0)).toBe(ordersInRange(orders, 14).length)
  })
})

describe('aovPoints', () => {
  it('only includes days that have orders — no zero-days', () => {
    const pts = aovPoints(orders, 30)
    expect(pts.length).toBeGreaterThan(0)
    for (const p of pts) expect(p.aov).toBeGreaterThan(0)
    const orderDates = new Set(orders.map((o) => o.date))
    for (const p of pts) expect(orderDates.has(p.date)).toBe(true)
  })
  it('empty orders → empty points', () => {
    expect(aovPoints([], 14)).toHaveLength(0)
  })
})

describe('breakdowns', () => {
  it('revenueByProduct descends and respects limit', () => {
    const top = revenueByProduct(orders, 30, 3)
    expect(top.length).toBeLessThanOrEqual(3)
    for (let i = 1; i < top.length; i++) expect(top[i].revenue).toBeLessThanOrEqual(top[i - 1].revenue)
  })
  it('paymentSplit totals match range revenue', () => {
    const { paid, refunded } = paymentSplit(orders, 30)
    const total = ordersInRange(orders, 30).reduce((s, o) => s + o.total, 0)
    expect(paid + refunded).toBe(total)
    expect(refunded).toBeGreaterThan(0) // SCR-1046 is refunded
  })
  it('avgItemsPerOrder is 1-decimal and 0 on empty', () => {
    const avg = avgItemsPerOrder(orders, 30)
    expect(avg).toBeGreaterThan(0)
    expect(avg).toBe(Math.round(avg * 10) / 10)
    expect(avgItemsPerOrder([], 30)).toBe(0)
  })
  it('minMaxOrders finds extremes; nulls on empty', () => {
    const { min, max } = minMaxOrders(orders, 30)
    expect(min!.total).toBeLessThanOrEqual(max!.total)
    expect(minMaxOrders([], 7)).toEqual({ min: null, max: null })
  })
})

describe('deltas and traffic', () => {
  it('prevWindowDelta compares against the preceding window; empty previous → flat', () => {
    const d7 = prevWindowDelta(orders, 7, (o) => o.reduce((s, x) => s + x.total, 0))
    expect(['up', 'down', 'flat']).toContain(d7.dir)
    const d30 = prevWindowDelta(orders, 30, (o) => o.length) // nothing before 30d window
    expect(d30.dir).toBe('flat')
  })
  it('trafficInRange takes the last N entries, sliced to what exists', () => {
    expect(trafficInRange(TRAFFIC_30D, 7)).toHaveLength(7)
    expect(trafficInRange(TRAFFIC_30D, 7)[6].date).toBe('2026-07-30')
    expect(trafficInRange(TRAFFIC_30D, 60)).toHaveLength(30)
  })
  it('trafficPrevWindow returns the window before the range (shorter when data runs out)', () => {
    expect(trafficPrevWindow(TRAFFIC_30D, 7)).toHaveLength(7)
    expect(trafficPrevWindow(TRAFFIC_30D, 14)).toHaveLength(14)
    expect(trafficPrevWindow(TRAFFIC_30D, 30)).toHaveLength(0)
  })
  it('conversionRate guards zero visitors and formats 1 decimal', () => {
    expect(conversionRate(5, 0)).toBe('—')
    expect(conversionRate(5, 200)).toBe('2.5%')
    expect(conversionRate(0, 200)).toBe('0.0%')
  })
  it('delta still lives here after the move', () => {
    expect(delta(110, 100).dir).toBe('up')
  })
})
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run __tests__/adminStats.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Create `lib/admin/stats.ts`**

Move `addDays`, `revenueByDay`, `topProducts`, `statusCounts`, `customerStats`, `delta` VERBATIM from `store.tsx` (imports: `AdminOrder`, `OrderStatus` from `./types`), then append:

```ts
export function newestOrderDate(orders: AdminOrder[]): string | null {
  if (orders.length === 0) return null
  return orders.reduce((m, o) => (o.date > m ? o.date : m), orders[0].date)
}

/** Orders whose date falls in the `days` consecutive days ending at the newest order date (inclusive). */
export function ordersInRange(orders: AdminOrder[], days: number): AdminOrder[] {
  const newest = newestOrderDate(orders)
  if (!newest) return []
  const start = addDays(newest, -(days - 1))
  return orders.filter((o) => o.date >= start && o.date <= newest)
}

export function countByDay(orders: AdminOrder[], days: number): { date: string; count: number }[] {
  const newest = newestOrderDate(orders)
  if (!newest) return []
  const out: { date: string; count: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(newest, -i)
    out.push({ date, count: orders.filter((o) => o.date === date).length })
  }
  return out
}

/** AOV per day, ONLY for days with at least one order — the chart must never dip to zero on quiet days. */
export function aovPoints(orders: AdminOrder[], days: number): { date: string; aov: number }[] {
  return countByDay(orders, days)
    .filter((d) => d.count > 0)
    .map((d) => {
      const dayOrders = orders.filter((o) => o.date === d.date)
      const rev = dayOrders.reduce((s, o) => s + o.total, 0)
      return { date: d.date, aov: Math.round(rev / dayOrders.length) }
    })
}

export function revenueByProduct(orders: AdminOrder[], days: number, limit = 5): { productName: string; revenue: number }[] {
  const rev = new Map<string, number>()
  for (const o of ordersInRange(orders, days))
    for (const li of o.lineItems) rev.set(li.productName, (rev.get(li.productName) ?? 0) + li.qty * li.unitPrice)
  return [...rev.entries()].map(([productName, revenue]) => ({ productName, revenue }))
    .sort((a, b) => b.revenue - a.revenue).slice(0, limit)
}

export function paymentSplit(orders: AdminOrder[], days: number): { paid: number; refunded: number } {
  const split = { paid: 0, refunded: 0 }
  for (const o of ordersInRange(orders, days)) split[o.paymentStatus] += o.total
  return split
}

export function avgItemsPerOrder(orders: AdminOrder[], days: number): number {
  const ranged = ordersInRange(orders, days)
  if (ranged.length === 0) return 0
  const items = ranged.reduce((s, o) => s + o.lineItems.reduce((n, li) => n + li.qty, 0), 0)
  return Math.round((items / ranged.length) * 10) / 10
}

export function minMaxOrders(orders: AdminOrder[], days: number): { min: AdminOrder | null; max: AdminOrder | null } {
  const ranged = ordersInRange(orders, days)
  if (ranged.length === 0) return { min: null, max: null }
  let min = ranged[0], max = ranged[0]
  for (const o of ranged) { if (o.total < min.total) min = o; if (o.total > max.total) max = o }
  return { min, max }
}

/** Current range vs the `days` immediately before it. Empty/zero previous → flat (delta guards). */
export function prevWindowDelta(
  orders: AdminOrder[], days: number, value: (o: AdminOrder[]) => number,
): ReturnType<typeof delta> {
  const newest = newestOrderDate(orders)
  if (!newest) return { pct: 0, dir: 'flat' }
  const start = addDays(newest, -(days - 1))
  const prevStart = addDays(start, -days)
  const prev = orders.filter((o) => o.date >= prevStart && o.date < start)
  return delta(value(ordersInRange(orders, days)), value(prev))
}

type TrafficDay = { date: string; visitors: number; pageViews: number }

/** Last `days` entries, sliced to what exists. */
export function trafficInRange(traffic: TrafficDay[], days: number): TrafficDay[] {
  return traffic.slice(Math.max(0, traffic.length - days))
}

/** The window immediately before the range; shorter (possibly empty) when data runs out. */
export function trafficPrevWindow(traffic: TrafficDay[], days: number): TrafficDay[] {
  const end = Math.max(0, traffic.length - days)
  return traffic.slice(Math.max(0, end - days), end)
}

/** Orders ÷ visitors as a 1-decimal percent string; em-dash when there are no visitors. */
export function conversionRate(ordersCount: number, visitors: number): string {
  if (visitors <= 0) return '—'
  return `${((ordersCount / visitors) * 100).toFixed(1)}%`
}
```

- [ ] **Step 4: Rewire store.tsx and Overview**

- `lib/admin/store.tsx`: delete `addDays`, `revenueByDay`, `topProducts`, `statusCounts`, `customerStats`, `delta` (and the now-unused `OrderStatus`-only-for-stats import if it becomes unused — `OrderStatus` is still used by `applyOrderStatus`/`setOrderStatus`, keep it).
- `app/office-scr1pts-x7k2/page.tsx`: import the five from `@/lib/admin/stats`; replace the traffic imports/uses: `TRAFFIC_14D` → `trafficInRange(TRAFFIC_30D, 14)` (compute once as `const traffic14 = trafficInRange(TRAFFIC_30D, 14)`), and the visitors delta previous value → `trafficPrevWindow(TRAFFIC_30D, 14).reduce((s, d) => s + d.visitors, 0)`.
- `__tests__/adminStore.test.ts`: the stats-helper imports (`revenueByDay`, `topProducts`, `statusCounts`, `customerStats`, `delta`) move to `@/lib/admin/stats`; store-action imports stay.

- [ ] **Step 5: Run everything**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all green, tsc fully clean.

- [ ] **Step 6: Commit**

```bash
git add lib/admin/stats.ts lib/admin/store.tsx app/office-scr1pts-x7k2/page.tsx __tests__/adminStats.test.ts __tests__/adminStore.test.ts
git commit -m "feat(admin): stats module with range helpers, rewire overview"
```

---

### Task 3: Chart upgrades — sparse ticks + hover/tap readout

**Files:**
- Modify: `components/admin/charts.tsx` (full replacement)

**Interfaces:**
- Consumes: nothing new.
- Produces (backward compatible — existing Overview call sites keep working unchanged):
  - `LineChart({ series, height?, ticks?, labels? })` — `ticks?: string[]` renders first/middle/last under the chart; `labels?: string[]` (one per point index, all series same length) enables the hover/tap readout showing the label + each series' value at that index.
  - `BarChart({ values, height?, color?, ticks? })` — same ticks; hover readout uses `values[i].label`/`value` (replaces reliance on `<title>` alone, `<title>` kept).

- [ ] **Step 1: Replace `components/admin/charts.tsx`**

```tsx
'use client'

/** Hand-rolled inline SVG charts — pure presentational, no chart library. */

import { useState } from 'react'

const W = 100 // internal viewBox width; SVG stretches to fill the card

function scaleY(values: number[], height: number): (v: number) => number {
  const max = Math.max(...values, 1)
  return (v) => height - (v / max) * (height - 4) // 4px headroom
}

/** First / middle / last labels under a chart. */
function Ticks({ ticks }: { ticks: string[] }) {
  if (ticks.length === 0) return null
  const shown = [ticks[0], ticks[Math.floor(ticks.length / 2)], ticks[ticks.length - 1]]
  return (
    <div className="mt-1 flex justify-between text-[8px] uppercase tracking-[0.08em] text-grey">
      {shown.map((t, i) => <span key={`${t}-${i}`}>{t}</span>)}
    </div>
  )
}

/**
 * Hover/tap readout: invisible per-index hit columns + a tooltip and guide line.
 * `rows` = the readout lines for index i. Clamped so the tooltip never leaves the chart box.
 */
function Readout({ count, hover, setHover, height, rows }: {
  count: number
  hover: number | null
  setHover: (i: number | null) => void
  height: number
  rows: (i: number) => { label: string; lines: string[] }
}) {
  if (count === 0) return null
  return (
    <div className="absolute inset-x-0 top-0" style={{ height }} onMouseLeave={() => setHover(null)}>
      <div className="absolute inset-0 flex">
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className="flex-1 h-full"
            onMouseEnter={() => setHover(i)}
            onPointerDown={() => setHover(hover === i ? null : i)}
          />
        ))}
      </div>
      {hover !== null && (() => {
        const { label, lines } = rows(hover)
        const centre = ((hover + 0.5) / count) * 100
        const translate = centre < 15 ? '0%' : centre > 85 ? '-100%' : '-50%'
        return (
          <>
            <div className="absolute top-0 bottom-0 w-px bg-paper/25 pointer-events-none" style={{ left: `${centre}%` }} />
            <div
              className="absolute -top-1 -translate-y-full pointer-events-none rounded-lg border border-grey/30 bg-[#0f0f0f] px-2.5 py-1.5 shadow-lg"
              style={{ left: `${centre}%`, transform: `translate(${translate}, -100%)` }}
            >
              <p className="text-[8px] uppercase tracking-[0.08em] text-grey whitespace-nowrap">{label}</p>
              {lines.map((l) => <p key={l} className="text-[11px] text-paper whitespace-nowrap tabular-nums">{l}</p>)}
            </div>
          </>
        )
      })()}
    </div>
  )
}

/** Multi-series line chart. Empty/single-point series render a flat baseline, never a broken path. */
export function LineChart({ series, height = 56, ticks, labels }: {
  series: { color: string; points: number[]; label: string }[]
  height?: number
  ticks?: string[]
  labels?: string[]
}) {
  const [hover, setHover] = useState<number | null>(null)
  const all = series.flatMap((s) => s.points)
  const y = scaleY(all, height)
  const count = labels?.length ?? 0
  return (
    <div>
      <div className="relative">
        <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" role="img" aria-label={series.map((s) => s.label).join(' & ')}>
          <line x1="0" y1={height - 0.5} x2={W} y2={height - 0.5} stroke="rgba(111,111,115,0.35)" strokeWidth="1" />
          {series.map((s) => {
            if (s.points.length === 0) return null
            const step = s.points.length > 1 ? W / (s.points.length - 1) : W
            const d = s.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(2)},${y(p).toFixed(2)}`).join(' ')
            return <path key={s.label} d={s.points.length > 1 ? d : `M0,${y(s.points[0])} L${W},${y(s.points[0])}`} fill="none" stroke={s.color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          })}
        </svg>
        {labels && (
          <Readout
            count={count} hover={hover} setHover={setHover} height={height}
            rows={(i) => ({ label: labels[i], lines: series.map((s) => `${s.label}: ${s.points[i]?.toLocaleString() ?? '—'}`) })}
          />
        )}
      </div>
      {ticks && <Ticks ticks={ticks} />}
      <div className="mt-1.5 flex gap-4">
        {series.map((s) => (
          <span key={s.label} className="text-[8px] uppercase tracking-[0.1em]" style={{ color: s.color }}>— {s.label}</span>
        ))}
      </div>
    </div>
  )
}

/** Daily bar chart; zero-value days render no bar. Empty values render just the baseline. */
export function BarChart({ values, height = 56, color = '#FF8AC7', ticks }: {
  values: { label: string; value: number }[]
  height?: number
  color?: string
  ticks?: string[]
}) {
  const [hover, setHover] = useState<number | null>(null)
  const y = scaleY(values.map((v) => v.value), height)
  const slot = values.length > 0 ? W / values.length : W
  const barW = Math.max(slot * 0.6, 1)
  return (
    <div>
      <div className="relative">
        <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" role="img" aria-label="bar chart">
          <line x1="0" y1={height - 0.5} x2={W} y2={height - 0.5} stroke="rgba(111,111,115,0.35)" strokeWidth="1" />
          {values.map((v, i) =>
            v.value > 0 ? (
              <rect key={v.label} x={(i * slot + (slot - barW) / 2).toFixed(2)} y={y(v.value).toFixed(2)} width={barW.toFixed(2)} height={(height - y(v.value)).toFixed(2)} fill={color} opacity={hover === null || hover === i ? 0.85 : 0.4}>
                <title>{`${v.label}: ${v.value}`}</title>
              </rect>
            ) : null)}
        </svg>
        <Readout
          count={values.length} hover={hover} setHover={setHover} height={height}
          rows={(i) => ({ label: values[i].label, lines: [values[i].value.toLocaleString()] })}
        />
      </div>
      {ticks && <Ticks ticks={ticks} />}
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npx vitest run` — clean/green (Overview call sites unchanged: new props optional).

- [ ] **Step 3: Commit**

```bash
git add components/admin/charts.tsx
git commit -m "feat(admin): chart ticks and hover/tap value readouts"
```

---

### Task 4: Linkable StatCards, MetricShell template, shared orders table

**Files:**
- Modify: `components/admin/StatCard.tsx` (add `href` prop)
- Modify: `app/office-scr1pts-x7k2/page.tsx` (stat cards get hrefs)
- Create: `components/admin/MetricShell.tsx`
- Create: `components/admin/OrdersTable.tsx`

**Interfaces:**
- Consumes: `Card`, `adminPath`, `StatusBadge`, `OrderDrawer`, `AdminOrder`, `delta` shape.
- Produces:
  - `StatCard({ label, value, icon, delta?, href? })` — with `href`, wraps in `next/link`, hover ring + "view →" hint.
  - `MetricShell({ title, headline, delta?, range, onRange, chart, children })` — `range: 7 | 14 | 30`, `onRange(r)`, breadcrumb + headline + pills + crossfading chart region; `children` = breakdown cards + table.
  - `MetricRange = 7 | 14 | 30` exported from MetricShell.
  - `OrdersTable({ orders, onOpen, sortBy? })` — `sortBy?: 'date' | 'total'` (default 'date'), renders id/customer/date/total/status rows, calls `onOpen(order)` on row click, empty state "No orders in this range".

- [ ] **Step 1: Update `components/admin/StatCard.tsx`**

Full replacement:

```tsx
import Link from 'next/link'
import type { ReactNode } from 'react'
import Card from './Card'

const DELTA_STYLE = {
  up: { color: '#5FA36B', mark: '▲' },
  down: { color: '#E05252', mark: '▼' },
  flat: { color: '#6F6F73', mark: '—' },
} as const

export default function StatCard({ label, value, icon, delta, href }: {
  label: string
  value: string
  icon: ReactNode
  delta?: { pct: number; dir: 'up' | 'down' | 'flat' }
  href?: string
}) {
  const d = delta ? DELTA_STYLE[delta.dir] : null
  const body = (
    <Card className={href ? 'group h-full transition-all hover:border-pink/50' : 'h-full'}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-grey">{label}</p>
          <p className="mt-2 text-[36px] leading-none uppercase tracking-[0.04em]" style={{ fontFamily: 'var(--font-bebas)' }}>
            {value}
          </p>
          {delta && d && (
            <p className="mt-1.5 text-[11px]" style={{ color: d.color }}>
              {d.mark} {delta.dir === 'flat' ? 'flat' : `${delta.pct}% vs prev period`}
            </p>
          )}
        </div>
        <span className="text-pink mt-1 flex flex-col items-end gap-2">
          {icon}
          {href && <span className="text-[10px] text-grey opacity-0 group-hover:opacity-100 transition-opacity">view →</span>}
        </span>
      </div>
    </Card>
  )
  return href ? <Link href={href} className="block">{body}</Link> : body
}
```

- [ ] **Step 2: Add hrefs in `app/office-scr1pts-x7k2/page.tsx`**

The four `StatCard`s gain `href={adminPath('metrics/revenue')}`, `…('metrics/orders')`, `…('metrics/aov')`, `…('metrics/visitors')` respectively.

- [ ] **Step 3: Create `components/admin/MetricShell.tsx`**

```tsx
'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { adminPath } from '@/lib/admin/config'

export type MetricRange = 7 | 14 | 30
const RANGES: MetricRange[] = [7, 14, 30]

const DELTA_STYLE = {
  up: { color: '#5FA36B', mark: '▲' },
  down: { color: '#E05252', mark: '▼' },
  flat: { color: '#6F6F73', mark: '—' },
} as const

/** Shared SaaS drill-down frame: breadcrumb, headline + delta, range pills, crossfading chart, content below. */
export default function MetricShell({ title, headline, delta, range, onRange, chart, children }: {
  title: string
  headline: string
  delta?: { pct: number; dir: 'up' | 'down' | 'flat' }
  range: MetricRange
  onRange: (r: MetricRange) => void
  chart: ReactNode
  children: ReactNode
}) {
  const d = delta ? DELTA_STYLE[delta.dir] : null
  return (
    <div>
      <nav className="text-[12px] text-grey">
        <Link href={adminPath()} className="hover:text-paper transition-colors">Overview</Link>
        <span className="mx-2">/</span>
        <span className="text-paper/80">{title}</span>
      </nav>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[40px] leading-none uppercase tracking-[0.04em]" style={{ fontFamily: 'var(--font-bebas)' }}>
            {title}
          </h1>
          <p className="mt-2 flex items-baseline gap-3">
            <span className="text-[36px] leading-none uppercase tracking-[0.04em] tabular-nums" style={{ fontFamily: 'var(--font-bebas)' }}>
              {headline}
            </span>
            {delta && d && (
              <span className="text-[11px]" style={{ color: d.color }}>
                {d.mark} {delta.dir === 'flat' ? 'flat' : `${delta.pct}% vs prev period`}
              </span>
            )}
          </p>
        </div>
        <div className="flex rounded-lg border border-grey/30 overflow-hidden" role="group" aria-label="Time range">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={range === r}
              onClick={() => onRange(r)}
              className={`px-4 py-2 text-[12px] font-semibold transition-colors ${
                range === r ? 'bg-pink text-ink' : 'text-grey hover:text-paper'
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      {/* key={range} remounts the chart block so the 150ms fade-in plays on every range change */}
      <div key={range} className="mt-6 animate-[fadeIn_150ms_ease-out]" style={{ animationFillMode: 'backwards' }}>
        {chart}
      </div>
      <style jsx global>{`@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>

      <div className="mt-4 space-y-4">{children}</div>
    </div>
  )
}
```

Note: if `styled-jsx` (`<style jsx global>`) is unavailable in this setup, define the `fadeIn` keyframes in `app/globals.css` instead and drop the `<style>` tag — either satisfies the crossfade requirement.

- [ ] **Step 4: Create `components/admin/OrdersTable.tsx`**

```tsx
'use client'

import Card from './Card'
import StatusBadge from './StatusBadge'
import type { AdminOrder } from '@/lib/admin/types'

/** Range-filtered drill-down table; row click hands the order to the caller (who owns the drawer). */
export default function OrdersTable({ orders, onOpen, sortBy = 'date' }: {
  orders: AdminOrder[]
  onOpen: (o: AdminOrder) => void
  sortBy?: 'date' | 'total'
}) {
  const sorted = [...orders].sort((a, b) =>
    sortBy === 'total' ? b.total - a.total : b.date.localeCompare(a.date))
  return (
    <Card title="Orders in range" className="p-0 overflow-x-auto">
      <table className="w-full text-left text-[13px] min-w-[560px]">
        <thead>
          <tr className="text-[11px] uppercase tracking-[0.14em] text-grey border-b border-grey/25">
            <th className="px-5 py-3 font-medium">Order</th>
            <th className="px-5 py-3 font-medium">Customer</th>
            <th className="px-5 py-3 font-medium">Date</th>
            <th className="px-5 py-3 font-medium text-right">Total</th>
            <th className="px-5 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr><td colSpan={5} className="px-5 py-8 text-center text-grey">No orders in this range</td></tr>
          )}
          {sorted.map((o) => (
            <tr key={o.id} onClick={() => onOpen(o)} className="border-b border-grey/15 last:border-b-0 cursor-pointer hover:bg-paper/[0.03] transition-colors">
              <td className="px-5 py-3 text-paper/90 font-medium">{o.id}</td>
              <td className="px-5 py-3 text-paper/80">{o.customer.name}</td>
              <td className="px-5 py-3 text-grey tabular-nums">{o.date}</td>
              <td className="px-5 py-3 text-paper/80 text-right tabular-nums">${o.total}</td>
              <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
```

Note: `Card`'s `p-5` needs overriding here — since `className` is appended, add `!p-0` if `p-0` loses the specificity race, and put the title row back manually if `title` + `p-0` collide visually; acceptable fallback: skip Card's `title` and render the table's own header row only, wrapping in `<Card className="!p-0 overflow-x-auto">` with no title.

- [ ] **Step 5: Verify + commit**

Run: `npx tsc --noEmit && npx vitest run` — clean/green.

```bash
git add components/admin/StatCard.tsx components/admin/MetricShell.tsx components/admin/OrdersTable.tsx app/office-scr1pts-x7k2/page.tsx
git commit -m "feat(admin): linkable stat cards, metric shell, shared orders table"
```

---

### Task 5: The four metric components + dynamic route

**Files:**
- Create: `components/admin/metrics/RevenueMetric.tsx`
- Create: `components/admin/metrics/OrdersMetric.tsx`
- Create: `components/admin/metrics/AovMetric.tsx`
- Create: `components/admin/metrics/VisitorsMetric.tsx`
- Create: `app/office-scr1pts-x7k2/metrics/[metric]/page.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1–4 (`stats.ts` helpers, `TRAFFIC_30D`/`TOP_PAGES`/`DEVICE_SPLIT`, `MetricShell`/`MetricRange`, `OrdersTable`, `LineChart`/`BarChart` with `ticks`/`labels`, `OrderDrawer`, `useAdmin`, `Card`).
- Produces: default-export components `RevenueMetric()`, `OrdersMetric()`, `AovMetric()`, `VisitorsMetric()` (no props — each owns its range state + drawer state).

- [ ] **Step 1: Create `components/admin/metrics/RevenueMetric.tsx`**

```tsx
'use client'

import { useState } from 'react'
import Card from '@/components/admin/Card'
import { BarChart } from '@/components/admin/charts'
import MetricShell, { type MetricRange } from '@/components/admin/MetricShell'
import OrderDrawer from '@/components/admin/OrderDrawer'
import OrdersTable from '@/components/admin/OrdersTable'
import { useAdmin } from '@/lib/admin/store'
import { ordersInRange, paymentSplit, prevWindowDelta, revenueByDay, revenueByProduct } from '@/lib/admin/stats'
import type { AdminOrder } from '@/lib/admin/types'

export default function RevenueMetric() {
  const { state } = useAdmin()
  const [range, setRange] = useState<MetricRange>(14)
  const [open, setOpen] = useState<AdminOrder | null>(null)

  const ranged = ordersInRange(state.orders, range)
  const total = ranged.reduce((s, o) => s + o.total, 0)
  const byDay = revenueByDay(state.orders, range)
  const byProduct = revenueByProduct(state.orders, range, 5)
  const split = paymentSplit(state.orders, range)
  const maxProduct = Math.max(...byProduct.map((p) => p.revenue), 1)

  return (
    <MetricShell
      title="Revenue"
      headline={`$${total.toLocaleString()}`}
      delta={prevWindowDelta(state.orders, range, (o) => o.reduce((s, x) => s + x.total, 0))}
      range={range}
      onRange={setRange}
      chart={
        <Card title={`Revenue — last ${range} days`}>
          {byDay.length > 0
            ? <BarChart height={200} values={byDay.map((d) => ({ label: d.date, value: d.total }))} ticks={byDay.map((d) => d.date.slice(5))} />
            : <p className="text-[12px] text-grey py-8 text-center">No orders in this range</p>}
        </Card>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Revenue by product">
          {byProduct.length === 0 && <p className="text-[12px] text-grey">No sales in this range</p>}
          <ul className="space-y-2.5">
            {byProduct.map((p) => (
              <li key={p.productName} className="text-[13px]">
                <div className="flex justify-between">
                  <span className="text-paper/90 truncate">{p.productName}</span>
                  <span className="text-paper/80 tabular-nums shrink-0 ml-3">${p.revenue}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-[#101010]">
                  <div className="h-full rounded-full bg-pink/70" style={{ width: `${(p.revenue / maxProduct) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Payment split">
          <div className="space-y-3 text-[13px]">
            <div className="flex justify-between items-center">
              <span className="inline-flex rounded-full px-[10px] py-[3px] text-[11px] font-semibold tracking-[0.08em] uppercase" style={{ background: 'rgba(255,138,199,0.15)', color: '#FF8AC7' }}>Paid</span>
              <span className="tabular-nums text-paper/80">${split.paid}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="inline-flex rounded-full px-[10px] py-[3px] text-[11px] font-semibold tracking-[0.08em] uppercase" style={{ background: 'rgba(111,111,115,0.2)', color: '#9a9a9e' }}>Refunded</span>
              <span className="tabular-nums text-paper/80">${split.refunded}</span>
            </div>
          </div>
        </Card>
      </div>
      <OrdersTable orders={ranged} onOpen={setOpen} />
      {open && <OrderDrawer order={open} onClose={() => setOpen(null)} />}
    </MetricShell>
  )
}
```

- [ ] **Step 2: Create `components/admin/metrics/OrdersMetric.tsx`**

```tsx
'use client'

import { useState } from 'react'
import Card from '@/components/admin/Card'
import { BarChart } from '@/components/admin/charts'
import MetricShell, { type MetricRange } from '@/components/admin/MetricShell'
import OrderDrawer from '@/components/admin/OrderDrawer'
import OrdersTable from '@/components/admin/OrdersTable'
import StatusBadge from '@/components/admin/StatusBadge'
import { useAdmin } from '@/lib/admin/store'
import { avgItemsPerOrder, countByDay, ordersInRange, prevWindowDelta, statusCounts } from '@/lib/admin/stats'
import type { AdminOrder, OrderStatus } from '@/lib/admin/types'

export default function OrdersMetric() {
  const { state } = useAdmin()
  const [range, setRange] = useState<MetricRange>(14)
  const [open, setOpen] = useState<AdminOrder | null>(null)

  const ranged = ordersInRange(state.orders, range)
  const byDay = countByDay(state.orders, range)
  const counts = statusCounts(ranged)
  const statusOrder: OrderStatus[] = ['pending', 'shipped', 'delivered']

  return (
    <MetricShell
      title="Orders"
      headline={String(ranged.length)}
      delta={prevWindowDelta(state.orders, range, (o) => o.length)}
      range={range}
      onRange={setRange}
      chart={
        <Card title={`Orders per day — last ${range} days`}>
          {byDay.length > 0
            ? <BarChart height={200} values={byDay.map((d) => ({ label: d.date, value: d.count }))} ticks={byDay.map((d) => d.date.slice(5))} />
            : <p className="text-[12px] text-grey py-8 text-center">No orders in this range</p>}
        </Card>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Status mix">
          <ul className="space-y-2.5">
            {statusOrder.map((s) => (
              <li key={s} className="flex items-center justify-between text-[13px]">
                <StatusBadge status={s} />
                <span className="text-paper/80 tabular-nums">
                  {counts[s]}
                  <span className="text-grey ml-2">{ranged.length > 0 ? `${Math.round((counts[s] / ranged.length) * 100)}%` : '0%'}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Avg items per order">
          <p className="text-[36px] leading-none uppercase tracking-[0.04em] tabular-nums" style={{ fontFamily: 'var(--font-bebas)' }}>
            {avgItemsPerOrder(state.orders, range)}
          </p>
          <p className="mt-1.5 text-[11px] text-grey">across {ranged.length} order{ranged.length === 1 ? '' : 's'}</p>
        </Card>
      </div>
      <OrdersTable orders={ranged} onOpen={setOpen} />
      {open && <OrderDrawer order={open} onClose={() => setOpen(null)} />}
    </MetricShell>
  )
}
```

- [ ] **Step 3: Create `components/admin/metrics/AovMetric.tsx`**

```tsx
'use client'

import { useState } from 'react'
import Card from '@/components/admin/Card'
import { LineChart } from '@/components/admin/charts'
import MetricShell, { type MetricRange } from '@/components/admin/MetricShell'
import OrderDrawer from '@/components/admin/OrderDrawer'
import OrdersTable from '@/components/admin/OrdersTable'
import { useAdmin } from '@/lib/admin/store'
import { aovPoints, minMaxOrders, ordersInRange, prevWindowDelta } from '@/lib/admin/stats'
import type { AdminOrder } from '@/lib/admin/types'

const aovOf = (o: AdminOrder[]) => (o.length > 0 ? Math.round(o.reduce((s, x) => s + x.total, 0) / o.length) : 0)

function ExtremeCard({ title, order, onOpen }: { title: string; order: AdminOrder | null; onOpen: (o: AdminOrder) => void }) {
  return (
    <Card title={title}>
      {order ? (
        <button type="button" onClick={() => onOpen(order)} className="text-left w-full group">
          <p className="text-[22px] leading-none uppercase tracking-[0.04em] tabular-nums" style={{ fontFamily: 'var(--font-bebas)' }}>
            ${order.total}
          </p>
          <p className="mt-1.5 text-[12px] text-grey group-hover:text-paper transition-colors">
            {order.id} · {order.customer.name}
          </p>
        </button>
      ) : (
        <p className="text-[12px] text-grey">No orders in this range</p>
      )}
    </Card>
  )
}

export default function AovMetric() {
  const { state } = useAdmin()
  const [range, setRange] = useState<MetricRange>(14)
  const [open, setOpen] = useState<AdminOrder | null>(null)

  const ranged = ordersInRange(state.orders, range)
  const points = aovPoints(state.orders, range) // only days with orders — never dips to zero
  const { min, max } = minMaxOrders(state.orders, range)

  return (
    <MetricShell
      title="Avg Order Value"
      headline={`$${aovOf(ranged)}`}
      delta={prevWindowDelta(state.orders, range, aovOf)}
      range={range}
      onRange={setRange}
      chart={
        <Card title={`AOV by day — last ${range} days (order days only)`}>
          {points.length > 0
            ? <LineChart height={200} series={[{ color: '#FF8AC7', points: points.map((p) => p.aov), label: 'AOV $' }]} labels={points.map((p) => p.date)} ticks={points.map((p) => p.date.slice(5))} />
            : <p className="text-[12px] text-grey py-8 text-center">No orders in this range</p>}
        </Card>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ExtremeCard title="Highest order" order={max} onOpen={setOpen} />
        <ExtremeCard title="Lowest order" order={min} onOpen={setOpen} />
      </div>
      <OrdersTable orders={ranged} onOpen={setOpen} sortBy="total" />
      {open && <OrderDrawer order={open} onClose={() => setOpen(null)} />}
    </MetricShell>
  )
}
```

- [ ] **Step 4: Create `components/admin/metrics/VisitorsMetric.tsx`**

```tsx
'use client'

import { useState } from 'react'
import Card from '@/components/admin/Card'
import { LineChart } from '@/components/admin/charts'
import MetricShell, { type MetricRange } from '@/components/admin/MetricShell'
import { DEVICE_SPLIT, TOP_PAGES, TRAFFIC_30D } from '@/lib/admin/mockTraffic'
import { useAdmin } from '@/lib/admin/store'
import { conversionRate, delta, ordersInRange, trafficInRange, trafficPrevWindow } from '@/lib/admin/stats'

export default function VisitorsMetric() {
  const { state } = useAdmin()
  const [range, setRange] = useState<MetricRange>(14)

  const traffic = trafficInRange(TRAFFIC_30D, range)
  const visitors = traffic.reduce((s, d) => s + d.visitors, 0)
  const prevVisitors = trafficPrevWindow(TRAFFIC_30D, range).reduce((s, d) => s + d.visitors, 0)
  const rangedOrders = ordersInRange(state.orders, range)
  const totalViews = TOP_PAGES.reduce((s, p) => s + p.views, 0)
  const rangeShare = TRAFFIC_30D.reduce((s, d) => s + d.visitors, 0) > 0
    ? visitors / TRAFFIC_30D.reduce((s, d) => s + d.visitors, 0)
    : 0

  return (
    <MetricShell
      title="Visitors"
      headline={visitors.toLocaleString()}
      delta={delta(visitors, prevVisitors)}
      range={range}
      onRange={setRange}
      chart={
        <Card title={`Traffic — last ${range} days`}>
          <LineChart
            height={200}
            series={[
              { color: '#6F6F73', points: traffic.map((d) => d.pageViews), label: 'Page views' },
              { color: '#FF8AC7', points: traffic.map((d) => d.visitors), label: 'Visitors' },
            ]}
            labels={traffic.map((d) => d.date)}
            ticks={traffic.map((d) => d.date.slice(5))}
          />
        </Card>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Conversion rate">
          <p className="text-[36px] leading-none uppercase tracking-[0.04em] tabular-nums" style={{ fontFamily: 'var(--font-bebas)' }}>
            {conversionRate(rangedOrders.length, visitors)}
          </p>
          <p className="mt-1.5 text-[11px] text-grey">{rangedOrders.length} orders / {visitors.toLocaleString()} visitors</p>
        </Card>
        <Card title="Top pages">
          <ul className="space-y-2">
            {TOP_PAGES.map((p) => (
              <li key={p.path} className="flex justify-between text-[13px]">
                <span className="text-paper/90 truncate">{p.path}</span>
                <span className="text-grey tabular-nums shrink-0 ml-3">{Math.round(p.views * rangeShare).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Devices">
          <div className="flex h-2.5 rounded-full overflow-hidden bg-[#101010]">
            <div className="bg-pink" style={{ width: `${DEVICE_SPLIT.mobile}%` }} />
            <div className="bg-grey/60" style={{ width: `${DEVICE_SPLIT.desktop}%` }} />
          </div>
          <div className="mt-3 space-y-1.5 text-[13px]">
            <div className="flex justify-between"><span className="text-pink">Mobile</span><span className="tabular-nums text-paper/80">{DEVICE_SPLIT.mobile}%</span></div>
            <div className="flex justify-between"><span className="text-grey">Desktop</span><span className="tabular-nums text-paper/80">{DEVICE_SPLIT.desktop}%</span></div>
          </div>
        </Card>
      </div>
      <Card title="Daily traffic">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] min-w-[480px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-[0.14em] text-grey border-b border-grey/25">
                <th className="py-3 font-medium">Date</th>
                <th className="py-3 font-medium text-right">Visitors</th>
                <th className="py-3 font-medium text-right">Page views</th>
                <th className="py-3 font-medium text-right">Orders</th>
                <th className="py-3 font-medium text-right">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {[...traffic].reverse().map((d) => {
                const dayOrders = state.orders.filter((o) => o.date === d.date).length
                return (
                  <tr key={d.date} className="border-b border-grey/15 last:border-b-0">
                    <td className="py-3 text-grey tabular-nums">{d.date}</td>
                    <td className="py-3 text-paper/80 text-right tabular-nums">{d.visitors}</td>
                    <td className="py-3 text-paper/80 text-right tabular-nums">{d.pageViews}</td>
                    <td className="py-3 text-paper/80 text-right tabular-nums">{dayOrders}</td>
                    <td className="py-3 text-paper/80 text-right tabular-nums">{conversionRate(dayOrders, d.visitors)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </MetricShell>
  )
}
```

- [ ] **Step 5: Create `app/office-scr1pts-x7k2/metrics/[metric]/page.tsx`**

```tsx
'use client'

import { notFound, useParams } from 'next/navigation'
import AovMetric from '@/components/admin/metrics/AovMetric'
import OrdersMetric from '@/components/admin/metrics/OrdersMetric'
import RevenueMetric from '@/components/admin/metrics/RevenueMetric'
import VisitorsMetric from '@/components/admin/metrics/VisitorsMetric'

const METRICS = {
  revenue: RevenueMetric,
  orders: OrdersMetric,
  aov: AovMetric,
  visitors: VisitorsMetric,
} as const

export default function MetricPage() {
  const { metric } = useParams<{ metric: string }>()
  const Component = METRICS[metric as keyof typeof METRICS]
  if (!Component) notFound()
  return <Component />
}
```

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit && npx vitest run` — clean/green. Then `npm run dev`: each stat card navigates to its page; unknown slug (e.g. `/metrics/foo`) 404s; range toggle recomputes headline/chart/cards/table; chart hover shows readouts; tables/cards open the OrderDrawer.

- [ ] **Step 7: Commit**

```bash
git add components/admin/metrics/ app/office-scr1pts-x7k2/metrics/
git commit -m "feat(admin): metric drill-down pages — revenue, orders, aov, visitors"
```

---

### Task 6: Final sweep — build, docs

**Files:**
- Modify: `PRD.md` (Change Log append)

- [ ] **Step 1: Full verification**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: all green; build lists `/office-scr1pts-x7k2/metrics/[metric]`, no `/admin`.

- [ ] **Step 2: Manual demo pass** (controller in the browser)

All four drill-downs from their stat cards; 7/14/30d toggles (30d shows the quiet first half honestly); AOV line has no zero-dips; hover readouts on both chart types incl. edge clamping; conversion/top-pages/devices on visitors; OrderDrawer from tables and extreme cards; breadcrumb back; `/metrics/nope` → 404; mobile: pills reachable, charts shrink, tables scroll.

- [ ] **Step 3: Append PRD Change Log and commit**

Append (new line, never rewrite existing entries): `- **2026-07-31** — **Admin metric drill-downs shipped.** Each Overview stat card opens a full SaaS-style detail page (/metrics/revenue·orders·aov·visitors): 7/14/30d range toggle, large charts with hover value readouts and day ticks, per-metric breakdowns (revenue by product, payment split, status mix, avg items, high/low orders, conversion rate, top pages, device split) and range-filtered drill-down tables. Stats logic extracted to lib/admin/stats.ts; traffic mock extended to 30 days.`

```bash
git add PRD.md
git commit -m "chore(admin): PRD change log for metric drill-downs"
```
