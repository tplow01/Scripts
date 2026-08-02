'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { CYBER_LOVE_PRODUCTS } from '@/lib/products'
import type { Product } from '@/types/product'
import { reconcileVariants, type VariantDefaults } from './variants'
import { isMigrated, migrateProducts, type LegacyProduct } from './migrate'
import { MOCK_ORDERS } from './mockOrders'
import type { AdminOrder, OrderStatus } from './types'

export interface AdminState {
  products: Product[]
  orders: AdminOrder[]
}

const STORAGE_KEY = 'scripts-admin-v2'

/** Shared physical-product fields a brand-new product inherits. */
export const NEW_PRODUCT_DEFAULTS = {
  collection: '1-800-Cyber-Love',
  productType: 'Tee',
  vendor: 'SCR!PTS',
  tags: [] as string[],
  publishedStatus: 'draft' as const,
  shipDate: '',
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

export const NEW_VARIANT_DEFAULTS: VariantDefaults = {
  price: 44, compareAtPrice: null, cost: null, barcode: null,
  trackInventory: true, allowBackorder: false, weightGrams: null,
}

/** A blank product with a Size axis already up, ready for the editor. */
export function blankProduct(id: string): Product {
  const options = [{ name: 'Size', values: ['S', 'M', 'L', 'XL'], position: 1 }]
  const shell: Product = {
    ...NEW_PRODUCT_DEFAULTS,
    careInstructions: [...NEW_PRODUCT_DEFAULTS.careInstructions],
    tags: [],
    id, name: '', slug: '', emotion: '', description: '',
    skuRoot: '', requiresShipping: true, seo: { title: '', description: '' },
    options, variants: [], media: [],
  }
  return { ...shell, variants: reconcileVariants(id, '', options, [], NEW_VARIANT_DEFAULTS) }
}

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

/** Flip a product between draft and active from the list row. */
export function togglePublished(s: AdminState, id: string): AdminState {
  return {
    ...s,
    products: s.products.map((p) =>
      p.id === id
        ? { ...p, publishedStatus: p.publishedStatus === 'active' ? 'draft' : 'active' }
        : p),
  }
}

/** Set one variant's stock from an inline cell edit. */
export function setVariantStock(s: AdminState, productId: string, variantId: string, stock: number): AdminState {
  return {
    ...s,
    products: s.products.map((p) =>
      p.id === productId
        ? { ...p, variants: p.variants.map((v) => (v.id === variantId ? { ...v, stock: Math.max(0, stock) } : v)) }
        : p),
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
    parsed.products = parsed.products.every(isMigrated)
      ? parsed.products
      : migrateProducts(parsed.products as unknown as LegacyProduct[])
    parsed.products = parsed.products.map((p) => {
      const media = (p.media ?? []).filter((m) => !m.url.startsWith('blob:'))
      const mediaIds = new Set(media.map((m) => m.id))
      return {
        ...p,
        media,
        // Any variant pointing at a media id removed above falls back to unset.
        variants: (p.variants ?? []).map((v) => ({
          ...v,
          imageId: v.imageId && mediaIds.has(v.imageId) ? v.imageId : null,
        })),
      }
    })
    return parsed
  } catch {
    return null
  }
}

// ── React context.

interface AdminApi {
  state: AdminState
  hydrated: boolean
  add: (p: Product) => void
  update: (p: Product) => void
  remove: (id: string) => void
  togglePublished: (id: string) => void
  setOrder: (orderId: string, status: OrderStatus) => void
}

const AdminContext = createContext<AdminApi | null>(null)

export function AdminProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AdminState>(seedState)
  // True once the rehydration effect below has run, whether or not a stored payload existed.
  // Consumers that capture state.products into local component state (e.g. the edit-product
  // form) must wait for this before mounting, or they lock onto seed data on a hard reload.
  const [hydrated, setHydrated] = useState(false)
  // True once the persist effect has run at least once. The very first render/commit uses
  // seed state — persisting it before rehydration lands would clobber whatever was stored.
  const persistedOnce = useRef(false)

  // Rehydrate after mount (localStorage is client-only; seeds render on the server pass).
  useEffect(() => {
    const stored = parseStoredState(localStorage.getItem(STORAGE_KEY))
    if (stored) setState(stored)
    setHydrated(true)
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
  const togglePublishedCb = useCallback((id: string) => setState((s) => togglePublished(s, id)), [])
  const setOrder = useCallback(
    (orderId: string, status: OrderStatus) =>
      setState((s) => setOrderStatus(s, orderId, status, new Date().toISOString())),
    [])

  return (
    <AdminContext.Provider
      value={{ state, hydrated, add, update, remove, togglePublished: togglePublishedCb, setOrder }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin(): AdminApi {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin must be used inside <AdminProvider>')
  return ctx
}
