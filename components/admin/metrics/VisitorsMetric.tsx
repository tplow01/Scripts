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
