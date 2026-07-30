'use client'

import { DollarSign, Package, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import { adminPath } from '@/lib/admin/config'
import { useAdmin } from '@/lib/admin/store'
import StatCard from '@/components/admin/StatCard'
import StatusBadge from '@/components/admin/StatusBadge'

export default function OverviewPage() {
  const { state } = useAdmin()
  const revenue = state.orders.reduce((sum, o) => sum + o.total, 0)
  const active = state.products.filter((p) => p.status === 'available').length
  const recent = [...state.orders].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)

  return (
    <div>
      <h1 className="text-[40px] leading-none uppercase tracking-[0.04em]" style={{ fontFamily: 'var(--font-bebas)' }}>
        Overview
      </h1>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Revenue" value={`$${revenue.toLocaleString()}`} icon={<DollarSign size={20} />} />
        <StatCard label="Total Orders" value={String(state.orders.length)} icon={<ShoppingBag size={20} />} />
        <StatCard label="Active Products" value={String(active)} icon={<Package size={20} />} />
      </div>

      <div className="mt-8 rounded-xl border border-grey/25 bg-[#141414]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-grey/25">
          <h2 className="text-[20px] uppercase tracking-[0.04em]" style={{ fontFamily: 'var(--font-bebas)' }}>Recent Orders</h2>
          <Link href={adminPath('orders')} className="text-[12px] text-pink hover:underline">View all</Link>
        </div>
        <ul>
          {recent.map((o) => (
            <li key={o.id} className="flex items-center justify-between px-5 py-3.5 border-b border-grey/15 last:border-b-0 text-[13px]">
              <div className="min-w-0">
                <span className="text-paper/90 font-medium">{o.id}</span>
                <span className="text-grey ml-3">{o.customer}</span>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className="text-paper/80">${o.total}</span>
                <StatusBadge status={o.status} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
