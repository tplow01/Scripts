# Admin Responsive & Drill-Down UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the admin's responsive defects and rebuild the drill-down header/stat presentation, per `docs/superpowers/specs/2026-07-31-admin-responsive-ux-design.md`.

**Architecture:** Three shared primitives first (`useIsPhone`, `itemCountLabel`, `DeltaChip`), then navigation (sidebar breakpoints + a phone bottom bar), then `MetricShell`'s sticky header and headline card, then one responsive `OrdersList` replacing `OrdersTable` (CSS-only dual rendering: cards below `sm`, table at `sm`+), then the remaining pages. Layout switching is done with Tailwind `sm:`/`lg:` classes wherever possible; the one JS media query exists only because chart height is a numeric prop.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind brand tokens, Bebas via `style={{ fontFamily: 'var(--font-bebas)' }}`, lucide-react (installed), Vitest. No new dependencies.

## Global Constraints

- Exactly three breakpoints, used consistently: **phone** `< 640px` (below Tailwind `sm`), **tablet** `640–1023px` (`sm`–`lg`), **desktop** `≥ 1024px` (`lg`+). Never use `md:` in admin files.
- Prefer CSS (`sm:hidden` / `hidden sm:block`) for layout switching. The only JS media query is `useIsPhone()`, used solely for numeric chart height, and it must return `false` on the server and first client render (no hydration mismatch, no `window` read during render).
- Delta rendering lives in ONE place (`DeltaChip`); `StatCard` and `MetricShell` both use it. Colours unchanged: up `#5FA36B`, down `#E05252`, flat `#6F6F73`, chip background = that colour at 15%.
- Tables must never bleed past their card: card gets `!p-0 overflow-hidden`, header row gets its own `px-5 py-4`, table sits in an inner `overflow-x-auto`.
- No mid-token wrapping: names truncate with ellipsis; ID/date/total cells never wrap.
- Every list keeps its empty state in BOTH renderings ("No orders in this range", "No products yet — add your first drop").
- Tailwind arbitrary values containing `calc()` use underscores for spaces, e.g. `pb-[calc(4rem_+_env(safe-area-inset-bottom))]`.
- Do not touch anything outside: `lib/admin/*`, `components/admin/*`, `app/office-scr1pts-x7k2/*`, `__tests__/admin*`, `PRD.md`.

---

### Task 1: Shared primitives — useIsPhone, itemCountLabel, DeltaChip

**Files:**
- Create: `lib/admin/useIsPhone.ts`
- Modify: `lib/admin/stats.ts` (append one helper)
- Create: `components/admin/DeltaChip.tsx`
- Modify: `components/admin/StatCard.tsx` (use DeltaChip)
- Modify: `__tests__/adminStats.test.ts` (append one describe block)

**Interfaces:**
- Consumes: `AdminOrder` from `lib/admin/types.ts`.
- Produces (Tasks 3–5 rely on these exact names): `useIsPhone(): boolean`; `itemCountLabel(order: AdminOrder): string`; `DeltaChip({ delta, className? })` where `delta: { pct: number; dir: 'up' | 'down' | 'flat' }`.

- [ ] **Step 1: Append the failing test to `__tests__/adminStats.test.ts`**

Add `itemCountLabel` to the existing import list from `@/lib/admin/stats`, then append this describe block at the end of the file:

```ts
describe('itemCountLabel', () => {
  const order = (qtys: number[]) => ({
    ...orders[0],
    lineItems: qtys.map((qty, i) => ({ productName: `p${i}`, size: 'M', qty, unitPrice: 44 })),
  })

  it('singularises exactly one item', () => {
    expect(itemCountLabel(order([1]))).toBe('1 item')
  })
  it('pluralises multiple units on one line', () => {
    expect(itemCountLabel(order([3]))).toBe('3 items')
  })
  it('sums quantities across line items', () => {
    expect(itemCountLabel(order([1, 2]))).toBe('3 items')
  })
  it('handles an order with no line items', () => {
    expect(itemCountLabel(order([]))).toBe('0 items')
  })
})
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run __tests__/adminStats.test.ts`
Expected: FAIL — `itemCountLabel` is not exported.

