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
    <Card title="Orders in range" className="!p-0 overflow-x-auto">
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
