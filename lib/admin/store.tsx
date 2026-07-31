'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { CYBER_LOVE_PRODUCTS } from '@/lib/products'
import type { Product } from '@/types/product'
import { MOCK_ORDERS } from './mockOrders'
import type { AdminOrder, OrderStatus } from './types'

export interface AdminState {
  products: Product[]
  orders: AdminOrder[]
}

const STORAGE_KEY = 'scripts-admin-v2'

/** Shared physical-product fields inherited by drawer-created products (mirrors the catalog's SHARED block). */
export const NEW_PRODUCT_DEFAULTS = {
  fabric: '100% Cotton',
  fabricWeight: '260 g/m²',
  fit: 'Cropped and boxy fit.',
  modelNote: 'Model is 6\'2", 168lbs in size Medium.',
  careInstructions: [
    'Machine wash at 30°C (gentle cycle)',
    'Do not bleach',
    'Tumble dry low',
    'Iron at low temperature, avoid ironing on print',
    'Do not dry clean',
  ],
} as const

// ── Pure state transitions (unit-tested; the provider is a thin shell over these).

export function seedState(): AdminState {
  return { products: [...CYBER_LOVE_PRODUCTS], orders: [...MOCK_ORDERS] }
}

export function addProduct(s: AdminState, p: Product): AdminState {
  return { ...s, products: [p, ...s.products] }
}

export function updateProduct(s: AdminState, p: Product): AdminState {
  return { ...s, products: s.products.map((x) => (x.id === p.id ? p : x)) }
}

export function deleteProduct(s: AdminState, id: string): AdminState {
  return { ...s, products: s.products.filter((x) => x.id !== id) }
}

/** available ↔ pre-order; a sold-out product is rescued back to available. */
export function toggleProductStatus(s: AdminState, id: string): AdminState {
  return {
    ...s,
    products: s.products.map((x) =>
      x.id === id ? { ...x, status: x.status === 'available' ? 'pre-order' : 'available' } : x),
  }
}

/** Timeline stamping: forward transitions stamp now (keeping earlier stamps); backward transitions clear later stamps. */
export function applyOrderStatus(order: AdminOrder, status: OrderStatus, nowIso: string): AdminOrder {
  const t = { ...order.timeline }
  if (status === 'pending') { t.shippedAt = null; t.deliveredAt = null }
  else if (status === 'shipped') { t.shippedAt = t.shippedAt ?? nowIso; t.deliveredAt = null }
  else { t.shippedAt = t.shippedAt ?? nowIso; t.deliveredAt = t.deliveredAt ?? nowIso }
  return { ...order, status, timeline: t }
}

export function setOrderStatus(s: AdminState, orderId: string, status: OrderStatus, nowIso: string): AdminState {
  return { ...s, orders: s.orders.map((o) => (o.id === orderId ? applyOrderStatus(o, status, nowIso) : o)) }
}

/** Rehydrate from localStorage; any malformed payload falls back to null (caller seeds). */
export function parseStoredState(raw: string | null): AdminState | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as AdminState
    if (!Array.isArray(parsed.products) || !Array.isArray(parsed.orders)) return null
    if (parsed.orders.some((o) => !Array.isArray((o as AdminOrder).lineItems))) return null
    const clean = (u: string | null | undefined) => (typeof u === 'string' && u.startsWith('blob:') ? null : u ?? null)
    parsed.products = parsed.products.map((p) => ({
      ...p,
      image: clean(p.image),
      backImage: clean(p.backImage),
      galleryImages: p.galleryImages?.map(clean).filter((u): u is string => u !== null),
    }))
    return parsed
  } catch {
    return null
  }
}

// ── React context.

interface AdminApi {
  state: AdminState
  add: (p: Product) => void
  update: (p: Product) => void
  remove: (id: string) => void
  toggleStatus: (id: string) => void
  setOrder: (orderId: string, status: OrderStatus) => void
}

const AdminContext = createContext<AdminApi | null>(null)

export function AdminProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AdminState>(seedState)
  // True once the persist effect has run at least once. The very first render/commit uses
  // seed state — persisting it before rehydration lands would clobber whatever was stored.
  const persistedOnce = useRef(false)

  // Rehydrate after mount (localStorage is client-only; seeds render on the server pass).
  useEffect(() => {
    const stored = parseStoredState(localStorage.getItem(STORAGE_KEY))
    if (stored) setState(stored)
  }, [])

  // Persist on every change. Object-URL images won't survive reload — pages render a placeholder then.
  useEffect(() => {
    if (!persistedOnce.current) {
      persistedOnce.current = true
      return
    }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* storage full/blocked: demo continues in memory */ }
  }, [state])

  const add = useCallback((p: Product) => setState((s) => addProduct(s, p)), [])
  const update = useCallback((p: Product) => setState((s) => updateProduct(s, p)), [])
  const remove = useCallback((id: string) => setState((s) => deleteProduct(s, id)), [])
  const toggleStatus = useCallback((id: string) => setState((s) => toggleProductStatus(s, id)), [])
  const setOrder = useCallback(
    (orderId: string, status: OrderStatus) =>
      setState((s) => setOrderStatus(s, orderId, status, new Date().toISOString())),
    [])

  return (
    <AdminContext.Provider value={{ state, add, update, remove, toggleStatus, setOrder }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin(): AdminApi {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin must be used inside <AdminProvider>')
  return ctx
}
