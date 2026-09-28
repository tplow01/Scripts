# Admin Dashboard Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Heath's fully interactive mock-data admin dashboard (Overview / Products / Orders) at a hidden route, per `docs/superpowers/specs/2026-07-30-admin-dashboard-prototype-design.md`.

**Architecture:** A hidden route group `app/office-scr1pts-x7k2/` whose layout wraps every page in `AdminProvider` — a React context over pure, unit-tested state-transition functions, seeded from the real catalog and synced to `localStorage`. Pages are `'use client'` components rendering from `useAdmin()`; no backend.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind (brand tokens `ink/paper/pink/grey` already configured), Bebas Neue via `style={{ fontFamily: 'var(--font-bebas)' }}` (repo convention — there is no Tailwind `font-bebas` class), `lucide-react` (new dep), Vitest.

## Global Constraints

- Secret slug is exactly `office-scr1pts-x7k2`, defined ONCE in `lib/admin/config.ts` (`ADMIN_SLUG`); no other file hardcodes it. `/admin` must not exist.
- Admin layout metadata sets `robots: { index: false, follow: false }`. No customer-facing page links to the admin.
- Visual language: `bg-ink` (#0D0D0D) background, `text-paper` (#F7F7F5), Primary Pink accent via Tailwind `pink` (#FF8AC7), muted text/borders via `grey` (#6F6F73); headings/stat numbers in Bebas Neue via `style={{ fontFamily: 'var(--font-bebas)' }}` + `uppercase tracking-[0.04em]`.
- Products use the real `Product` type from `types/product.ts` verbatim — never a parallel product shape.
- Status badge tones: Pending `#D9A441`, Shipped `#5B8DC9`, Delivered `#5FA36B` — pill = tone at 15% opacity background + full-tone text.
- `lucide-react` is the ONLY new dependency.
- localStorage key is exactly `scripts-admin-v1`; corrupt/absent payloads silently fall back to seeds.
- Do not modify anything under `app/` outside the new admin folder, or any existing component/lib file except as listed in tasks.

---

### Task 1: Admin config, order types, and seed orders

**Files:**
- Create: `lib/admin/config.ts`
- Create: `lib/admin/types.ts`
- Create: `lib/admin/mockOrders.ts`
- Test: `__tests__/adminSeeds.test.ts`

**Interfaces:**
- Produces: `ADMIN_SLUG: string`, `adminPath(sub?: string): string` (from `config.ts`); `OrderStatus = 'pending' | 'shipped' | 'delivered'`, `AdminOrder { id, customer, items, total, date, status }` (from `types.ts`); `MOCK_ORDERS: AdminOrder[]` (from `mockOrders.ts`). Tasks 2–6 consume all of these.

- [ ] **Step 1: Write the failing test**

Create `__tests__/adminSeeds.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { ADMIN_SLUG, adminPath } from '@/lib/admin/config'
import { MOCK_ORDERS } from '@/lib/admin/mockOrders'

describe('admin config', () => {
  it('slug is defined once and adminPath builds routes from it', () => {
    expect(ADMIN_SLUG).toBe('office-scr1pts-x7k2')
    expect(adminPath()).toBe('/office-scr1pts-x7k2')
    expect(adminPath('products')).toBe('/office-scr1pts-x7k2/products')
    expect(adminPath('orders')).toBe('/office-scr1pts-x7k2/orders')
  })
})

describe('mock orders', () => {
  it('seeds ~10 plausible orders with valid statuses and totals', () => {
    expect(MOCK_ORDERS.length).toBeGreaterThanOrEqual(8)
    for (const o of MOCK_ORDERS) {
      expect(o.id).toMatch(/^SCR-\d{4}$/)
      expect(['pending', 'shipped', 'delivered']).toContain(o.status)
      expect(o.total).toBeGreaterThan(0)
      expect(o.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(o.customer.length).toBeGreaterThan(0)
      expect(o.items.length).toBeGreaterThan(0)
    }
    const ids = new Set(MOCK_ORDERS.map((o) => o.id))
    expect(ids.size).toBe(MOCK_ORDERS.length)
  })
})
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run __tests__/adminSeeds.test.ts`
Expected: FAIL (modules don't exist).

- [ ] **Step 3: Implement the three modules**

`lib/admin/config.ts`:

```ts
/** The ONE place the hidden admin slug lives. Change it here, nowhere else. */
export const ADMIN_SLUG = 'office-scr1pts-x7k2'

/** Build an admin route: adminPath() → '/office-scr1pts-x7k2', adminPath('orders') → '…/orders'. */
export function adminPath(sub = ''): string {
  return `/${ADMIN_SLUG}${sub ? `/${sub}` : ''}`
}
```

`lib/admin/types.ts`:

```ts
export type OrderStatus = 'pending' | 'shipped' | 'delivered'

/**
 * Mock order for the prototype. Items are a denormalized display string so
 * deleting a product never breaks an order.
 */
export interface AdminOrder {
  id: string // 'SCR-1042'
  customer: string
  items: string // '"RAGE" — Black ×1, "LOVE" — White ×2'
  total: number
  date: string // ISO 'YYYY-MM-DD'
  status: OrderStatus
}
```

`lib/admin/mockOrders.ts`:

```ts
import type { AdminOrder } from './types'

/** Seed orders — real catalog names, mixed statuses, dated over the two weeks before 2026-07-30. */
export const MOCK_ORDERS: AdminOrder[] = [
  { id: 'SCR-1051', customer: 'Maya Okafor', items: '"ANXIETY" — White ×1', total: 44, date: '2026-07-29', status: 'pending' },
  { id: 'SCR-1050', customer: 'Dev Patel', items: '"RAGE" — Black ×1, "LOVE" — White ×1', total: 88, date: '2026-07-28', status: 'pending' },
  { id: 'SCR-1049', customer: 'Jordan Lee', items: '"CONFUSION" — Green ×2', total: 88, date: '2026-07-27', status: 'pending' },
  { id: 'SCR-1048', customer: 'Sofia Reyes', items: '"LOVE" — White ×1', total: 44, date: '2026-07-25', status: 'shipped' },
  { id: 'SCR-1047', customer: 'Theo Nakamura', items: '"ANXIETY" — Black ×1, "RAGE" — Black ×1', total: 88, date: '2026-07-24', status: 'shipped' },
  { id: 'SCR-1046', customer: 'Amara Diallo', items: '"RAGE" — White ×1', total: 44, date: '2026-07-22', status: 'shipped' },
  { id: 'SCR-1045', customer: 'Lucas Meyer', items: '"CONFUSION" — Green ×1, "LOVE" — White ×2', total: 132, date: '2026-07-21', status: 'delivered' },
  { id: 'SCR-1044', customer: 'Priya Sharma', items: '"ANXIETY" — White ×1', total: 44, date: '2026-07-19', status: 'delivered' },
  { id: 'SCR-1043', customer: 'Noah Kim', items: '"LOVE" — Black ×1', total: 44, date: '2026-07-17', status: 'delivered' },
  { id: 'SCR-1042', customer: 'Elena Rossi', items: '"RAGE" — Black ×2', total: 88, date: '2026-07-16', status: 'delivered' },
]
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run __tests__/adminSeeds.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/admin/config.ts lib/admin/types.ts lib/admin/mockOrders.ts __tests__/adminSeeds.test.ts
git commit -m "feat(admin): hidden-slug config, order types, seed orders"
```

---

### Task 2: Admin store — pure actions + provider with localStorage sync

**Files:**
- Create: `lib/admin/store.tsx`
- Test: `__tests__/adminStore.test.ts`

**Interfaces:**
- Consumes: `Product`, `ProductStatus` from `types/product.ts`; `CYBER_LOVE_PRODUCTS` from `lib/products.ts`; `AdminOrder`, `OrderStatus` from `lib/admin/types.ts`; `MOCK_ORDERS` from `lib/admin/mockOrders.ts`.
- Produces (Tasks 4–6 rely on these exact names):
  - `AdminState { products: Product[]; orders: AdminOrder[] }`
  - Pure functions: `addProduct(s: AdminState, p: Product): AdminState`, `updateProduct(s, p: Product): AdminState`, `deleteProduct(s, id: string): AdminState`, `toggleProductStatus(s, id: string): AdminState` (available ↔ pre-order; sold-out → available), `setOrderStatus(s, orderId: string, status: OrderStatus): AdminState`, `parseStoredState(raw: string | null): AdminState | null`, `seedState(): AdminState`, `NEW_PRODUCT_DEFAULTS` (shared fabric/care/fit fields for drawer-created products).
  - React API: `AdminProvider({ children })`, `useAdmin(): { state: AdminState; add(p: Product): void; update(p: Product): void; remove(id: string): void; toggleStatus(id: string): void; setOrder(orderId: string, status: OrderStatus): void }`.
  - localStorage key `scripts-admin-v1`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/adminStore.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  addProduct, deleteProduct, parseStoredState, seedState,
  setOrderStatus, toggleProductStatus, updateProduct,
} from '@/lib/admin/store'
import type { Product } from '@/types/product'

const sample = (over: Partial<Product> = {}): Product => ({
  id: 'p1', name: '"TEST" — White', emotion: 'TEST', colorway: 'White',
  price: 44, collection: '1-800-Cyber-Love', status: 'available',
  image: null, backImage: null, slug: 'test-white', description: 'test',
  shipDate: 'July 2026', sizes: ['S', 'M'], careInstructions: [], fit: '',
  fabric: '', fabricWeight: '', modelNote: '', ...over,
})

describe('admin store actions', () => {
  it('seedState loads real catalog products and mock orders', () => {
    const s = seedState()
    expect(s.products.length).toBeGreaterThan(0)
    expect(s.orders.length).toBeGreaterThanOrEqual(8)
  })

  it('addProduct prepends; updateProduct replaces by id; deleteProduct removes', () => {
    let s = { products: [sample()], orders: [] }
    s = addProduct(s, sample({ id: 'p2', name: 'second' }))
    expect(s.products[0].id).toBe('p2')
    s = updateProduct(s, sample({ id: 'p1', price: 60 }))
    expect(s.products.find((p) => p.id === 'p1')?.price).toBe(60)
    s = deleteProduct(s, 'p2')
    expect(s.products.map((p) => p.id)).toEqual(['p1'])
  })

  it('toggleProductStatus flips available↔pre-order and rescues sold-out to available', () => {
    let s = { products: [sample({ status: 'available' })], orders: [] }
    s = toggleProductStatus(s, 'p1')
    expect(s.products[0].status).toBe('pre-order')
    s = toggleProductStatus(s, 'p1')
    expect(s.products[0].status).toBe('available')
    s = { products: [sample({ status: 'sold-out' })], orders: [] }
    s = toggleProductStatus(s, 'p1')
    expect(s.products[0].status).toBe('available')
  })

  it('setOrderStatus updates only the target order', () => {
    const base = seedState()
    const target = base.orders[0].id
    const next = setOrderStatus(base, target, 'delivered')
    expect(next.orders.find((o) => o.id === target)?.status).toBe('delivered')
    expect(next.orders.filter((o) => o.status === base.orders[1].status).length).toBeGreaterThan(0)
  })

  it('parseStoredState returns null on corrupt/absent payloads', () => {
    expect(parseStoredState(null)).toBeNull()
    expect(parseStoredState('not json')).toBeNull()
    expect(parseStoredState('{"products": "nope"}')).toBeNull()
    const good = JSON.stringify(seedState())
    expect(parseStoredState(good)?.orders.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run __tests__/adminStore.test.ts`
Expected: FAIL (module doesn't exist).

- [ ] **Step 3: Implement `lib/admin/store.tsx`**

```tsx
'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { CYBER_LOVE_PRODUCTS } from '@/lib/products'
import type { Product } from '@/types/product'
import { MOCK_ORDERS } from './mockOrders'
import type { AdminOrder, OrderStatus } from './types'

export interface AdminState {
  products: Product[]
  orders: AdminOrder[]
}

const STORAGE_KEY = 'scripts-admin-v1'

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

export function setOrderStatus(s: AdminState, orderId: string, status: OrderStatus): AdminState {
  return { ...s, orders: s.orders.map((o) => (o.id === orderId ? { ...o, status } : o)) }
}

/** Rehydrate from localStorage; any malformed payload falls back to null (caller seeds). */
export function parseStoredState(raw: string | null): AdminState | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as AdminState
    if (!Array.isArray(parsed.products) || !Array.isArray(parsed.orders)) return null
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

  // Rehydrate after mount (localStorage is client-only; seeds render on the server pass).
  useEffect(() => {
    const stored = parseStoredState(localStorage.getItem(STORAGE_KEY))
    if (stored) setState(stored)
  }, [])

  // Persist on every change. Object-URL images won't survive reload — pages render a placeholder then.
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* storage full/blocked: demo continues in memory */ }
  }, [state])

  const add = useCallback((p: Product) => setState((s) => addProduct(s, p)), [])
  const update = useCallback((p: Product) => setState((s) => updateProduct(s, p)), [])
  const remove = useCallback((id: string) => setState((s) => deleteProduct(s, id)), [])
  const toggleStatus = useCallback((id: string) => setState((s) => toggleProductStatus(s, id)), [])
  const setOrder = useCallback((orderId: string, status: OrderStatus) => setState((s) => setOrderStatus(s, orderId, status)), [])

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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/adminStore.test.ts`
Expected: PASS (5 tests). Also `npx tsc --noEmit` clean.

- [ ] **Step 5: Commit**

```bash
git add lib/admin/store.tsx __tests__/adminStore.test.ts
git commit -m "feat(admin): mock store — pure actions, provider, localStorage sync"
```

---

### Task 3: UI primitives — Sidebar, StatCard, StatusBadge (+ lucide-react)

**Files:**
- Modify: `package.json` (via `npm install lucide-react`)
- Create: `components/admin/Sidebar.tsx`
- Create: `components/admin/StatCard.tsx`
- Create: `components/admin/StatusBadge.tsx`

**Interfaces:**
- Consumes: `adminPath` from `lib/admin/config.ts`; `OrderStatus` from `lib/admin/types.ts`.
- Produces: `Sidebar()` (no props, reads pathname itself); `StatCard({ label, value, icon })` where `icon: ReactNode`; `StatusBadge({ status: OrderStatus })`. Tasks 4–6 import these.

- [ ] **Step 1: Install lucide-react**

Run: `npm install lucide-react`
Expected: added to dependencies; `npx tsc --noEmit` still clean.

- [ ] **Step 2: Create `components/admin/StatusBadge.tsx`**

```tsx
import type { OrderStatus } from '@/lib/admin/types'

/** Muted, on-brand status pill: tone at 15% background, full tone text. */
const TONES: Record<OrderStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: 'rgba(217,164,65,0.15)', text: '#D9A441', label: 'Pending' },
  shipped: { bg: 'rgba(91,141,201,0.15)', text: '#5B8DC9', label: 'Shipped' },
  delivered: { bg: 'rgba(95,163,107,0.15)', text: '#5FA36B', label: 'Delivered' },
}

export default function StatusBadge({ status }: { status: OrderStatus }) {
  const t = TONES[status]
  return (
    <span
      className="inline-flex items-center rounded-full px-[10px] py-[3px] text-[11px] font-semibold tracking-[0.08em] uppercase"
      style={{ background: t.bg, color: t.text }}
    >
      {t.label}
    </span>
  )
}
```

- [ ] **Step 3: Create `components/admin/StatCard.tsx`**

```tsx
import type { ReactNode } from 'react'

export default function StatCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-xl border border-grey/25 bg-[#141414] p-5 flex items-start justify-between">
      <div>
        <p className="text-[11px] uppercase tracking-[0.14em] text-grey">{label}</p>
        <p className="mt-2 text-[40px] leading-none uppercase tracking-[0.04em]" style={{ fontFamily: 'var(--font-bebas)' }}>
          {value}
        </p>
      </div>
      <span className="text-pink mt-1">{icon}</span>
    </div>
  )
}
```

- [ ] **Step 4: Create `components/admin/Sidebar.tsx`**

```tsx
'use client'

