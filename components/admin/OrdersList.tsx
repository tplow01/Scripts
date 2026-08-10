'use client'

import { itemCountLabel } from '@/lib/admin/stats'
import type { AdminOrder, OrderStatus } from '@/lib/admin/types'
import Card from './Card'
import StatusBadge from './StatusBadge'

/**
 * One list, two renderings: stacked cards on phone (nothing clips, whole card is
 * the tap target), the table at `sm`+. Card is `!p-0 overflow-hidden` so the
 * table's horizontal scroll happens INSIDE the rounded border.
 */
export default function OrdersList({ orders, onOpen, sortBy = 'date', title = 'Orders in range', onStatusChange, emptyLabel = 'No orders in this range' }: {
  orders: AdminOrder[]
  onOpen: (o: AdminOrder) => void
  sortBy?: 'date' | 'total'
  title?: string
  onStatusChange?: (orderId: string, status: OrderStatus) => void
  emptyLabel?: string
}) {
  const sorted = [...orders].sort((a, b) =>
    sortBy === 'total' ? b.total - a.total : b.date.localeCompare(a.date))
  const empty = sorted.length === 0

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-grey/25">
        <p className="text-[11px] uppercase tracking-[0.14em] text-grey">{title}</p>
      </div>

      {/* Phone: stacked cards */}
      <div className="sm:hidden p-3 space-y-2">
        {empty && <p className="py-6 text-center text-[13px] text-grey">{emptyLabel}</p>}
        {sorted.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onOpen(o)}
            className="w-full text-left rounded-lg border border-grey/20 bg-[#101010] px-3.5 py-3 hover:border-grey/40 transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-medium text-paper/90 whitespace-nowrap">{o.id}</span>
              <StatusBadge status={o.status} />
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-3 text-[13px]">
              <span className="text-paper/80 truncate">{o.customer.name}</span>
              <span className="text-paper shrink-0 tabular-nums">${o.total}</span>
            </div>
            <p className="mt-1 text-[11px] text-grey tabular-nums whitespace-nowrap">
              {o.date} · {itemCountLabel(o)}
            </p>
          </button>
        ))}
      </div>

      {/* Tablet and desktop: table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left text-[13px] min-w-[680px]">
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
            {empty && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-grey">{emptyLabel}</td></tr>
            )}
            {sorted.map((o) => (
              <tr
                key={o.id}
                onClick={() => onOpen(o)}
                className="border-b border-grey/15 last:border-b-0 cursor-pointer hover:bg-paper/[0.03] transition-colors"
              >
                <td className="px-5 py-3 text-paper/90 font-medium whitespace-nowrap">{o.id}</td>
                <td className="px-5 py-3 text-paper/80 max-w-[200px] truncate">{o.customer.name}</td>
                <td className="px-5 py-3 text-grey tabular-nums whitespace-nowrap">{o.date}</td>
                <td className="px-5 py-3 text-paper/80 text-right tabular-nums whitespace-nowrap">${o.total}</td>
                <td className="px-5 py-3">
                  {onStatusChange ? (
                    <div className="flex items-center gap-3">
                      <StatusBadge status={o.status} />
                      <select
                        aria-label={`Change status for ${o.id}`}
                        value={o.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => onStatusChange(o.id, e.target.value as OrderStatus)}
                        className="rounded-lg border border-grey/30 bg-[#101010] px-2 py-1.5 text-[12px] text-paper focus:outline-none focus:border-pink"
                      >
                        <option value="pending">Pending</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                      </select>
                    </div>
                  ) : (
                    <StatusBadge status={o.status} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
