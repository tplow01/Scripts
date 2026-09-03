'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { ALL_PRODUCTS } from '@/lib/products'
import type { Product } from '@/types/product'
import { reconcileVariants, type VariantDefaults } from './variants'
import { isMigrated, migrateProducts, type LegacyProduct } from './migrate'
import { MOCK_ORDERS } from './mockOrders'
import { useToast } from '@/lib/toast'
import type { AdminOrder, OrderStatus } from './types'

export interface AdminState {
  products: Product[]
  orders: AdminOrder[]
}

/** Shared physical-product fields a brand-new product inherits. */
export const NEW_PRODUCT_DEFAULTS = {
  collection: '1-800-Cyber-Love',
  // New products are storefront pieces; the Basement is opt-in only.
  isBasement: false,
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
  return { products: [...ALL_PRODUCTS], orders: [...MOCK_ORDERS] }
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
  // True once the server load has settled, successfully or not. Consumers that
  // copy state.products into local state (the product editor) must wait for it.
  const [hydrated, setHydrated] = useState(false)
  const { notify } = useToast()

  // Latest state, readable outside a setState updater so mutations can capture
  // a rollback point without making the updater impure (React StrictMode
  // double-invokes updaters — a fetch fired inside one would run twice).
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  // Load the catalog and orders from the server. Until Supabase is configured
  // these endpoints serve the seed catalog, so the back office looks the same
  // as it always has.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [productsRes, ordersRes] = await Promise.all([
          fetch('/api/admin/products'),
          fetch('/api/admin/orders'),
        ])
        if (!productsRes.ok || !ordersRes.ok) throw new Error('Could not load the back office.')
        const [{ products }, { orders }] = await Promise.all([
          productsRes.json() as Promise<{ products: Product[] }>,
          ordersRes.json() as Promise<{ orders: AdminOrder[] }>,
        ])
        if (!cancelled) setState({ products, orders })
      } catch {
        if (!cancelled) notify('Could not load the back office. Showing seed data.', 'error')
      } finally {
        if (!cancelled) setHydrated(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [notify])

  /**
   * Apply the change locally at once, then confirm it with the server. If the
   * request fails the previous state goes back and the reason is shown — the
   * screen never claims a save that did not happen.
   */
  const mutate = useCallback(
    (optimistic: (s: AdminState) => AdminState, request: () => Promise<Response>) => {
      const previous = stateRef.current
      setState(optimistic(previous))
      void (async () => {
        try {
          const res = await request()
          if (!res.ok) {
            const body = (await res.json().catch(() => null)) as
              | { error?: { message?: string } }
              | null
            throw new Error(body?.error?.message ?? `That change was not saved (${res.status}).`)
          }
        } catch (err) {
          setState(previous)
          notify(err instanceof Error ? err.message : 'That change was not saved.', 'error')
        }
      })()
    },
    [notify],
  )

  const json = (body: unknown): RequestInit => ({
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const add = useCallback(
    (p: Product) =>
      mutate(
        (s) => addProduct(s, p),
        () => fetch('/api/admin/products', { method: 'POST', ...json(p) }),
      ),
    [mutate],
  )

  const update = useCallback(
    (p: Product) =>
      mutate(
        (s) => updateProduct(s, p),
        () => fetch(`/api/admin/products/${encodeURIComponent(p.id)}`, { method: 'PUT', ...json(p) }),
      ),
    [mutate],
  )

  const remove = useCallback(
    (id: string) =>
      mutate(
        (s) => deleteProduct(s, id),
        () => fetch(`/api/admin/products/${encodeURIComponent(id)}`, { method: 'DELETE' }),
      ),
    [mutate],
  )

  const togglePublishedCb = useCallback(
    (id: string) => {
      const current = stateRef.current.products.find((p) => p.id === id)
      const publishedStatus = current?.publishedStatus === 'active' ? 'draft' : 'active'
      mutate(
        (s) => togglePublished(s, id),
        () =>
          fetch(`/api/admin/products/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            ...json({ publishedStatus }),
          }),
      )
    },
    [mutate],
  )

  const setOrder = useCallback(
    (orderId: string, status: OrderStatus) =>
      mutate(
        (s) => setOrderStatus(s, orderId, status, new Date().toISOString()),
        () =>
          fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
            method: 'PATCH',
            ...json({ status }),
          }),
      ),
    [mutate],
  )

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
