'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import { useCart } from '@/lib/cart'
import { useToast } from '@/lib/toast'
import type { CartItem } from '@/lib/cart'

const SHIPPING: number = 0 // free shipping for launch; Stripe will calculate tax at pay time

const labelCls = 'block text-[10px] font-bold uppercase tracking-[0.12em] text-[#6F6F73] mb-[6px]'
const inputBase =
  'w-full h-[46px] px-[14px] border rounded text-[14px] text-[#0d0d0d] ' +
  'placeholder:text-[#9a9a9e] focus:outline-none transition-colors'

type FormState = Record<string, string>

// Required text fields + their validators. Optional fields (address2) are omitted.
const VALIDATORS: Record<string, (v: string) => string | null> = {
  email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : 'Enter a valid email'),
  firstName: (v) => (v.trim() ? null : 'Required'),
  lastName: (v) => (v.trim() ? null : 'Required'),
  address: (v) => (v.trim() ? null : 'Required'),
  city: (v) => (v.trim() ? null : 'Required'),
  state: (v) => (v.trim() ? null : 'Required'),
  zip: (v) => (v.trim() ? null : 'Required'),
  country: (v) => (v.trim() ? null : 'Required'),
  card: (v) => (v.replace(/\s/g, '').replace(/\D/g, '').length >= 15 ? null : 'Enter a valid card number'),
  expiry: (v) => (/^(0[1-9]|1[0-2])\s*\/\s*\d{2}$/.test(v.trim()) ? null : 'MM / YY'),
  cvc: (v) => (/^\d{3,4}$/.test(v.trim()) ? null : '3–4 digits'),
}

function Field({
  label, name, value, error, touched, onChange, onBlur,
  placeholder, type = 'text', autoComplete, inputMode, className = '',
}: {
  label: string; name: string; value: string; error: string | null; touched: boolean
  onChange: (name: string, v: string) => void; onBlur: (name: string) => void
  placeholder?: string; type?: string; autoComplete?: string; inputMode?: 'text' | 'numeric' | 'email'; className?: string
}) {
  const showError = touched && !!error
  return (
    <div className={className}>
      <label className={labelCls} htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        inputMode={inputMode}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={showError}
        aria-describedby={showError ? `${name}-error` : undefined}
        onChange={(e) => onChange(name, e.target.value)}
        onBlur={() => onBlur(name)}
        className={`${inputBase} ${showError ? 'border-[#d11] focus:border-[#d11]' : 'border-[#d8d8d8] focus:border-[#0d0d0d]'}`}
      />
      {showError && (
        <p id={`${name}-error`} className="mt-[5px] text-[10px] font-bold uppercase tracking-[0.08em] text-[#d11]">
          {error}
        </p>
      )}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[22px] leading-none tracking-[0.04em] uppercase mb-[18px]" style={{ fontFamily: 'var(--font-bebas)' }}>
      {children}
    </h2>
  )
}

interface PlacedOrder {
  number: string
  items: CartItem[]
  total: number
}