import { ArrowLeft, LayoutDashboard, Package, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { adminPath } from '@/lib/admin/config'

const NAV = [
  { href: adminPath(), label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: adminPath('products'), label: 'Products', icon: Package, exact: false },
  { href: adminPath('orders'), label: 'Orders', icon: ShoppingBag, exact: false },
]

export default function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="w-14 md:w-56 shrink-0 border-r border-grey/25 bg-[#101010] flex flex-col">
      <div className="px-3 md:px-5 py-5 border-b border-grey/25">
        <span className="hidden md:block text-[24px] leading-none uppercase tracking-[0.06em] text-pink" style={{ fontFamily: 'var(--font-bebas)' }}>
          SCR!PTS
        </span>
        <span className="md:hidden block text-pink text-[18px] font-bold text-center" style={{ fontFamily: 'var(--font-bebas)' }}>S!</span>
        <span className="hidden md:block text-[10px] uppercase tracking-[0.2em] text-grey mt-1">Back office</span>
      </div>
      <nav className="flex-1 py-3">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 md:px-5 py-2.5 text-[13px] transition-colors ${
                active ? 'text-pink bg-pink/10 border-r-2 border-pink' : 'text-paper/70 hover:text-paper'
              }`}
            >
              <Icon size={17} />
              <span className="hidden md:inline">{label}</span>
            </Link>
          )
        })}
      </nav>
      <Link href="/" className="flex items-center gap-3 px-4 md:px-5 py-4 text-[12px] text-grey hover:text-paper border-t border-grey/25">
        <ArrowLeft size={15} />
        <span className="hidden md:inline">Back to store</span>
      </Link>
    </aside>
  )
}
```

- [ ] **Step 5: Verify compile and commit**

Run: `npx tsc --noEmit`
Expected: clean.

```bash
git add package.json package-lock.json components/admin/
git commit -m "feat(admin): sidebar, stat card, status badge primitives"
```

---

### Task 4: Admin layout + Overview page

**Files:**
- Create: `app/office-scr1pts-x7k2/layout.tsx`
- Create: `app/office-scr1pts-x7k2/page.tsx`

**Interfaces:**
- Consumes: `AdminProvider`, `useAdmin` from `lib/admin/store.tsx`; `Sidebar`, `StatCard`, `StatusBadge` from Task 3; `adminPath` from config.
- Produces: the layout shell all admin pages render inside.

- [ ] **Step 1: Create `app/office-scr1pts-x7k2/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Sidebar from '@/components/admin/Sidebar'
import { AdminProvider } from '@/lib/admin/store'

// Hidden back office: never indexed, never linked from the storefront.
export const metadata: Metadata = {
  title: 'SCR!PTS — Back Office',
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminProvider>
      <div className="min-h-dvh flex bg-ink text-paper">
        <Sidebar />
        <main className="flex-1 min-w-0 px-4 md:px-8 py-6 md:py-8">{children}</main>
      </div>
    </AdminProvider>
  )
}
```

- [ ] **Step 2: Create `app/office-scr1pts-x7k2/page.tsx` (Overview)**

```tsx
'use client'

import { DollarSign, Package, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import { adminPath } from '@/lib/admin/config'
import { useAdmin } from '@/lib/admin/store'
import StatCard from '@/components/admin/StatCard'
import StatusBadge from '@/components/admin/StatusBadge'

export default function OverviewPage() {
  const { state } = useAdmin()
  const revenue = state.orders.reduce((sum, o) => sum + o.total, 0)
  const active = state.products.filter((p) => p.status === 'available').length
  const recent = [...state.orders].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)

  return (
    <div>
      <h1 className="text-[40px] leading-none uppercase tracking-[0.04em]" style={{ fontFamily: 'var(--font-bebas)' }}>
        Overview
      </h1>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Revenue" value={`$${revenue.toLocaleString()}`} icon={<DollarSign size={20} />} />
        <StatCard label="Total Orders" value={String(state.orders.length)} icon={<ShoppingBag size={20} />} />
        <StatCard label="Active Products" value={String(active)} icon={<Package size={20} />} />
      </div>

      <div className="mt-8 rounded-xl border border-grey/25 bg-[#141414]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-grey/25">
          <h2 className="text-[20px] uppercase tracking-[0.04em]" style={{ fontFamily: 'var(--font-bebas)' }}>Recent Orders</h2>
          <Link href={adminPath('orders')} className="text-[12px] text-pink hover:underline">View all</Link>
        </div>
        <ul>
          {recent.map((o) => (
            <li key={o.id} className="flex items-center justify-between px-5 py-3.5 border-b border-grey/15 last:border-b-0 text-[13px]">
              <div className="min-w-0">
                <span className="text-paper/90 font-medium">{o.id}</span>
                <span className="text-grey ml-3">{o.customer}</span>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className="text-paper/80">${o.total}</span>
                <StatusBadge status={o.status} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify it renders**

Run: `npx tsc --noEmit` (clean), then `npm run dev` and open `http://localhost:3000/office-scr1pts-x7k2`.
Expected: sidebar + three stat cards (revenue $704 from seeds) + five recent orders with badges. `http://localhost:3000/admin` 404s.

- [ ] **Step 4: Commit**

```bash
git add app/office-scr1pts-x7k2/
git commit -m "feat(admin): hidden layout with provider, overview page"
```

---

### Task 5: Products page — table, drawer form, image dropzone

**Files:**
- Create: `components/admin/ImageDrop.tsx`
- Create: `components/admin/ProductDrawer.tsx`
- Create: `app/office-scr1pts-x7k2/products/page.tsx`

**Interfaces:**
- Consumes: `useAdmin`, `NEW_PRODUCT_DEFAULTS` from store; `Product`, `ProductStatus` from `types/product.ts`.
- Produces: `ImageDrop({ label, value, onChange })` (`value: string | null`, `onChange(url: string | null)`); `ProductDrawer({ product, onClose })` (`product: Product | null` — null = create mode).

- [ ] **Step 1: Create `components/admin/ImageDrop.tsx`**

```tsx
'use client'

import { ImagePlus, X } from 'lucide-react'
import { useRef, useState } from 'react'

/**
 * Click-or-drop image input. Stores an object URL — session-only by design;
 * after a reload the table falls back to a placeholder tile.
 */
export default function ImageDrop({ label, value, onChange }: {
  label: string
  value: string | null
  onChange: (url: string | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  const take = (file: File | undefined) => {
    if (file && file.type.startsWith('image/')) onChange(URL.createObjectURL(file))
  }

  return (
    <div>
      <span className="block text-[11px] uppercase tracking-[0.14em] text-grey mb-1.5">{label}</span>
      {value ? (
        <div className="relative w-full h-32 rounded-lg overflow-hidden border border-grey/25 bg-[#101010]">
          {/* eslint-disable-next-line @next/next/no-img-element -- object URLs need a plain img */}
          <img src={value} alt={label} className="w-full h-full object-contain" />
          <button
            type="button"
            aria-label={`Remove ${label}`}
            onClick={() => onChange(null)}
            className="absolute top-1.5 right-1.5 rounded-full bg-ink/80 p-1 text-paper/80 hover:text-paper"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setOver(true) }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files[0]) }}
          className={`w-full h-32 rounded-lg border border-dashed flex flex-col items-center justify-center gap-2 text-[12px] transition-colors ${
            over ? 'border-pink text-pink bg-pink/5' : 'border-grey/40 text-grey hover:border-grey/70'
          }`}
        >
          <ImagePlus size={20} />
          Drop image or click to browse
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => take(e.target.files?.[0])}
      />
    </div>
  )
}
```

- [ ] **Step 2: Create `components/admin/ProductDrawer.tsx`**

```tsx
'use client'

import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NEW_PRODUCT_DEFAULTS, useAdmin } from '@/lib/admin/store'
import type { Product, ProductStatus } from '@/types/product'
import ImageDrop from './ImageDrop'

const ALL_SIZES = ['S', 'M', 'L', 'XL']

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'product'
}

const inputCls =
  'w-full rounded-lg border border-grey/30 bg-[#101010] px-3 py-2 text-[13px] text-paper placeholder:text-grey/60 focus:outline-none focus:border-pink'
const labelCls = 'block text-[11px] uppercase tracking-[0.14em] text-grey mb-1.5'

/** Slide-over Add/Edit form. product === null → create mode. */
export default function ProductDrawer({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const { state, add, update } = useAdmin()
  const collections = [...new Set(state.products.map((p) => p.collection))]

  const [name, setName] = useState(product?.name ?? '')
  const [emotion, setEmotion] = useState(product?.emotion ?? '')
  const [colorway, setColorway] = useState(product?.colorway ?? '')
  const [price, setPrice] = useState(product ? String(product.price) : '')
  const [collection, setCollection] = useState(product?.collection ?? collections[0] ?? '')
  const [newCollection, setNewCollection] = useState('')
  const [status, setStatus] = useState<ProductStatus>(product?.status ?? 'available')
  const [shipDate, setShipDate] = useState(product?.shipDate ?? '')
  const [sizes, setSizes] = useState<string[]>(product?.sizes ?? ['S', 'M', 'L', 'XL'])
  const [description, setDescription] = useState(product?.description ?? '')
  const [image, setImage] = useState<string | null>(product?.image ?? null)
  const [backImage, setBackImage] = useState<string | null>(product?.backImage ?? null)
  const [errors, setErrors] = useState<{ name?: string; price?: string }>({})

  // Escape closes the drawer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const toggleSize = (s: string) =>
    setSizes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const priceNum = Number(price)
    const errs: typeof errors = {}
    if (!name.trim()) errs.name = 'Name is required'
    if (!price.trim() || Number.isNaN(priceNum) || priceNum <= 0) errs.price = 'Enter a price above 0'
    setErrors(errs)
    if (Object.keys(errs).length) return

    const chosenCollection = collection === '__new__' ? newCollection.trim() || 'Uncategorized' : collection
    const built: Product = {
      ...NEW_PRODUCT_DEFAULTS,
      careInstructions: [...NEW_PRODUCT_DEFAULTS.careInstructions],
      ...(product ?? {}),
      id: product?.id ?? crypto.randomUUID(),
      slug: product?.slug ?? slugify(name),
      name: name.trim(),
      emotion: emotion.trim().toUpperCase(),
      colorway: colorway.trim(),
      price: priceNum,
      collection: chosenCollection,
      status,
      shipDate: shipDate.trim(),
      sizes,
      description: description.trim(),
      image,
      backImage,
    }
    if (product) update(built)
    else add(built)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-[#141414] border-l border-grey/25 overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-grey/25 sticky top-0 bg-[#141414]">
          <h2 className="text-[22px] uppercase tracking-[0.04em]" style={{ fontFamily: 'var(--font-bebas)' }}>
            {product ? 'Edit Product' : 'Add Product'}
          </h2>
          <button type="button" aria-label="Close" onClick={onClose} className="text-grey hover:text-paper"><X size={18} /></button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className={labelCls} htmlFor="p-name">Product Name</label>
            <input id="p-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder='"ANXIETY" — White' />
            {errors.name && <p className="mt-1 text-[11px] text-pink-deep">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="p-emotion">Emotion</label>
              <input id="p-emotion" className={inputCls} value={emotion} onChange={(e) => setEmotion(e.target.value)} placeholder="ANXIETY" />
            </div>
            <div>
              <label className={labelCls} htmlFor="p-colorway">Colorway</label>
              <input id="p-colorway" className={inputCls} value={colorway} onChange={(e) => setColorway(e.target.value)} placeholder="White" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="p-price">Price (USD)</label>
              <input id="p-price" className={inputCls} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="44" />
              {errors.price && <p className="mt-1 text-[11px] text-pink-deep">{errors.price}</p>}
            </div>
            <div>
              <label className={labelCls} htmlFor="p-status">Status</label>
              <select id="p-status" className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as ProductStatus)}>
                <option value="available">Available</option>
                <option value="pre-order">Pre-order</option>
                <option value="sold-out">Sold out</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="p-collection">Collection</label>
            <select id="p-collection" className={inputCls} value={collection} onChange={(e) => setCollection(e.target.value)}>
              {collections.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="__new__">New collection…</option>
            </select>
            {collection === '__new__' && (
              <input
                className={`${inputCls} mt-2`} value={newCollection}
                onChange={(e) => setNewCollection(e.target.value)} placeholder="New collection name"
              />
            )}
          </div>
          <div>
            <label className={labelCls} htmlFor="p-ship">Ship Date</label>
            <input id="p-ship" className={inputCls} value={shipDate} onChange={(e) => setShipDate(e.target.value)} placeholder="July 2026" />
          </div>
          <div>
            <span className={labelCls}>Sizes</span>
            <div className="flex gap-2">
              {ALL_SIZES.map((s) => (
                <button
                  key={s} type="button" onClick={() => toggleSize(s)}
                  className={`px-3 py-1.5 rounded-lg border text-[12px] font-semibold transition-colors ${
                    sizes.includes(s) ? 'border-pink text-pink bg-pink/10' : 'border-grey/30 text-grey hover:text-paper'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="p-desc">Description</label>
            <textarea id="p-desc" rows={4} className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ImageDrop label="Front Image" value={image} onChange={setImage} />
            <ImageDrop label="Back Image" value={backImage} onChange={setBackImage} />
          </div>
          <div className="pt-2 flex gap-3">
            <button type="submit" className="flex-1 rounded-lg bg-pink text-ink font-bold text-[13px] py-2.5 hover:bg-pink-deep transition-colors">
              {product ? 'Save Changes' : 'Add Product'}
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-grey/30 px-4 text-[13px] text-grey hover:text-paper">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `app/office-scr1pts-x7k2/products/page.tsx`**

```tsx
'use client'

import { ImageOff, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import ProductDrawer from '@/components/admin/ProductDrawer'
import { useAdmin } from '@/lib/admin/store'
import type { Product } from '@/types/product'

export default function ProductsPage() {
  const { state, remove, toggleStatus } = useAdmin()
  const [drawer, setDrawer] = useState<{ open: boolean; product: Product | null }>({ open: false, product: null })
  const [confirmId, setConfirmId] = useState<string | null>(null)

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-[40px] leading-none uppercase tracking-[0.04em]" style={{ fontFamily: 'var(--font-bebas)' }}>
          Products
        </h1>
        <button
          type="button"
          onClick={() => setDrawer({ open: true, product: null })}
          className="flex items-center gap-2 rounded-lg bg-pink text-ink font-bold text-[13px] px-4 py-2.5 hover:bg-pink-deep transition-colors"
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      <div className="mt-6 rounded-xl border border-grey/25 bg-[#141414] overflow-x-auto">
        <table className="w-full text-left text-[13px] min-w-[640px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.14em] text-grey border-b border-grey/25">
              <th className="px-5 py-3 font-medium">Product</th>
              <th className="px-5 py-3 font-medium">Price</th>
              <th className="px-5 py-3 font-medium">Collection</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {state.products.map((p) => (
              <tr key={p.id} className="border-b border-grey/15 last:border-b-0">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-11 h-11 rounded-lg bg-[#101010] border border-grey/20 flex items-center justify-center overflow-hidden shrink-0">
                      {p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element -- object URLs need a plain img
                        <img src={p.image} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <ImageOff size={16} className="text-grey" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-paper/90 font-medium truncate">{p.name}</p>
                      <p className="text-grey text-[11px]">{p.emotion} · {p.colorway}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 text-paper/80">${p.price}</td>
                <td className="px-5 py-3 text-grey">{p.collection}</td>
                <td className="px-5 py-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={p.status === 'available'}
                    aria-label={`Status: ${p.status}. Toggle availability.`}
                    onClick={() => toggleStatus(p.id)}
                    className="flex items-center gap-2"
                  >
                    <span className={`w-9 h-5 rounded-full p-0.5 transition-colors ${p.status === 'available' ? 'bg-pink' : 'bg-grey/40'}`}>
                      <span className={`block w-4 h-4 rounded-full bg-ink transition-transform ${p.status === 'available' ? 'translate-x-4' : ''}`} />
                    </span>
                    <span className="text-[11px] uppercase tracking-[0.08em] text-grey">{p.status}</span>
                  </button>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {confirmId === p.id ? (
                      <>
                        <button type="button" onClick={() => { remove(p.id); setConfirmId(null) }} className="text-[11px] font-bold text-pink-deep px-2 py-1">
                          Confirm
                        </button>
                        <button type="button" onClick={() => setConfirmId(null)} className="text-[11px] text-grey px-2 py-1">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button type="button" aria-label={`Edit ${p.name}`} onClick={() => setDrawer({ open: true, product: p })} className="p-2 text-grey hover:text-paper">
                          <Pencil size={15} />
                        </button>
                        <button type="button" aria-label={`Delete ${p.name}`} onClick={() => setConfirmId(p.id)} className="p-2 text-grey hover:text-pink-deep">
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {drawer.open && (
        <ProductDrawer key={drawer.product?.id ?? 'new'} product={drawer.product} onClose={() => setDrawer({ open: false, product: null })} />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Verify in the browser**

Run: `npx tsc --noEmit` (clean); `npm run dev`, open `/office-scr1pts-x7k2/products`.
Expected: seeded catalog rows with thumbnails; Add Product opens drawer; submitting with empty name/price shows inline errors; a valid submit adds the row instantly and bumps Overview's Active Products; edit pre-fills; delete asks Confirm inline; status toggle flips available/pre-order live; image drop previews.

- [ ] **Step 5: Commit**

```bash
git add components/admin/ImageDrop.tsx components/admin/ProductDrawer.tsx app/office-scr1pts-x7k2/products/
git commit -m "feat(admin): product management — table, slide-over form, image dropzones"
```

---

### Task 6: Orders page

**Files:**
- Create: `app/office-scr1pts-x7k2/orders/page.tsx`

**Interfaces:**
- Consumes: `useAdmin` from store; `StatusBadge`; `OrderStatus` from `lib/admin/types.ts`.

- [ ] **Step 1: Create `app/office-scr1pts-x7k2/orders/page.tsx`**

```tsx
'use client'

import StatusBadge from '@/components/admin/StatusBadge'
import { useAdmin } from '@/lib/admin/store'
import type { OrderStatus } from '@/lib/admin/types'

const STATUSES: OrderStatus[] = ['pending', 'shipped', 'delivered']

export default function OrdersPage() {
  const { state, setOrder } = useAdmin()
  const orders = [...state.orders].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div>
      <h1 className="text-[40px] leading-none uppercase tracking-[0.04em]" style={{ fontFamily: 'var(--font-bebas)' }}>
        Orders
      </h1>

      <div className="mt-6 rounded-xl border border-grey/25 bg-[#141414] overflow-x-auto">
        <table className="w-full text-left text-[13px] min-w-[720px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.14em] text-grey border-b border-grey/25">
              <th className="px-5 py-3 font-medium">Order</th>
              <th className="px-5 py-3 font-medium">Customer</th>
              <th className="px-5 py-3 font-medium">Items</th>
              <th className="px-5 py-3 font-medium">Total</th>
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-grey/15 last:border-b-0">
                <td className="px-5 py-3 text-paper/90 font-medium">{o.id}</td>
                <td className="px-5 py-3 text-paper/80">{o.customer}</td>
                <td className="px-5 py-3 text-grey max-w-[240px] truncate" title={o.items}>{o.items}</td>
                <td className="px-5 py-3 text-paper/80">${o.total}</td>
                <td className="px-5 py-3 text-grey">{o.date}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={o.status} />
                    <select
                      aria-label={`Change status for ${o.id}`}
                      value={o.status}
                      onChange={(e) => setOrder(o.id, e.target.value as OrderStatus)}
                      className="rounded-lg border border-grey/30 bg-[#101010] px-2 py-1.5 text-[12px] text-paper focus:outline-none focus:border-pink"
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify in the browser**

Run: `npx tsc --noEmit` (clean); open `/office-scr1pts-x7k2/orders`.
Expected: 10 seeded orders newest-first; changing a row's select updates its badge instantly AND the Overview page's Recent Orders + revenue stay consistent; state survives refresh (localStorage).

- [ ] **Step 3: Commit**

```bash
git add app/office-scr1pts-x7k2/orders/
git commit -m "feat(admin): order management with live status changes"
```

---

### Task 7: Final sweep — tests, build, docs

**Files:**
- Modify: `PRD.md` (Change Log)

- [ ] **Step 1: Full verification**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: all tests pass (including the two new admin test files), build succeeds, and the build output lists `/office-scr1pts-x7k2` routes but NO `/admin` route.

- [ ] **Step 2: Manual demo pass**

With `npm run dev`: add a product with images → appears in table + Overview count; edit its price; delete it (inline confirm); toggle a status; change two order statuses and confirm Overview reflects them; refresh → non-image state persists, missing images show the placeholder tile; narrow the window → sidebar collapses to icon rail, tables scroll horizontally.

- [ ] **Step 3: Update PRD Change Log and commit**

Append a new dated entry to `PRD.md`'s Change Log (do not rewrite existing entries): `- **2026-07-30** — **Admin dashboard prototype shipped.** Hidden back office at a secret slug (no auth yet — auth arrives with Supabase): Overview stats, product management with real-model add/edit drawer and image dropzones, order management with live status changes; all mock state in a localStorage-persisted provider, ready to swap internals for Supabase.`

```bash
git add PRD.md
git commit -m "chore(admin): PRD change log for admin dashboard prototype"
```
