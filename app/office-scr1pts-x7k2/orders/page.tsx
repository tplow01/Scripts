'use client'

import { useState } from 'react'
import OrderDrawer from '@/components/admin/OrderDrawer'
import OrdersList from '@/components/admin/OrdersList'
import { useAdmin } from '@/lib/admin/store'
import type { AdminOrder } from '@/lib/admin/types'

export default function OrdersPage() {
  const { state, setOrder } = useAdmin()
  const [open, setOpen] = useState<AdminOrder | null>(null)

  return (
    <div>
      <h1 className="text-[32px] sm:text-[40px] leading-none uppercase tracking-[0.04em]" style={{ fontFamily: 'var(--font-bebas)' }}>
        Orders
      </h1>

      <div className="mt-6">
        <OrdersList orders={state.orders} onOpen={setOpen} title={`All orders · ${state.orders.length}`} onStatusChange={setOrder} emptyLabel="No orders yet" />
      </div>

      {open && <OrderDrawer order={open} onClose={() => setOpen(null)} />}
    </div>
  )
}
