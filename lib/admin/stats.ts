import type { AdminOrder, OrderStatus } from './types'

// ── Stats (pure; consumed by the Overview and the metric drill-down pages).

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Consecutive days ending at the newest order date; empty input → empty array. */
export function revenueByDay(orders: AdminOrder[], days = 14): { date: string; total: number }[] {
  if (orders.length === 0) return []
  const newest = orders.reduce((m, o) => (o.date > m ? o.date : m), orders[0].date)
  const out: { date: string; total: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(newest, -i)
    out.push({ date, total: orders.filter((o) => o.date === date).reduce((s, o) => s + o.total, 0) })
  }
  return out
}

export function topProducts(orders: AdminOrder[], limit = 3): { productName: string; units: number }[] {
  const units = new Map<string, number>()
  for (const o of orders) for (const li of o.lineItems) units.set(li.productName, (units.get(li.productName) ?? 0) + li.qty)
  return [...units.entries()].map(([productName, n]) => ({ productName, units: n }))
    .sort((a, b) => b.units - a.units).slice(0, limit)
}

export function statusCounts(orders: AdminOrder[]): Record<OrderStatus, number> {
  const c: Record<OrderStatus, number> = { pending: 0, shipped: 0, delivered: 0 }
  for (const o of orders) c[o.status]++
  return c
}

/** Unique customers by email; "new" = first order within 7 days of the newest order date. */
export function customerStats(orders: AdminOrder[]): { total: number; newThisWeek: number } {
  if (orders.length === 0) return { total: 0, newThisWeek: 0 }
  const first = new Map<string, string>()
  for (const o of orders) {
    const prev = first.get(o.customer.email)
    if (!prev || o.date < prev) first.set(o.customer.email, o.date)
  }
  const newest = orders.reduce((m, o) => (o.date > m ? o.date : m), orders[0].date)
  const cutoff = addDays(newest, -7)
  let newThisWeek = 0
  for (const d of first.values()) if (d >= cutoff) newThisWeek++
  return { total: first.size, newThisWeek }
}

/** Never NaN/∞: previous ≤ 0 → flat; |change| < 0.5% → flat. */
export function delta(current: number, previous: number): { pct: number; dir: 'up' | 'down' | 'flat' } {
  if (previous <= 0) return { pct: 0, dir: 'flat' }
  const raw = ((current - previous) / previous) * 100
  const pct = Math.round(raw)
  if (Math.abs(raw) < 0.5) return { pct: 0, dir: 'flat' }
  return { pct: Math.abs(pct), dir: current > previous ? 'up' : 'down' }
}

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
