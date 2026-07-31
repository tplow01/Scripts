'use client'

import { DollarSign, ImageOff, Package, ShoppingBag, Users } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import Card from '@/components/admin/Card'
import { BarChart, LineChart } from '@/components/admin/charts'
import OrderDrawer from '@/components/admin/OrderDrawer'
import StatCard from '@/components/admin/StatCard'
import StatusBadge from '@/components/admin/StatusBadge'
import { adminPath } from '@/lib/admin/config'
import { TRAFFIC_30D } from '@/lib/admin/mockTraffic'
import { useAdmin } from '@/lib/admin/store'
import { customerStats, delta, revenueByDay, statusCounts, topProducts, trafficInRange, trafficPrevWindow } from '@/lib/admin/stats'
import type { AdminOrder, OrderStatus } from '@/lib/admin/types'

export default function OverviewPage() {
  const { state } = useAdmin()
  const [open, setOpen] = useState<AdminOrder | null>(null)

  const traffic14 = trafficInRange(TRAFFIC_30D, 14)
  const revenue = state.orders.reduce((sum, o) => sum + o.total, 0)
  const aov = state.orders.length > 0 ? Math.round(revenue / state.orders.length) : 0
  const visitors = traffic14.reduce((s, d) => s + d.visitors, 0)

  // Current vs previous 14-day windows, derived from order dates.
  const byDay = revenueByDay(state.orders, 28)
  const prevWindow = byDay.slice(0, 14)
  const curWindow = byDay.slice(14)
  const sum = (w: { total: number }[]) => w.reduce((s, d) => s + d.total, 0)
  const count = (w: { date: string }[]) => state.orders.filter((o) => w.some((d) => d.date === o.date)).length
  const revenueDelta = delta(sum(curWindow), sum(prevWindow))
  const ordersDelta = delta(count(curWindow), count(prevWindow))
  const prevOrders = count(prevWindow)
  const aovDelta = delta(aov, prevOrders > 0 ? Math.round(sum(prevWindow) / prevOrders) : 0)
  const visitorsDelta = delta(visitors, trafficPrevWindow(TRAFFIC_30D, 14).reduce((s, d) => s + d.visitors, 0))

  const counts = statusCounts(state.orders)
  const customers = customerStats(state.orders)
  const top = topProducts(state.orders, 3)
  const recent = [...state.orders].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
  const revenue14 = revenueByDay(state.orders, 14)

  const thumbFor = (name: string): string | null => state.products.find((p) => p.name === name)?.image ?? null
  const statusOrder: OrderStatus[] = ['pending', 'shipped', 'delivered']

  return (
    <div>
      <h1 className="text-[40px] leading-none uppercase tracking-[0.04em]" style={{ fontFamily: 'var(--font-bebas)' }}>
        Overview
      </h1>

      <div className="mt-6 grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={`$${revenue.toLocaleString()}`} icon={<DollarSign size={20} />} delta={revenueDelta} />
        <StatCard label="Total Orders" value={String(state.orders.length)} icon={<ShoppingBag size={20} />} delta={ordersDelta} />
        <StatCard label="Avg Order Value" value={`$${aov}`} icon={<Package size={20} />} delta={aovDelta} />
        <StatCard label="Visitors · 14d" value={visitors.toLocaleString()} icon={<Users size={20} />} delta={visitorsDelta} />
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Traffic — last 14 days">
          <LineChart series={[
            { color: '#6F6F73', points: traffic14.map((d) => d.pageViews), label: 'Page views' },
            { color: '#FF8AC7', points: traffic14.map((d) => d.visitors), label: 'Visitors' },
          ]} />
        </Card>
        <Card title="Revenue — last 14 days">
          {revenue14.length > 0
            ? <BarChart values={revenue14.map((d) => ({ label: d.date, value: d.total }))} />
            : <p className="text-[12px] text-grey py-4 text-center">No orders yet</p>}
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Top products">
          {top.length === 0 && <p className="text-[12px] text-grey">No sales yet</p>}
          <ul className="space-y-2.5">
            {top.map((t) => {
              const thumb = thumbFor(t.productName)
              return (
                <li key={t.productName} className="flex items-center gap-3 text-[13px]">
                  <span className="w-9 h-9 rounded-lg bg-[#101010] border border-grey/20 flex items-center justify-center overflow-hidden shrink-0">
                    {thumb
                      // eslint-disable-next-line @next/next/no-img-element -- object URLs need a plain img
                      ? <img src={thumb} alt="" className="w-full h-full object-contain" />
                      : <ImageOff size={14} className="text-grey" />}
                  </span>
                  <span className="min-w-0 truncate text-paper/90">{t.productName}</span>
                  <span className="ml-auto text-grey tabular-nums">×{t.units}</span>
                </li>
              )
            })}
          </ul>
        </Card>
        <Card title="Orders by status">
          <ul className="space-y-2.5">
            {statusOrder.map((s) => (
              <li key={s} className="flex items-center justify-between text-[13px]">
                <StatusBadge status={s} />
                <span className="text-paper/80 tabular-nums">{counts[s]}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Customers">
          <p className="text-[36px] leading-none uppercase tracking-[0.04em]" style={{ fontFamily: 'var(--font-bebas)' }}>{customers.total}</p>
          {customers.newThisWeek === 0
            ? <p className="mt-1.5 text-[11px]" style={{ color: '#6F6F73' }}>— none this week</p>
            : <p className="mt-1.5 text-[11px]" style={{ color: '#5FA36B' }}>+{customers.newThisWeek} this week</p>}
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Recent orders" action={<Link href={adminPath('orders')} className="text-[12px] text-pink hover:underline">View all</Link>}>
          {recent.length === 0 && <p className="text-[12px] text-grey">No orders yet</p>}
          <ul>
            {recent.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => setOpen(o)}
                  className="w-full flex items-center justify-between py-3 border-b border-grey/15 last:border-b-0 text-[13px] text-left hover:bg-paper/[0.03] transition-colors rounded-md px-2 -mx-2"
                >
                  <span className="min-w-0">
                    <span className="text-paper/90 font-medium">{o.id}</span>
                    <span className="text-grey ml-3">{o.customer.name}</span>
                  </span>
                  <span className="flex items-center gap-4 shrink-0">
                    <span className="text-paper/80 tabular-nums">${o.total}</span>
                    <StatusBadge status={o.status} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {open && <OrderDrawer order={open} onClose={() => setOpen(null)} />}
    </div>
  )
}
