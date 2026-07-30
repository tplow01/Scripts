'use client'

import StatusBadge from '@/components/admin/StatusBadge'
import { useAdmin } from '@/lib/admin/store'
import type { OrderStatus } from '@/lib/admin/types'

const STATUSES: OrderStatus[] = ['pending', 'shipped', 'delivered']

export default function OrdersPage() {
  const { state, setOrder } = useAdmin()
  const orders = [...state.orders].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div>
      <h1 className="text-[40px] leading-none uppercase tracking-[0.04em]" style={{ fontFamily: 'var(--font-bebas)' }}>
        Orders
      </h1>

      <div className="mt-6 rounded-xl border border-grey/25 bg-[#141414] overflow-x-auto">
        <table className="w-full text-left text-[13px] min-w-[720px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.14em] text-grey border-b border-grey/25">
              <th className="px-5 py-3 font-medium">Order</th>
              <th className="px-5 py-3 font-medium">Customer</th>
              <th className="px-5 py-3 font-medium">Items</th>
              <th className="px-5 py-3 font-medium">Total</th>
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-grey/15 last:border-b-0">
                <td className="px-5 py-3 text-paper/90 font-medium">{o.id}</td>
                <td className="px-5 py-3 text-paper/80">{o.customer}</td>
                <td className="px-5 py-3 text-grey max-w-[240px] truncate" title={o.items}>{o.items}</td>
                <td className="px-5 py-3 text-paper/80">${o.total}</td>
                <td className="px-5 py-3 text-grey">{o.date}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={o.status} />
                    <select
                      aria-label={`Change status for ${o.id}`}
                      value={o.status}
                      onChange={(e) => setOrder(o.id, e.target.value as OrderStatus)}
                      className="rounded-lg border border-grey/30 bg-[#101010] px-2 py-1.5 text-[12px] text-paper focus:outline-none focus:border-pink"
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