export default function CheckoutPage() {
  const router = useRouter()
  const reduced = useReducedMotion()
  const { items, total, count, openCart, clearCart } = useCart()
  const { notify } = useToast()

  const [form, setForm] = useState<FormState>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [placing, setPlacing] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)
  const [order, setOrder] = useState<PlacedOrder | null>(null)

  const grandTotal = total + SHIPPING

  const errors = useMemo(() => {
    const e: Record<string, string | null> = {}
    for (const k of Object.keys(VALIDATORS)) e[k] = VALIDATORS[k](form[k] ?? '')
    return e
  }, [form])

  const isValid = Object.values(errors).every((e) => e === null)

  const onChange = (name: string, v: string) => {
    setForm((p) => ({ ...p, [name]: v }))
    if (payError) setPayError(null)
  }
  const onBlur = (name: string) => setTouched((p) => ({ ...p, [name]: true }))

  const fieldProps = (name: string) => ({
    value: form[name] ?? '',
    error: errors[name] ?? null,
    touched: !!touched[name],
    onChange,
    onBlur,
  })

  const onPay = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) {
      // Reveal all errors and stop.
      setTouched(Object.keys(VALIDATORS).reduce((a, k) => ({ ...a, [k]: true }), {}))
      notify('Check the highlighted fields', 'error')
      return
    }
    setPayError(null)
    setPlacing(true)

    // Stripe Checkout is wired here later — this simulates the PaymentIntent
    // round-trip. Cards starting 4000 are declined (Stripe test convention) so
    // the error state is reachable; everything else succeeds.
    const declined = (form.card ?? '').replace(/\D/g, '').startsWith('4000')
    setTimeout(() => {
      setPlacing(false)
      if (declined) {
        setPayError('Your card was declined. Try a different payment method.')
        notify('Payment declined', 'error')
        return
      }
      const number = 'SCR-' + Date.now().toString(36).toUpperCase().slice(-6)
      setOrder({ number, items, total })
      clearCart()
      notify('Order confirmed', 'success')
    }, 1400)
  }

  // ── Confirmation (checked before the empty-bag guard, since we clear the cart) ──
  if (order) {
    return (
      <div className="min-h-screen bg-white text-[#0d0d0d] flex flex-col items-center justify-center px-4 md:px-16 py-16">
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[460px] flex flex-col items-center text-center"
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
            Thanks for joining the world. A confirmation is on its way to your inbox — your pieces ship as the drop lands.
          </p>

          {/* Summary */}
          <div className="mt-[28px] w-full border border-[#ececec] rounded-[10px] p-[20px] text-left">
            <div className="flex flex-col divide-y divide-[#eee]">
              {order.items.map((it) => (
                <div key={`${it.product.id}-${it.size}`} className="flex items-center justify-between gap-[12px] py-[12px] first:pt-0 last:pb-0">
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.04em] leading-snug">
                    {it.product.name} · {it.size} · ×{it.quantity}
                  </span>
                  <span className="text-[12px] font-bold shrink-0">${(it.product.price * it.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="mt-[14px] pt-[14px] border-t border-[#0d0d0d] flex justify-between items-baseline">
              <span className="text-[13px] font-extrabold uppercase tracking-[0.04em]">Total</span>
              <span className="text-[18px] font-extrabold">${(order.total + SHIPPING).toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-[28px] flex w-full flex-col gap-[12px]">
            <Link
              href="/inventory"
              className="w-full py-[16px] bg-[#0d0d0d] text-white text-[12px] font-extrabold tracking-[0.12em] uppercase rounded text-center hover:bg-[#FF4FA3] transition-colors duration-200"
            >
              Continue shopping
            </Link>
            <Link
              href="/"
              className="w-full py-[14px] text-[12px] font-bold tracking-[0.1em] uppercase text-[#6F6F73] text-center hover:text-[#0d0d0d] transition-colors"
            >
              Back to the game
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white text-[#0d0d0d] flex flex-col items-center justify-center gap-[20px] px-6">
        <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#6F6F73]">Your bag is empty.</p>
        <Link
          href="/inventory"
          className="px-[28px] py-[14px] bg-[#0d0d0d] text-white text-[12px] font-extrabold tracking-[0.12em] uppercase rounded"
        >
          Browse the inventory
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-[#0d0d0d] flex flex-col">

      {/* Header */}
      <header className="relative flex items-center px-4 md:px-16 lg:px-[120px] pt-6 md:pt-10 pb-4 md:pb-8 border-b border-[#eee]">
        <button onClick={() => router.back()} aria-label="Back" className="flex items-center justify-center w-[36px] h-[36px] hover:opacity-60 transition-opacity">
          <svg width="24" height="24" viewBox="0 0 56 56" fill="none">
            <path d="M23.8406 12.4604C23.8402 11.4627 22.669 10.9255 21.9128 11.5766L4.89429 26.2319C3.81325 27.1628 3.81325 28.8372 4.89429 29.7681L21.9128 44.4233C22.669 45.0744 23.8402 44.5372 23.8406 43.5395V35.5835H47.1746C48.4631 35.5833 49.5076 34.5381 49.5076 33.2495V22.7495C49.5073 21.4612 48.4629 20.4167 47.1746 20.4165H23.8406V12.4604Z" fill="#0D0D0D"/>
          </svg>
        </button>
        <div className="absolute left-0 right-0 flex justify-center pointer-events-none">
          <span className="text-[28px] md:text-[40px] leading-none tracking-[0.06em] uppercase" style={{ fontFamily: 'var(--font-bebas)' }}>
            Checkout
          </span>
        </div>
        <button onClick={openCart} aria-label="Cart" className="ml-auto text-[11px] font-bold uppercase tracking-[0.1em] text-[#6F6F73] hover:text-[#0d0d0d] transition-colors">
          {count} {count === 1 ? 'item' : 'items'}
        </button>
      </header>

      <form onSubmit={onPay} noValidate className="flex-1 w-full max-w-[1100px] mx-auto px-4 md:px-16 lg:px-[40px] py-8 md:py-[56px] grid md:grid-cols-[1fr_minmax(320px,420px)] gap-x-[64px] gap-y-[40px]">

        {/* ── Left: details ── */}
        <div className="flex flex-col gap-[40px]">

          {/* Contact */}
          <section>
            <SectionTitle>Contact</SectionTitle>
            <Field label="Email" name="email" type="email" inputMode="email" placeholder="you@email.com" autoComplete="email" {...fieldProps('email')} />
          </section>

          {/* Shipping */}
          <section>
            <SectionTitle>Shipping address</SectionTitle>
            <div className="grid grid-cols-2 gap-[14px]">
              <Field label="First name" name="firstName" autoComplete="given-name" {...fieldProps('firstName')} />
              <Field label="Last name" name="lastName" autoComplete="family-name" {...fieldProps('lastName')} />
              <Field label="Address" name="address" autoComplete="address-line1" className="col-span-2" {...fieldProps('address')} />
              <AddressLine2 value={form.address2 ?? ''} onChange={onChange} />
              <Field label="City" name="city" autoComplete="address-level2" {...fieldProps('city')} />
              <Field label="State / Region" name="state" autoComplete="address-level1" {...fieldProps('state')} />
              <Field label="ZIP / Postal code" name="zip" autoComplete="postal-code" {...fieldProps('zip')} />
              <Field label="Country" name="country" placeholder="United Kingdom" autoComplete="country-name" {...fieldProps('country')} />
            </div>
          </section>

          {/* Payment */}
          <section>
            <div className="flex items-center justify-between mb-[18px]">
              <h2 className="text-[22px] leading-none tracking-[0.04em] uppercase" style={{ fontFamily: 'var(--font-bebas)' }}>Payment</h2>
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#6F6F73]">Secured by Stripe</span>
            </div>
            <div className="grid grid-cols-2 gap-[14px]">
              <Field label="Card number" name="card" inputMode="numeric" placeholder="1234 1234 1234 1234" className="col-span-2" {...fieldProps('card')} />
              <Field label="Expiry" name="expiry" inputMode="numeric" placeholder="MM / YY" {...fieldProps('expiry')} />
              <Field label="CVC" name="cvc" inputMode="numeric" placeholder="123" {...fieldProps('cvc')} />
            </div>
            <p className="text-[10px] text-[#6F6F73] mt-[12px] leading-relaxed">
              Payments are processed securely via Stripe. Your card details never touch our servers.
            </p>
          </section>
        </div>

        {/* ── Right: order summary ── */}
        <aside className="md:sticky md:top-[40px] h-fit border border-[#ececec] rounded-[10px] p-[24px] md:p-[28px] bg-[#fcfcfc]">
          <h2 className="text-[18px] leading-none tracking-[0.04em] uppercase mb-[20px]" style={{ fontFamily: 'var(--font-bebas)' }}>Order summary</h2>

          <div className="flex flex-col divide-y divide-[#eee]">
            {items.map((item) => (
              <div key={`${item.product.id}-${item.size}`} className="flex gap-[14px] py-[16px] first:pt-0">
                <div className="relative w-[60px] h-[60px] shrink-0 bg-[#f3f3f3] rounded overflow-hidden">
                  {item.product.image && (
                    <Image src={item.product.image} alt={item.product.name} fill className="object-contain" />
                  )}
                  <span className="absolute -top-[6px] -right-[6px] w-[18px] h-[18px] rounded-full bg-[#0d0d0d] text-white text-[9px] font-bold flex items-center justify-center">
                    {item.quantity}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.04em] leading-snug">{item.product.name}</p>
                  <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#6F6F73] mt-[3px]">Size {item.size}</p>
                </div>
                <p className="text-[12px] font-bold shrink-0">${(item.product.price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>

          <div className="mt-[20px] pt-[18px] border-t border-[#eee] flex flex-col gap-[10px]">
            <Row label="Subtotal" value={`$${total.toFixed(2)}`} />
            <Row label="Shipping" value={SHIPPING === 0 ? 'Free' : `$${SHIPPING.toFixed(2)}`} />
            <Row label="Taxes" value="Calculated at payment" muted />
          </div>

          <div className="mt-[18px] pt-[18px] border-t border-[#0d0d0d] flex justify-between items-baseline">
            <span className="text-[15px] font-extrabold uppercase tracking-[0.04em]">Total</span>
            <span className="text-[22px] font-extrabold">${grandTotal.toFixed(2)}</span>
          </div>

          {payError && (
            <p className="mt-[16px] rounded border border-[#d11] bg-[#fff3f3] px-[14px] py-[10px] text-[11px] font-bold uppercase tracking-[0.06em] leading-snug text-[#d11]">
              {payError}
            </p>
          )}

          <motion.button
            type="submit"
            disabled={placing}
            whileTap={reduced || placing ? {} : { scale: 0.98 }}
            className="w-full mt-[18px] py-[16px] bg-[#0d0d0d] text-white text-[13px] font-extrabold tracking-[0.1em] uppercase rounded border border-[#0d0d0d] hover:bg-[#FF4FA3] hover:border-[#FF4FA3] transition-colors duration-200 disabled:opacity-60 disabled:hover:bg-[#0d0d0d] disabled:hover:border-[#0d0d0d]"
          >
            {placing ? 'Processing…' : `Pay $${grandTotal.toFixed(2)}`}
          </motion.button>
          <p className="text-[9px] text-center text-[#6F6F73] mt-[10px] uppercase tracking-[0.08em]">
            By placing your order you agree to the SCR!PTS terms.
          </p>
        </aside>
      </form>
    </div>
  )
}

function AddressLine2({ value, onChange }: { value: string; onChange: (name: string, v: string) => void }) {
  return (
    <div className="col-span-2">
      <label className={labelCls} htmlFor="address2">Apartment, suite (optional)</label>
      <input
        id="address2"
        name="address2"
        value={value}
        autoComplete="address-line2"
        onChange={(e) => onChange('address2', e.target.value)}
        className={`${inputBase} border-[#d8d8d8] focus:border-[#0d0d0d]`}
      />
    </div>
  )
}

function Row({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#6F6F73]">{label}</span>
      <span className={`text-[13px] font-bold ${muted ? 'text-[#6F6F73]' : 'text-[#0d0d0d]'}`}>{value}</span>
    </div>
  )
}
