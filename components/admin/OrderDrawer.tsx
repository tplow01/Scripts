'use client'

import { ImageOff, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAdmin } from '@/lib/admin/store'
import type { AdminOrder, OrderStatus } from '@/lib/admin/types'
import Card from './Card'
import StatusBadge from './StatusBadge'

const STATUSES: OrderStatus[] = ['pending', 'shipped', 'delivered']

const PAYMENT_STYLE = {
  paid: { bg: 'rgba(255,138,199,0.15)', color: '#FF8AC7', label: 'Paid' },
  refunded: { bg: 'rgba(111,111,115,0.2)', color: '#9a9a9e', label: 'Refunded' },
} as const

function fmtStamp(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
}

function TimelineStep({ label, stamp }: { label: string; stamp: string | null }) {
  return (
    <div className="flex items-center gap-2.5 text-[12px]">
      <span style={{ color: stamp ? '#FF8AC7' : '#6F6F73' }}>{stamp ? '●' : '○'}</span>
      <span className={stamp ? 'text-paper/90' : 'text-grey'}>{label}</span>
      <span className="ml-auto text-grey tabular-nums">{stamp ? fmtStamp(stamp) : 'pending'}</span>
    </div>
  )
}

export default function OrderDrawer({ order, onClose }: { order: AdminOrder; onClose: () => void }) {
  const { state, setOrder } = useAdmin()
  const [shown, setShown] = useState(false)
  // Read the live order so status changes made inside the drawer re-render it.
  const live = state.orders.find((o) => o.id === order.id) ?? order
  const pay = PAYMENT_STYLE[live.paymentStatus]

  useEffect(() => { setShown(true) }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const thumbFor = (productName: string): string | null =>
    state.products.find((p) => p.name === productName)?.media[0]?.url ?? null

  return (
    <div className="fixed inset-0 z-50">
      <div className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${shown ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <div className={`absolute right-0 top-0 h-full w-full max-w-none sm:max-w-md bg-[#141414] border-l border-grey/25 overflow-y-auto transition-all duration-200 ease-out ${shown ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-grey/25 sticky top-0 bg-[#141414] z-10">
          <div className="flex items-center gap-3">
            <h2 className="text-[22px] uppercase tracking-[0.04em]" style={{ fontFamily: 'var(--font-bebas)' }}>{live.id}</h2>
            <span className="inline-flex items-center rounded-full px-[10px] py-[3px] text-[11px] font-semibold tracking-[0.08em] uppercase" style={{ background: pay.bg, color: pay.color }}>
              {pay.label}
            </span>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="-mr-2 p-2.5 text-grey hover:text-paper"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-[12px] text-grey">Placed {live.date}</p>

          <Card title="Customer">
            <p className="text-[13px] font-medium text-paper/90">{live.customer.name}</p>
            <p className="text-[12px] mt-1">
              <a href={`mailto:${live.customer.email}`} className="text-pink hover:underline">{live.customer.email}</a>
              <span className="text-grey"> · </span>
              <a href={`tel:${live.customer.phone.replace(/[^+\d]/g, '')}`} className="text-paper/70 hover:text-paper">{live.customer.phone}</a>
            </p>
            <p className="text-[12px] text-grey mt-2 leading-relaxed">{live.customer.address.map((l) => <span key={l} className="block">{l}</span>)}</p>
          </Card>

          <Card title="Items">
            <ul className="space-y-2.5">
              {live.lineItems.map((li, i) => {
                const thumb = thumbFor(li.productName)
                return (
                  <li key={`${li.productName}-${li.size}-${i}`} className="flex items-center gap-3 text-[13px]">
                    <span className="w-10 h-10 rounded-lg bg-[#101010] border border-grey/20 flex items-center justify-center overflow-hidden shrink-0">
                      {thumb
                        // eslint-disable-next-line @next/next/no-img-element -- object URLs need a plain img
                        ? <img src={thumb} alt="" className="w-full h-full object-contain" />
                        : <ImageOff size={14} className="text-grey" />}
                    </span>
                    <span className="min-w-0 truncate text-paper/90">{li.productName} <span className="text-grey">· {li.size}</span></span>
                    <span className="ml-auto shrink-0 text-paper/80 tabular-nums">×{li.qty} &nbsp; ${li.qty * li.unitPrice}</span>
                  </li>
                )
              })}
            </ul>
            <div className="border-t border-grey/20 mt-3.5 pt-3 space-y-1.5 text-[12px]">
              <div className="flex justify-between text-grey"><span>Subtotal</span><span className="tabular-nums">${live.subtotal}</span></div>
              <div className="flex justify-between text-grey"><span>Shipping</span><span className="tabular-nums">{live.shipping === 0 ? 'Free' : `$${live.shipping}`}</span></div>
              <div className="flex justify-between text-paper font-bold text-[13px]"><span>Total</span><span className="tabular-nums">${live.total}</span></div>
            </div>
          </Card>

          <Card title="Timeline">
            <div className="space-y-2.5">
              <TimelineStep label="Placed" stamp={live.timeline.placedAt} />
              <TimelineStep label="Shipped" stamp={live.timeline.shippedAt} />
              <TimelineStep label="Delivered" stamp={live.timeline.deliveredAt} />
            </div>
          </Card>

          <div className="flex items-center gap-3 pt-1">
            <span className="text-[11px] uppercase tracking-[0.14em] text-grey">Status</span>
            <StatusBadge status={live.status} />
            <select
              aria-label={`Change status for ${live.id}`}
              value={live.status}
              onChange={(e) => setOrder(live.id, e.target.value as OrderStatus)}
              className="ml-auto rounded-lg border border-grey/30 bg-[#101010] px-2 py-1.5 text-[12px] text-paper focus:outline-none focus:border-pink"
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
