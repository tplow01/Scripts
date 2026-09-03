'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import type { Product, ProductVariant } from '@/types/product'
import { ALL_PRODUCTS } from '@/lib/products'
import { buildLegacyIndex, parseStoredCart, type StoredItem } from '@/lib/cartStorage'

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
  return parseStoredCart(window.localStorage.getItem(STORAGE_KEY), null, LEGACY)
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
    resolveStored(readStored())
      .then((resolved) => {
        if (!cancelled && resolved.length) setItems(resolved)
      })
      .catch(() => {
        // Offline, or the server is unhappy. Start empty rather than showing a
        // stale price — nothing is persisted, so the stored cart survives.
      })
      .finally(() => {
        hydrated.current = true
      })
    return () => {
      cancelled = true
    }
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
            ? { ...i, quantity: i.quantity + 1 }
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
          ? { ...i, quantity: i.quantity + 1 }
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
