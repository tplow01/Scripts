'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

import { useCart } from '@/lib/cart'

interface ConfirmedOrder {
  number: string
  items: { name: string; size: string; qty: number; lineTotal: number }[]
  total: number
}

/**
 * Where Stripe returns the shopper after paying.
 *
 * The order is written by the webhook, not here — so on arrival it may not
 * exist yet. This polls briefly rather than claiming failure, because the
 * payment has already succeeded either way.
 */
function CheckoutSuccess() {
  const sessionId = useSearchParams().get('session_id')
  const { clearCart } = useCart()
  const reduced = useReducedMotion()

  const [order, setOrder] = useState<ConfirmedOrder | null>(null)
  const [slow, setSlow] = useState(false)
  const cleared = useRef(false)

  useEffect(() => {
    if (!sessionId) return
    let stop = false
    let tries = 0

    const poll = async () => {
      try {
        const res = await fetch(`/api/checkout/status?session_id=${encodeURIComponent(sessionId)}`)
        const body = await res.json()
        if (!stop && body.status === 'ready') {
          setOrder(body.order)
          // The payment went through, so the bag is spent. Clear it once.
          if (!cleared.current) {
            cleared.current = true
            clearCart()
          }
          return
        }
      } catch {
        // Keep polling; a dropped request says nothing about the payment.
      }
      if (stop) return
      tries += 1
      if (tries === 6) setSlow(true)
      if (tries < 20) setTimeout(poll, 1500)
    }
    void poll()
    return () => {
      stop = true
    }
  }, [sessionId, clearCart])

  if (!sessionId) {
    return (
      <Shell>
        <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#6F6F73]">
          No order to show.
        </p>
        <Link href="/inventory" className={primaryBtn}>Continue shopping</Link>
      </Shell>
    )
  }

  if (!order) {
    return (
      <Shell>
        <span className="flex h-[56px] w-[56px] items-center justify-center rounded-full bg-[#FF4FA3] text-[#0d0d0d] text-[22px] font-bold leading-none">
          ✓
        </span>
        <h1 className="mt-[24px] text-[44px] md:text-[56px] leading-none tracking-[0.04em] uppercase" style={{ fontFamily: 'var(--font-bebas)' }}>
          Payment received
        </h1>
        <p className="mt-[14px] text-[13px] leading-relaxed text-[#444] max-w-[360px]">
          {slow
            ? 'Still writing up your order — this can take a few seconds. Your payment went through; nothing is lost if you close this page.'
            : 'Confirming your order…'}
        </p>
      </Shell>
    )
  }

  return (
    <Shell>
      <motion.div
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="w-full flex flex-col items-center text-center"
      >
        <span className="flex h-[56px] w-[56px] items-center justify-center rounded-full bg-[#FF4FA3] text-[#0d0d0d] text-[26px] font-bold leading-none">
          ✓
        </span>
        <h1 className="mt-[24px] text-[44px] md:text-[56px] leading-none tracking-[0.04em] uppercase" style={{ fontFamily: 'var(--font-bebas)' }}>
          Order confirmed
        </h1>
        <p className="mt-[12px] text-[12px] font-bold uppercase tracking-[0.1em] text-[#6F6F73]">
          Order {order.number}
        </p>
        <p className="mt-[14px] text-[13px] leading-relaxed text-[#444] max-w-[360px]">
          Thanks for joining the world. Your pieces ship as the drop lands.
        </p>

        <div className="mt-[28px] w-full border border-[#ececec] rounded-[10px] p-[20px] text-left">
          <div className="flex flex-col divide-y divide-[#eee]">
            {order.items.map((it, i) => (
              <div key={i} className="flex items-center justify-between gap-[12px] py-[12px] first:pt-0 last:pb-0">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.04em] leading-snug">
                  {it.name}{it.size ? ` · ${it.size}` : ''} · ×{it.qty}
                </span>
                <span className="text-[12px] font-bold shrink-0">${it.lineTotal.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="mt-[14px] pt-[14px] border-t border-[#0d0d0d] flex justify-between items-baseline">
            <span className="text-[13px] font-extrabold uppercase tracking-[0.04em]">Total</span>
            <span className="text-[18px] font-extrabold">${order.total.toFixed(2)}</span>
          </div>
        </div>

        <div className="mt-[28px] flex w-full flex-col gap-[12px]">
          <Link href="/inventory" className={primaryBtn}>Continue shopping</Link>
          <Link href="/" className="w-full py-[14px] text-[12px] font-bold tracking-[0.1em] uppercase text-[#6F6F73] text-center hover:text-[#0d0d0d] transition-colors">
            Back to the game
          </Link>
        </div>
      </motion.div>
    </Shell>
  )
}

/**
 * useSearchParams() forces client-side rendering, so Next requires a Suspense
 * boundary around it or the whole route fails to prerender.
 */
export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <Shell>
          <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#6F6F73]">
            Loading your order…
          </p>
        </Shell>
      }
    >
      <CheckoutSuccess />
    </Suspense>
  )
}

const primaryBtn =
  'w-full py-[16px] bg-[#0d0d0d] text-white text-[12px] font-extrabold tracking-[0.12em] uppercase rounded text-center border border-[#0d0d0d] hover:bg-white hover:text-[#0d0d0d] transition-colors duration-200'

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-[#0d0d0d] flex flex-col items-center justify-center px-4 md:px-16 py-16">
      <div className="w-full max-w-[460px] flex flex-col items-center text-center gap-0">{children}</div>
    </div>
  )
}
