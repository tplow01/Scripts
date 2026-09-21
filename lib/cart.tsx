'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import type { Product, ProductVariant } from '@/types/product'
import { ALL_PRODUCTS } from '@/lib/products'
import { MAX_QTY, buildLegacyIndex, parseStoredCart, type StoredItem } from '@/lib/cartStorage'

const STORAGE_KEY = 'scripts-cart'

/**
 * Maps the pre-split `{ id, size }` storage shape onto variant ids. It reads
 * the seed catalog on purpose — its only job is interpreting an old localStorage
 * format. What exists and what it costs comes from the server.
 */
const LEGACY = buildLegacyIndex(ALL_PRODUCTS)

export interface CartItem {
  product: Product
  variant: ProductVariant
  quantity: number
}

function readStored(): StoredItem[] {
  if (typeof window === 'undefined') return []
  // Clamp to what the server accepts, and drop lines that make no sense. One
  // corrupt entry must not get the whole cart rejected.
  return parseStoredCart(window.localStorage.getItem(STORAGE_KEY), null, LEGACY)
    .filter((i) => typeof i.variantId === 'string' && Number.isFinite(i.quantity))
    .map((i) => ({ ...i, quantity: Math.min(MAX_QTY, Math.floor(i.quantity)) }))
    .filter((i) => i.quantity >= 1)
}

/**
 * Trade stored ids for authoritative products and prices. The browser sends
 * ids and quantities only; it never tells the server what anything costs.
 * Variants that no longer exist come back dropped.
 */
async function resolveStored(stored: StoredItem[]): Promise<CartItem[]> {
  if (!stored.length) return []
  const res = await fetch('/api/cart/resolve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: stored }),
  })
  if (!res.ok) throw new Error(`Could not resolve the cart (${res.status})`)
  const data = (await res.json()) as { items?: CartItem[] }
  return data.items ?? []
}

interface CartCtx {
  items: CartItem[]
  add: (product: Product, variant: ProductVariant) => void
  remove: (variantId: string) => void
  increment: (variantId: string) => void
  decrement: (variantId: string) => void
  clearCart: () => void
  count: number
  total: number
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
}

const CartContext = createContext<CartCtx | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)

  // Hydrate from localStorage after mount (keeps SSR/first render = empty,
  // avoiding hydration mismatch), then persist on every change.
  const hydrated = useRef(false)
  useEffect(() => {
    let cancelled = false
    let retry: ReturnType<typeof setTimeout> | undefined

    const hydrate = (attempt: number) => {
      resolveStored(readStored())
        .then((resolved) => {
          if (cancelled) return
          if (resolved.length) {
            // Merge, don't overwrite: anything added while the fetch was in
            // flight (e.g. straight from the game) must survive the stored
            // cart landing.
            setItems((current) => {
              const merged = [...resolved]
              for (const c of current) {
                const at = merged.findIndex((m) => m.variant.id === c.variant.id)
                if (at === -1) merged.push(c)
                else merged[at] = { ...merged[at], quantity: Math.max(merged[at].quantity, c.quantity) }
              }
              return merged
            })
          }
          // Only now is it safe to write: we know what the stored cart held.
          hydrated.current = true
        })
        .catch(() => {
          // Offline, or the server is unhappy. Leave `hydrated` false so the
          // persist effect never overwrites the stored cart with a partial one
          // (an add made now would otherwise replace everything saved). Try
          // again shortly; if it never works, the stored cart is still intact.
          if (!cancelled && attempt < 5) retry = setTimeout(() => hydrate(attempt + 1), 3000 * (attempt + 1))
        })
    }
    hydrate(0)

    return () => {
      cancelled = true
      if (retry) clearTimeout(retry)
    }
  }, [])
  // Another tab changed the bag. localStorage is the shared truth, so pick its
  // version up instead of letting this tab's next write overwrite it (which is
  // how an item added in one tab used to vanish when a second tab added
  // something). `storage` only fires in the *other* tabs, so this cannot echo.
  useEffect(() => {
    let latest = 0
    const onStorage = (e: StorageEvent) => {
      if (e.key !== null && e.key !== STORAGE_KEY) return
      const ticket = ++latest
      resolveStored(readStored())
        .then((resolved) => {
          if (ticket === latest) setItems(resolved)
        })
        .catch(() => {
          // Keep what this tab has; the next successful sync catches up.
        })
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  useEffect(() => {
    if (!hydrated.current || typeof window === 'undefined') return
    const minimal: StoredItem[] = items.map((i) => ({ variantId: i.variant.id, quantity: i.quantity }))
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal))
  }, [items])
  const openCart  = useCallback(() => setIsOpen(true), [])
  const closeCart = useCallback(() => setIsOpen(false), [])

  const add = useCallback((product: Product, variant: ProductVariant) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.variant.id === variant.id)
      if (existing) {
        return prev.map((i) =>
          i.variant.id === variant.id
            ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + 1) }
            : i
        )
      }
      return [...prev, { product, variant, quantity: 1 }]
    })
  }, [])

  const remove = useCallback((variantId: string) => {
    setItems((prev) => prev.filter((i) => i.variant.id !== variantId))
  }, [])

  const increment = useCallback((variantId: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.variant.id === variantId
          ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + 1) }
          : i
      )
    )
  }, [])

  const decrement = useCallback((variantId: string) => {
    setItems((prev) =>
      prev
        .map((i) =>
          i.variant.id === variantId
            ? { ...i, quantity: i.quantity - 1 }
            : i
        )
        .filter((i) => i.quantity > 0)
    )
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const count = items.reduce((s, i) => s + i.quantity, 0)
  const total = items.reduce((s, i) => s + i.variant.price * i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, add, remove, increment, decrement, clearCart, count, total, isOpen, openCart, closeCart }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
