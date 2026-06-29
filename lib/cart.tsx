'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import type { Product } from '@/types/product'

export interface CartItem {
  product: Product
  size: string
  quantity: number
}

interface CartCtx {
  items: CartItem[]
  add: (product: Product, size: string) => void
  remove: (productId: string, size: string) => void
  increment: (productId: string, size: string) => void
  decrement: (productId: string, size: string) => void
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
  const openCart  = useCallback(() => setIsOpen(true), [])
  const closeCart = useCallback(() => setIsOpen(false), [])

  const add = useCallback((product: Product, size: string) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id && i.size === size)
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id && i.size === size
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      }
      return [...prev, { product, size, quantity: 1 }]
    })
  }, [])

  const remove = useCallback((productId: string, size: string) => {
    setItems((prev) => prev.filter((i) => !(i.product.id === productId && i.size === size)))
  }, [])

  const increment = useCallback((productId: string, size: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.product.id === productId && i.size === size
          ? { ...i, quantity: i.quantity + 1 }
          : i
      )
    )
  }, [])

  const decrement = useCallback((productId: string, size: string) => {
    setItems((prev) =>
      prev
        .map((i) =>
          i.product.id === productId && i.size === size
            ? { ...i, quantity: i.quantity - 1 }
            : i
        )
        .filter((i) => i.quantity > 0)
    )
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const count = items.reduce((s, i) => s + i.quantity, 0)
  const total = items.reduce((s, i) => s + i.product.price * i.quantity, 0)

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
