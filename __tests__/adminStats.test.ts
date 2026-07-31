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
