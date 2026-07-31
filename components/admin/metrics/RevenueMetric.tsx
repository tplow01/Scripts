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