- [ ] **Step 3: Append the helper to `lib/admin/stats.ts`**

```ts
/** "1 item" / "3 items" — total units across an order's line items. */
export function itemCountLabel(order: AdminOrder): string {
  const n = order.lineItems.reduce((s, li) => s + li.qty, 0)
  return `${n} item${n === 1 ? '' : 's'}`
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run __tests__/adminStats.test.ts`
Expected: PASS.

- [ ] **Step 5: Create `lib/admin/useIsPhone.ts`**

```ts
'use client'

import { useEffect, useState } from 'react'

/**
 * True below the `sm` breakpoint (640px). Returns false on the server and on the
 * first client render, then updates after mount — so it never causes a hydration
 * mismatch. Use ONLY where a numeric value is needed (chart height); prefer
 * Tailwind `sm:` classes for anything expressible in CSS.
 */
export function useIsPhone(): boolean {
  const [isPhone, setIsPhone] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const update = () => setIsPhone(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return isPhone
}
```

- [ ] **Step 6: Create `components/admin/DeltaChip.tsx`**

```tsx
const DELTA_STYLE = {
  up: { color: '#5FA36B', bg: 'rgba(95,163,107,0.15)', mark: '▲' },
  down: { color: '#E05252', bg: 'rgba(224,82,82,0.15)', mark: '▼' },
  flat: { color: '#6F6F73', bg: 'rgba(111,111,115,0.18)', mark: '—' },
} as const

/** The ONE delta rendering — used by StatCard and the drill-down headline. */
export default function DeltaChip({ delta, className = '' }: {
  delta: { pct: number; dir: 'up' | 'down' | 'flat' }
  className?: string
}) {
  const s = DELTA_STYLE[delta.dir]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${className}`}
      style={{ background: s.bg, color: s.color }}
    >
      {s.mark} {delta.dir === 'flat' ? 'flat' : `${delta.pct}% vs prev period`}
    </span>
  )
}
```

- [ ] **Step 7: Rewrite `components/admin/StatCard.tsx` to use it**

```tsx
import Link from 'next/link'
import type { ReactNode } from 'react'
import Card from './Card'
import DeltaChip from './DeltaChip'

