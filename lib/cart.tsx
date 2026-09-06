'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import type { Product, ProductVariant } from '@/types/product'
import { ALL_PRODUCTS } from '@/lib/products'
import { buildLegacyIndex, buildVariantIndex, parseStoredCart, type StoredItem } from '@/lib/cartStorage'
import { useSFX } from '@/lib/sfx'

const STORAGE_KEY = 'scripts-cart'

const VARIANTS = buildVariantIndex(ALL_PRODUCTS)
const LEGACY = buildLegacyIndex(ALL_PRODUCTS)

export interface CartItem {
  product: Product
  variant: ProductVariant
  quantity: number
}

function loadStored(): CartItem[] {
  if (typeof window === 'undefined') return []
  return parseStoredCart(window.localStorage.getItem(STORAGE_KEY), VARIANTS, LEGACY)
    .map(({ variantId, quantity }) => {
      const ref = VARIANTS.get(variantId)!
      return { product: ref.product, variant: ref.variant, quantity }
    })
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
  const sfx = useSFX()

  // Hydrate from localStorage after mount (keeps SSR/first render = empty,
  // avoiding hydration mismatch), then persist on every change.
  const hydrated = useRef(false)
  useEffect(() => {
    const stored = loadStored()
    if (stored.length) setItems(stored)
    hydrated.current = true
  }, [])
  useEffect(() => {
    if (!hydrated.current || typeof window === 'undefined') return
    const minimal: StoredItem[] = items.map((i) => ({ variantId: i.variant.id, quantity: i.quantity }))
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal))
  }, [items])
  const openCart  = useCallback(() => { sfx.play('open'); setIsOpen(true) }, [sfx])
  const closeCart = useCallback(() => { sfx.play('close'); setIsOpen(false) }, [sfx])

  const add = useCallback((product: Product, variant: ProductVariant) => {
    sfx.play('add-to-cart')
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
  }, [sfx])

  const remove = useCallback((variantId: string) => {
    sfx.play('remove-from-cart')
    setItems((prev) => prev.filter((i) => i.variant.id !== variantId))
  }, [sfx])

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
