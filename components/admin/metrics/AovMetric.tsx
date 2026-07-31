'use client'

import { useState } from 'react'
import Card from '@/components/admin/Card'
import { LineChart } from '@/components/admin/charts'
import MetricShell, { type MetricRange } from '@/components/admin/MetricShell'
import OrderDrawer from '@/components/admin/OrderDrawer'
import OrdersTable from '@/components/admin/OrdersTable'
import { useAdmin } from '@/lib/admin/store'
import { useIsPhone } from '@/lib/admin/useIsPhone'
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
  const chartH = useIsPhone() ? 140 : 200

  const ranged = ordersInRange(state.orders, range)
  const points = aovPoints(state.orders, range) // only days with orders — never dips to zero
  const { min, max } = minMaxOrders(state.orders, range)

  return (
    <MetricShell
      title="Avg Order Value"
      headlineLabel={`Average order value · last ${range} days`}
      headline={`$${aovOf(ranged)}`}
      delta={prevWindowDelta(state.orders, range, aovOf)}
      range={range}
      onRange={setRange}
      chart={
        <Card title={`AOV by day — last ${range} days (order days only)`}>
          {points.length > 0
            ? <LineChart height={chartH} series={[{ color: '#FF8AC7', points: points.map((p) => p.aov), label: 'AOV $' }]} labels={points.map((p) => p.date)} ticks={points.map((p) => p.date.slice(5))} />
            : <p className="text-[12px] text-grey py-8 text-center">No orders in this range</p>}
        </Card>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ExtremeCard title="Highest order" order={max} onOpen={setOpen} />
        <ExtremeCard title="Lowest order" order={min} onOpen={setOpen} />
      </div>
      <OrdersTable orders={ranged} onOpen={setOpen} sortBy="total" />
      {open && <OrderDrawer order={open} onClose={() => setOpen(null)} />}
    </MetricShell>
  )
}