export default function StatCard({ label, value, icon, delta, href }: {
  label: string
  value: string
  icon: ReactNode
  delta?: { pct: number; dir: 'up' | 'down' | 'flat' }
  href?: string
}) {
  const body = (
    <Card className={href ? 'group h-full transition-all hover:border-pink/50' : 'h-full'}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.14em] text-grey">{label}</p>
          <p className="mt-2 text-[32px] sm:text-[36px] leading-none uppercase tracking-[0.04em] tabular-nums" style={{ fontFamily: 'var(--font-bebas)' }}>
            {value}
          </p>
          {delta && <DeltaChip delta={delta} className="mt-2.5" />}
        </div>
        <span className="text-pink mt-1 flex flex-col items-end gap-2 shrink-0">
          {icon}
          {href && <span className="text-[10px] text-grey opacity-0 group-hover:opacity-100 transition-opacity">view →</span>}
        </span>
      </div>
    </Card>
  )
  return href ? <Link href={href} className="block">{body}</Link> : body
}
```

- [ ] **Step 8: Verify and commit**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean / green.

```bash
git add lib/admin/useIsPhone.ts lib/admin/stats.ts components/admin/DeltaChip.tsx components/admin/StatCard.tsx __tests__/adminStats.test.ts
git commit -m "feat(admin): responsive primitives — useIsPhone, itemCountLabel, DeltaChip"
```

---

### Task 2: Navigation — sidebar breakpoints and phone bottom bar

**Files:**
- Modify: `components/admin/Sidebar.tsx` (full replacement)
- Create: `components/admin/BottomNav.tsx`
- Modify: `app/office-scr1pts-x7k2/layout.tsx` (full replacement)

**Interfaces:**
- Consumes: `adminPath` from `lib/admin/config.ts`.
- Produces: `BottomNav()` — fixed phone-only nav; `Sidebar()` — unchanged props, new breakpoints.

- [ ] **Step 1: Replace `components/admin/Sidebar.tsx`**

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

/** Hidden on phone (BottomNav takes over), icon rail on tablet, labelled at lg+. */
export default function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="hidden sm:flex w-14 lg:w-56 shrink-0 border-r border-grey/25 bg-[#101010] flex-col">
      <div className="px-3 lg:px-5 py-5 border-b border-grey/25">
        <span className="hidden lg:block text-[24px] leading-none uppercase tracking-[0.06em] text-pink" style={{ fontFamily: 'var(--font-bebas)' }}>
          SCR!PTS
        </span>
        <span className="lg:hidden block text-pink text-[18px] font-bold text-center" style={{ fontFamily: 'var(--font-bebas)' }}>S!</span>
        <span className="hidden lg:block text-[10px] uppercase tracking-[0.2em] text-grey mt-1">Back office</span>
      </div>
      <nav className="flex-1 py-3">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={`flex items-center justify-center lg:justify-start gap-3 px-4 lg:px-5 py-2.5 text-[13px] transition-colors ${
                active ? 'text-pink bg-pink/10 border-r-2 border-pink' : 'text-paper/70 hover:text-paper'
              }`}
            >
              <Icon size={17} />
              <span className="hidden lg:inline">{label}</span>
            </Link>
          )
        })}
      </nav>
      <Link href="/" title="Back to store" className="flex items-center justify-center lg:justify-start gap-3 px-4 lg:px-5 py-4 text-[12px] text-grey hover:text-paper border-t border-grey/25">
        <ArrowLeft size={15} />
        <span className="hidden lg:inline">Back to store</span>
      </Link>
    </aside>
  )
}
```

- [ ] **Step 2: Create `components/admin/BottomNav.tsx`**

```tsx
'use client'

import { LayoutDashboard, Package, ShoppingBag, Store } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { adminPath } from '@/lib/admin/config'

const ITEMS = [
  { href: adminPath(), label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: adminPath('products'), label: 'Products', icon: Package, exact: false },
  { href: adminPath('orders'), label: 'Orders', icon: ShoppingBag, exact: false },
  { href: '/', label: 'Store', icon: Store, exact: false },
]

/** Phone-only nav. The sidebar is hidden below `sm`; this replaces it. */
export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Admin sections"
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 flex border-t border-grey/25 bg-[#101010]/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {ITEMS.map(({ href, label, icon: Icon, exact }) => {
        // The storefront link is never "active" inside the admin.
        const active = href === '/' ? false : exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] uppercase tracking-[0.08em] transition-colors ${
              active ? 'text-pink' : 'text-grey hover:text-paper'
            }`}
          >
            <Icon size={18} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 3: Replace `app/office-scr1pts-x7k2/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import BottomNav from '@/components/admin/BottomNav'
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
        {/* Bottom padding on phone clears the fixed BottomNav (nav height + safe area). */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 pb-[calc(4rem_+_env(safe-area-inset-bottom))] sm:pb-8">
          {children}
        </main>
        <BottomNav />
      </div>
    </AdminProvider>
  )
}
```

- [ ] **Step 4: Verify and commit**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean / green.

```bash
git add components/admin/Sidebar.tsx components/admin/BottomNav.tsx app/office-scr1pts-x7k2/layout.tsx
git commit -m "feat(admin): phone bottom nav, sidebar breakpoints at sm/lg"
```

---

### Task 3: MetricShell sticky header + headline card

**Files:**
- Modify: `components/admin/MetricShell.tsx` (full replacement)
- Modify: `components/admin/metrics/RevenueMetric.tsx`
- Modify: `components/admin/metrics/OrdersMetric.tsx`
- Modify: `components/admin/metrics/AovMetric.tsx`
- Modify: `components/admin/metrics/VisitorsMetric.tsx`

