'use client'

import { useState } from 'react'
import Card from '@/components/admin/Card'
import { BarChart } from '@/components/admin/charts'
import MetricShell, { type MetricRange } from '@/components/admin/MetricShell'
import OrderDrawer from '@/components/admin/OrderDrawer'
import OrdersTable from '@/components/admin/OrdersTable'
import StatusBadge from '@/components/admin/StatusBadge'
import { useAdmin } from '@/lib/admin/store'
import { useIsPhone } from '@/lib/admin/useIsPhone'
import { avgItemsPerOrder, countByDay, ordersInRange, prevWindowDelta, statusCounts } from '@/lib/admin/stats'
import type { AdminOrder, OrderStatus } from '@/lib/admin/types'

export default function OrdersMetric() {
  const { state } = useAdmin()
  const [range, setRange] = useState<MetricRange>(14)
  const [open, setOpen] = useState<AdminOrder | null>(null)
  const chartH = useIsPhone() ? 140 : 200

  const ranged = ordersInRange(state.orders, range)
  const byDay = countByDay(state.orders, range)
  const counts = statusCounts(ranged)
  const statusOrder: OrderStatus[] = ['pending', 'shipped', 'delivered']

  return (
    <MetricShell
      title="Orders"
      headlineLabel={`Orders placed · last ${range} days`}
      headline={String(ranged.length)}
      delta={prevWindowDelta(state.orders, range, (o) => o.length)}
      range={range}
      onRange={setRange}
      chart={
        <Card title={`Orders per day — last ${range} days`}>
          {byDay.length > 0
            ? <BarChart height={chartH} values={byDay.map((d) => ({ label: d.date, value: d.count }))} ticks={byDay.map((d) => d.date.slice(5))} />
            : <p className="text-[12px] text-grey py-8 text-center">No orders in this range</p>}
        </Card>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
