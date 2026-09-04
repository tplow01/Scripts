'use client'

import { useCallback, useState } from 'react'

import type { CartItem } from '@/lib/cart'

/**
 * Hand the bag to Stripe.
 *
 * Sends variant ids and quantities only — never prices. The server reads what
 * each variant costs from the database, checks stock, and builds the Checkout
 * Session, so nothing a shopper can edit in their browser changes what they pay.
 */
export function useStripeCheckout() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const start = useCallback(async (items: CartItem[]) => {
    if (busy || !items.length) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ variantId: i.variant.id, quantity: i.quantity })),
        }),
      })
      const body = (await res.json().catch(() => null)) as
        | { url?: string; error?: { message?: string } }
        | null

      if (!res.ok || !body?.url) {
        // 409 is the useful one: something sold out between adding and paying.
        setError(body?.error?.message ?? 'Could not start checkout. Try again.')
        setBusy(false)
        return
      }
      // Leaving the site, so `busy` intentionally stays true — the button must
      // not become clickable again during the redirect.
      window.location.assign(body.url)
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
      setBusy(false)
    }
  }, [busy])

  return { start, busy, error }
}