**Interfaces:**
- Consumes: `Card`, `DeltaChip`, `useIsPhone`, `adminPath`.
- Produces: `MetricShell({ title, headlineLabel, headline, delta?, range, onRange, chart, children })` — **`headlineLabel` is new and required**; the four metric pages must pass it in the same commit. `MetricRange` export unchanged.

- [ ] **Step 1: Replace `components/admin/MetricShell.tsx`**

```tsx
'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { adminPath } from '@/lib/admin/config'
import Card from './Card'
import DeltaChip from './DeltaChip'

export type MetricRange = 7 | 14 | 30
const RANGES: MetricRange[] = [7, 14, 30]

/**
 * Shared SaaS drill-down frame. The sticky bar IS the page title — back control,
 * metric name and range pills stay reachable however far the page is scrolled.
 * Negative margins let it bleed to the viewport edges inside the padded <main>.
 */
export default function MetricShell({ title, headlineLabel, headline, delta, range, onRange, chart, children }: {
  title: string
  headlineLabel: string
  headline: string
  delta?: { pct: number; dir: 'up' | 'down' | 'flat' }
  range: MetricRange
  onRange: (r: MetricRange) => void
  chart: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 lg:-mx-8 -mt-6 lg:-mt-8 px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3 border-b border-grey/25 bg-ink/95 backdrop-blur">
        <Link
          href={adminPath()}
          aria-label="Back to Overview"
          className="flex items-center gap-2 shrink-0 rounded-lg border border-grey/30 px-2.5 py-2 text-[12px] text-paper/80 hover:text-paper hover:border-grey/60 transition-colors"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Overview</span>
        </Link>

        <div className="min-w-0">
          <span className="sm:hidden block text-[9px] uppercase tracking-[0.16em] text-grey leading-none">Overview</span>
          <h1 className="text-[20px] sm:text-[24px] leading-none uppercase tracking-[0.04em] truncate" style={{ fontFamily: 'var(--font-bebas)' }}>
            {title}
          </h1>
        </div>

        <div className="ml-auto flex shrink-0 rounded-lg border border-grey/30 overflow-hidden" role="group" aria-label="Time range">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={range === r}
              onClick={() => onRange(r)}
              className={`px-3 sm:px-4 py-2 text-[11px] sm:text-[12px] font-semibold transition-colors ${
                range === r ? 'bg-pink text-ink' : 'text-grey hover:text-paper'
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      <Card className="mt-6 text-center sm:text-left">
        <p className="text-[11px] uppercase tracking-[0.14em] text-grey">{headlineLabel}</p>
        <p className="mt-2 text-[44px] sm:text-[56px] leading-none uppercase tracking-[0.04em] tabular-nums" style={{ fontFamily: 'var(--font-bebas)' }}>
          {headline}
        </p>
        {delta && <DeltaChip delta={delta} className="mt-3" />}
      </Card>

      {/* key={range} remounts the chart block so the 150ms fade-in plays on every range change */}
      <div key={range} className="mt-4 animate-[fadeIn_150ms_ease-out]" style={{ animationFillMode: 'backwards' }}>
        {chart}
      </div>
      <style jsx global>{`@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>

      <div className="mt-4 space-y-4">{children}</div>
    </div>
  )
}
```

- [ ] **Step 2: Update the four metric pages**

In EACH of `RevenueMetric.tsx`, `OrdersMetric.tsx`, `AovMetric.tsx`, `VisitorsMetric.tsx`:

1. Add the import `import { useIsPhone } from '@/lib/admin/useIsPhone'` and, inside the component body next to the existing `useState` calls, add:
   ```tsx
   const chartH = useIsPhone() ? 140 : 200
   ```
2. Replace every `height={200}` on a chart with `height={chartH}`.
3. Add a `headlineLabel` prop to the `<MetricShell …>` call, immediately after `title`:
   - RevenueMetric: `headlineLabel={`Total revenue · last ${range} days`}`
   - OrdersMetric: `headlineLabel={`Orders placed · last ${range} days`}`
   - AovMetric: `headlineLabel={`Average order value · last ${range} days`}`
   - VisitorsMetric: `headlineLabel={`Visitors · last ${range} days`}`
4. Change the breakdown grid classes from `md:grid-cols-2` to `sm:grid-cols-2` (Revenue, Orders, Aov) and from `md:grid-cols-3` to `sm:grid-cols-2 lg:grid-cols-3` (Visitors).

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean / green. A missing `headlineLabel` on any of the four pages is a type error, so tsc proves step 2 was applied everywhere.

- [ ] **Step 4: Commit**

```bash
git add components/admin/MetricShell.tsx components/admin/metrics/
git commit -m "feat(admin): sticky drill-down header, headline stat card, phone chart heights"
```

---

### Task 4: Responsive orders list

**Files:**
- Create: `components/admin/OrdersList.tsx`
- Delete: `components/admin/OrdersTable.tsx`
- Modify: `components/admin/metrics/RevenueMetric.tsx`, `OrdersMetric.tsx`, `AovMetric.tsx` (import rename)
- Modify: `app/office-scr1pts-x7k2/orders/page.tsx` (full replacement)

**Interfaces:**
- Consumes: `Card`, `StatusBadge`, `itemCountLabel`, `AdminOrder`.
- Produces: `OrdersList({ orders, onOpen, sortBy?, title? })` — same first three props as the old `OrdersTable`; `title?: string` defaults to `'Orders in range'` so the Orders page can pass its own.

- [ ] **Step 1: Create `components/admin/OrdersList.tsx`**

```tsx
'use client'

import { itemCountLabel } from '@/lib/admin/stats'
import type { AdminOrder } from '@/lib/admin/types'
import Card from './Card'
import StatusBadge from './StatusBadge'

/**
 * One list, two renderings: stacked cards on phone (nothing clips, whole card is
 * the tap target), the table at `sm`+. Card is `!p-0 overflow-hidden` so the
 * table's horizontal scroll happens INSIDE the rounded border.
 */
export default function OrdersList({ orders, onOpen, sortBy = 'date', title = 'Orders in range' }: {
  orders: AdminOrder[]
  onOpen: (o: AdminOrder) => void
  sortBy?: 'date' | 'total'
  title?: string
}) {
  const sorted = [...orders].sort((a, b) =>
    sortBy === 'total' ? b.total - a.total : b.date.localeCompare(a.date))
  const empty = sorted.length === 0

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-grey/25">
        <p className="text-[11px] uppercase tracking-[0.14em] text-grey">{title}</p>
      </div>

      {/* Phone: stacked cards */}
      <div className="sm:hidden p-3 space-y-2">
        {empty && <p className="py-6 text-center text-[13px] text-grey">No orders in this range</p>}
        {sorted.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onOpen(o)}
            className="w-full text-left rounded-lg border border-grey/20 bg-[#101010] px-3.5 py-3 hover:border-grey/40 transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-medium text-paper/90 whitespace-nowrap">{o.id}</span>
              <StatusBadge status={o.status} />
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-3 text-[13px]">
              <span className="text-paper/80 truncate">{o.customer.name}</span>
              <span className="text-paper shrink-0 tabular-nums">${o.total}</span>
            </div>
            <p className="mt-1 text-[11px] text-grey tabular-nums whitespace-nowrap">
              {o.date} · {itemCountLabel(o)}
            </p>
          </button>
        ))}
      </div>

      {/* Tablet and desktop: table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left text-[13px] min-w-[560px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.14em] text-grey border-b border-grey/25">
              <th className="px-5 py-3 font-medium">Order</th>
              <th className="px-5 py-3 font-medium">Customer</th>
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium text-right">Total</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {empty && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-grey">No orders in this range</td></tr>
            )}
            {sorted.map((o) => (
              <tr
                key={o.id}
                onClick={() => onOpen(o)}
                className="border-b border-grey/15 last:border-b-0 cursor-pointer hover:bg-paper/[0.03] transition-colors"
              >
                <td className="px-5 py-3 text-paper/90 font-medium whitespace-nowrap">{o.id}</td>
                <td className="px-5 py-3 text-paper/80 max-w-[200px] truncate">{o.customer.name}</td>
                <td className="px-5 py-3 text-grey tabular-nums whitespace-nowrap">{o.date}</td>
                <td className="px-5 py-3 text-paper/80 text-right tabular-nums whitespace-nowrap">${o.total}</td>
                <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
```

- [ ] **Step 2: Delete the old table and rewire the metric pages**

```bash
git rm components/admin/OrdersTable.tsx
```

In `RevenueMetric.tsx`, `OrdersMetric.tsx` and `AovMetric.tsx`: change the import `import OrdersTable from '@/components/admin/OrdersTable'` to `import OrdersList from '@/components/admin/OrdersList'`, and the JSX `<OrdersTable …/>` to `<OrdersList …/>` (props unchanged — AovMetric keeps `sortBy="total"`).

- [ ] **Step 3: Replace `app/office-scr1pts-x7k2/orders/page.tsx`**

The page keeps its own header and drawer; the list itself is now `OrdersList`. The per-row status `<select>` only exists in the table view, so on phone status is display-only and changes happen in the drawer (one tap away) — that is intentional, not an omission.

```tsx
'use client'

import { useState } from 'react'
import OrderDrawer from '@/components/admin/OrderDrawer'
import OrdersList from '@/components/admin/OrdersList'
import { useAdmin } from '@/lib/admin/store'
import type { AdminOrder } from '@/lib/admin/types'

export default function OrdersPage() {
  const { state } = useAdmin()
  const [open, setOpen] = useState<AdminOrder | null>(null)

  return (
    <div>
      <h1 className="text-[32px] sm:text-[40px] leading-none uppercase tracking-[0.04em]" style={{ fontFamily: 'var(--font-bebas)' }}>
        Orders
      </h1>

      <div className="mt-6">
        <OrdersList orders={state.orders} onOpen={setOpen} title={`All orders · ${state.orders.length}`} />
      </div>

      {open && <OrderDrawer order={open} onClose={() => setOpen(null)} />}
    </div>
  )
}
```

- [ ] **Step 4: Verify and commit**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean / green, with no remaining references to `OrdersTable` (`grep -rn "OrdersTable" components app` returns nothing).

```bash
git add -A components/admin app/office-scr1pts-x7k2/orders
git commit -m "feat(admin): responsive orders list — phone cards, clipped table"
```

---

### Task 5: Products page, Overview grids, drawer tap targets

**Files:**
- Modify: `app/office-scr1pts-x7k2/products/page.tsx` (full replacement)
- Modify: `app/office-scr1pts-x7k2/page.tsx` (grid classes + title size)
- Modify: `components/admin/OrderDrawer.tsx`, `components/admin/ProductDrawer.tsx` (close-button hit area)

**Interfaces:**
- Consumes: `useAdmin`, `ProductDrawer`, `Card`, `Product`.

Note on drawers: both already render full-bleed on phone (`w-full max-w-md` caps at 448px, so a 390px viewport is already 100%), so no width change is needed — the real defect is the 18px close-button tap target, which is what this task fixes.

- [ ] **Step 1: Replace `app/office-scr1pts-x7k2/products/page.tsx`**

```tsx
'use client'

import { ImageOff, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import Card from '@/components/admin/Card'
import ProductDrawer from '@/components/admin/ProductDrawer'
import { useAdmin } from '@/lib/admin/store'
import type { Product } from '@/types/product'

function Thumb({ product }: { product: Product }) {
  return (
    <span className="w-11 h-11 rounded-lg bg-[#101010] border border-grey/20 flex items-center justify-center overflow-hidden shrink-0">
      {product.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- object URLs need a plain img
        <img src={product.image} alt="" className="w-full h-full object-contain" />
      ) : (
        <ImageOff size={16} className="text-grey" />
      )}
    </span>
  )
}

function StatusToggle({ product, onToggle }: { product: Product; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={product.status === 'available'}
      aria-label={`Status: ${product.status}. Toggle availability.`}
      onClick={onToggle}
      className="flex items-center gap-2"
    >
      <span className={`w-9 h-5 rounded-full p-0.5 transition-colors ${product.status === 'available' ? 'bg-pink' : 'bg-grey/40'}`}>
        <span className={`block w-4 h-4 rounded-full bg-ink transition-transform ${product.status === 'available' ? 'translate-x-4' : ''}`} />
      </span>
      <span className="text-[11px] uppercase tracking-[0.08em] text-grey">{product.status}</span>
    </button>
  )
}

function RowActions({ product, confirming, onConfirm, onCancel, onAskDelete, onEdit }: {
  product: Product
  confirming: boolean
  onConfirm: () => void
  onCancel: () => void
  onAskDelete: () => void
  onEdit: () => void
}) {
  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <button type="button" onClick={onConfirm} className="text-[11px] font-bold text-pink-deep px-2 py-2">Confirm</button>
        <button type="button" onClick={onCancel} className="text-[11px] text-grey px-2 py-2">Cancel</button>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1">
      <button type="button" aria-label={`Edit ${product.name}`} onClick={onEdit} className="p-2 text-grey hover:text-paper">
        <Pencil size={15} />
      </button>
      <button type="button" aria-label={`Delete ${product.name}`} onClick={onAskDelete} className="p-2 text-grey hover:text-pink-deep">
        <Trash2 size={15} />
      </button>
    </div>
  )
}

export default function ProductsPage() {
  const { state, remove, toggleStatus } = useAdmin()
  const [drawer, setDrawer] = useState<{ open: boolean; product: Product | null }>({ open: false, product: null })
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const empty = state.products.length === 0

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[32px] sm:text-[40px] leading-none uppercase tracking-[0.04em]" style={{ fontFamily: 'var(--font-bebas)' }}>
          Products
        </h1>
        <button
          type="button"
          onClick={() => setDrawer({ open: true, product: null })}
          className="flex items-center gap-2 shrink-0 rounded-lg bg-pink text-ink font-bold text-[13px] px-4 py-2.5 hover:bg-pink-deep transition-colors"
        >
          <Plus size={16} /> <span className="hidden sm:inline">Add Product</span><span className="sm:hidden">Add</span>
        </button>
      </div>

      <Card className="mt-6 !p-0 overflow-hidden">
        {/* Phone: stacked cards */}
        <div className="sm:hidden p-3 space-y-2">
          {empty && <p className="py-6 text-center text-[13px] text-grey">No products yet — add your first drop</p>}
          {state.products.map((p) => (
            <div key={p.id} className="rounded-lg border border-grey/20 bg-[#101010] p-3.5">
              <div className="flex items-center gap-3">
                <Thumb product={p} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-paper/90 font-medium truncate">{p.name}</p>
                  <p className="text-grey text-[11px] truncate">{p.emotion} · {p.colorway}</p>
                </div>
                <span className="text-[13px] text-paper/80 tabular-nums shrink-0">${p.price}</span>
              </div>
              <p className="mt-2 text-[11px] text-grey truncate">{p.collection}</p>
              <div className="mt-2.5 flex items-center justify-between gap-3">
                <StatusToggle product={p} onToggle={() => toggleStatus(p.id)} />
                <RowActions
                  product={p}
                  confirming={confirmId === p.id}
                  onConfirm={() => { remove(p.id); setConfirmId(null) }}
                  onCancel={() => setConfirmId(null)}
                  onAskDelete={() => setConfirmId(p.id)}
                  onEdit={() => setDrawer({ open: true, product: p })}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Tablet and desktop: table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-[13px] min-w-[640px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-[0.14em] text-grey border-b border-grey/25">
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 font-medium text-right">Price</th>
                <th className="px-5 py-3 font-medium">Collection</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {empty && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-grey">No products yet — add your first drop</td></tr>
              )}
              {state.products.map((p) => (
                <tr key={p.id} className="border-b border-grey/15 last:border-b-0">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Thumb product={p} />
                      <div className="min-w-0 max-w-[220px]">
                        <p className="text-paper/90 font-medium truncate">{p.name}</p>
                        <p className="text-grey text-[11px] truncate">{p.emotion} · {p.colorway}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-paper/80 text-right tabular-nums whitespace-nowrap">${p.price}</td>
                  <td className="px-5 py-3 text-grey max-w-[180px] truncate">{p.collection}</td>
                  <td className="px-5 py-3"><StatusToggle product={p} onToggle={() => toggleStatus(p.id)} /></td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end">
                      <RowActions
                        product={p}
                        confirming={confirmId === p.id}
                        onConfirm={() => { remove(p.id); setConfirmId(null) }}
                        onCancel={() => setConfirmId(null)}
                        onAskDelete={() => setConfirmId(p.id)}
                        onEdit={() => setDrawer({ open: true, product: p })}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {drawer.open && (
        <ProductDrawer key={drawer.product?.id ?? 'new'} product={drawer.product} onClose={() => setDrawer({ open: false, product: null })} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Overview grid tweaks in `app/office-scr1pts-x7k2/page.tsx`**

1. Page title: `text-[40px]` → `text-[32px] sm:text-[40px]`.
2. Stat grid: `grid-cols-2 xl:grid-cols-4` → `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4`.
3. Charts row: `lg:grid-cols-2` stays.
4. Breakdown row: `md:grid-cols-3` → `sm:grid-cols-2 lg:grid-cols-3`.

- [ ] **Step 3: Close-button hit areas in both drawers**

In `components/admin/OrderDrawer.tsx` and `components/admin/ProductDrawer.tsx`, the close button's className `"text-grey hover:text-paper"` becomes:

```
"-mr-2 p-2.5 text-grey hover:text-paper"
```

(44px tap target via padding; the negative margin keeps the icon optically aligned with the header edge.)

- [ ] **Step 4: Verify and commit**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean / green.

```bash
git add app/office-scr1pts-x7k2 components/admin/OrderDrawer.tsx components/admin/ProductDrawer.tsx
git commit -m "feat(admin): responsive products page, overview grids, drawer tap targets"
```

---

### Task 6: Final sweep — build, docs

**Files:**
- Modify: `PRD.md` (Change Log append)

- [ ] **Step 1: Full verification**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: all green; build lists the admin routes including `/office-scr1pts-x7k2/metrics/[metric]` and no `/admin`.

- [ ] **Step 2: Grep for stale breakpoints**

Run: `grep -rn "md:" components/admin app/office-scr1pts-x7k2`
Expected: no matches — the admin uses only `sm:` and `lg:` now. Fix any stragglers to the nearest correct breakpoint (`sm:` for two-column, `lg:` for three-column/sidebar states) and include them in this task's commit.

- [ ] **Step 3: Manual responsive pass** (controller does this in the browser)

At 390 / 820 / 1440 on Overview, all four metric pages, Orders and Products: no horizontal page scroll; nothing clipped at card borders; no mid-token wrapping; sticky bar stays reachable while scrolled with back + range pills tappable; bottom nav visible only below 640px and never covering content; phone card lists open the drawer; drawers full-bleed with a comfortable close target.

- [ ] **Step 4: Append PRD Change Log and commit**

Append (new line, never rewrite existing entries): `- **2026-07-31** — **Admin responsive UX pass.** Three breakpoints (phone <640 / tablet / desktop ≥1024): phone bottom nav replaces the sidebar, tables become stacked cards, and drill-downs gained a sticky header (back + metric + range pills) plus a dedicated headline stat card with a delta chip. Fixed tables bleeding past their card borders and values wrapping mid-token.`

```bash
git add PRD.md
git commit -m "chore(admin): PRD change log for responsive UX pass"
```
