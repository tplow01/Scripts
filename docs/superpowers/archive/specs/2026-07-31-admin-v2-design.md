# SCR!PTS Admin v2 — Order Detail, Product Gallery, Overview Analytics

**Date:** 2026-07-31
**Scope:** Second iteration of the admin dashboard prototype (branch `admin-dashboard`, on top of the v1 spec `2026-07-30-admin-dashboard-prototype-design.md`). Still mock-data/no-backend: same `AdminProvider` + localStorage pattern. Three features plus an explicit UI polish bar. Approved via visual mockups (`.superpowers/brainstorm/7795-1785517523/content/admin-v2-mockup.html`).

## 1. Data model

### AdminOrder (reworked, still denormalized)
```ts
export interface OrderCustomer {
  name: string
  email: string
  phone: string
  address: string[]   // display lines, e.g. ['14 Mercer Street', 'London, WC2H 9QP, UK']
}
export interface OrderLineItem {
  productName: string // matches catalog name where possible — used to resolve thumbnail
  size: string
  qty: number
  unitPrice: number
}
export interface OrderTimeline {
  placedAt: string              // ISO datetime
  shippedAt: string | null
  deliveredAt: string | null
}
export interface AdminOrder {
  id: string                    // 'SCR-1042'
  customer: OrderCustomer
  lineItems: OrderLineItem[]
  subtotal: number
  shipping: number              // 0 = free
  total: number                 // subtotal + shipping
  date: string                  // 'YYYY-MM-DD' (kept for sorting/back-compat)
  status: OrderStatus
  paymentStatus: 'paid' | 'refunded'
  timeline: OrderTimeline
}
```
- The old `items: string` field is gone; anything that displayed it now renders from `lineItems`.
- Changing status **stamps the timeline**: pending→shipped sets `shippedAt: now`; →delivered sets `deliveredAt: now` (and `shippedAt` too if it was null). Moving backwards clears the later stamps. Pure function `applyOrderStatus(order, status, nowIso)` in the store, unit-tested.
- Seeds regenerated: same 10 order IDs/customers/dates/statuses, now with full customer blocks (plausible UK/US addresses, emails derived from names), 1–3 line items each with sizes, totals = sum of lines (shipping 0 except two orders at $5 to exercise the breakdown), timelines consistent with status (delivered orders have all three stamps).
- **localStorage migration:** bump key to `scripts-admin-v2`. `parseStoredState` additionally rejects payloads whose orders lack `lineItems` (old v1 shape) → falls back to seeds. No in-place migration; prototype data is disposable.

### Product gallery
- `types/product.ts`: add `galleryImages?: string[]` (optional — customer pages unaffected until they adopt it).
- Drawer gains a **"More images"** section under front/back: grid of up to **6** tiles; each is the existing `ImageDrop` in a compact square variant with a remove button; an "add" tile appears while under the cap. Stored as object URLs; the blob-sanitizer nulls stale entries on rehydrate and drops nulls from the array.

### Traffic seed
- New `lib/admin/mockTraffic.ts`: `TRAFFIC_14D: { date: string; visitors: number; pageViews: number }[]` — exactly 14 entries ending 2026-07-30, plausible upward-trending numbers (visitors 120–260/day, pageViews ≈ 2.4–3.2× visitors). Plus `TRAFFIC_PREV_TOTALS = { visitors: number; pageViews: number }` for the % change comparison. Static data, not in the store/localStorage (nothing edits it); clearly the mock-analytics stand-in swapped for real analytics later.

## 2. Order detail drawer

- `components/admin/OrderDrawer.tsx`, opened by clicking any order row on the Orders page or the Overview's Recent Orders list. Same slide-over pattern as `ProductDrawer` (overlay click + Escape close, right panel, sticky header).
- Contents top-to-bottom: order ID (Bebas) + `paymentStatus` badge (Paid = pink-tinted pill, Refunded = grey) + placed date; **Customer card** (name, email, phone, address lines — email/phone as `mailto:`/`tel:` links); **Items card** (each line: thumbnail resolved by exact `productName` match against current products — placeholder tile if no match or null image — name, size, ×qty, line total) with totals rows (Subtotal / Shipping ("Free" when 0) / Total bold); **Timeline card** (three steps, filled pink dot + timestamp when stamped, hollow grey + "pending" when not); footer with the current `StatusBadge` and the status `<select>` (same control as the table row, drives `setOrder`).
- Orders page rows become clickable (`cursor-pointer`, hover tint); the row's inline status `<select>` stops click propagation so changing status doesn't open the drawer.

## 3. Overview v2 (per approved mockup)

Layout top-to-bottom:
1. **Stat row (4 cards):** Total Revenue, Total Orders, Avg Order Value (revenue/orders, $0 when no orders), Visitors (14d sum). Each card gets a delta line: revenue/orders/AOV vs the *previous 14 days* computed from order dates where derivable, visitors vs `TRAFFIC_PREV_TOTALS`. Delta renders ▲ green / ▼ red / "— flat" grey.
2. **Charts row (2 cards):** *Traffic* — inline SVG dual line chart (visitors pink `#FF8AC7`, page views grey) with mini legend; *Revenue last 14 days* — inline SVG bar chart, one bar per day from real order totals (empty days = no bar). Hand-rolled SVG in a small `components/admin/charts.tsx` (`LineChart`, `BarChart` — pure presentational, points/bars computed from props; **no chart library**). Axes minimal: no gridlines, just baseline; values surfaced via `<title>` tooltips.
3. **Breakdown row (3 cards):** *Top Products* — top 3 by units summed from all orders' line items, thumbnail + name + ×units; *Orders by Status* — pending/shipped/delivered counts with badges; *Customers* — unique customer count (by email) + "new this week" (first order date within 7 days of the newest order date).
4. **Recent Orders** — as v1 but rows open the OrderDrawer.

## 4. UI polish bar ("push how clean it looks")

This pass must visibly raise the finish, not just add features:
- **Consistent card system:** one shared card treatment (bg `#141414`, `border-grey/25`, radius 12, padding scale) — extract a `Card` wrapper in `components/admin/Card.tsx` and use it everywhere (StatCard converts too) so spacing/borders stop drifting per page.
- **Typography rhythm:** page titles 40px Bebas; card titles 11px/0.14em uppercase grey labels — no ad-hoc font sizes outside the scale {8,11,12,13,20,40 + Bebas stat sizes}.
- **Motion:** drawers animate in (transform/opacity ~200ms ease-out) and overlay fades; table rows and cards get subtle hover transitions; status badge changes don't jump (fixed pill min-widths where text lengths differ).
- **Empty/zero states:** every list/chart handles empty gracefully (e.g. "No orders yet" line, flat baseline chart) — no NaN, no `$NaN`, no 0-height SVG glitches.
- **Tables:** consistent row heights, right-aligned numeric columns, tabular-nums for prices.
- No new fonts, no new colors beyond the existing brand tokens + the three status tones + paymentStatus pills.

## 5. Architecture / files

```
lib/admin/types.ts          + OrderCustomer, OrderLineItem, OrderTimeline; AdminOrder reworked
lib/admin/mockOrders.ts     regenerated rich seeds
lib/admin/mockTraffic.ts    NEW — TRAFFIC_14D, TRAFFIC_PREV_TOTALS
lib/admin/store.tsx         key → 'scripts-admin-v2'; applyOrderStatus(order, status, nowIso);
                            setOrderStatus uses it; parseStoredState rejects v1 shapes,
                            sanitizes galleryImages blobs; stats helpers (pure, tested):
                            revenueByDay, topProducts, statusCounts, customerStats, deltas
types/product.ts            + galleryImages?: string[]
components/admin/Card.tsx   NEW shared card shell
components/admin/charts.tsx NEW LineChart + BarChart (pure SVG)
components/admin/OrderDrawer.tsx  NEW
components/admin/ProductDrawer.tsx  + "More images" gallery section
components/admin/ImageDrop.tsx      compact square variant prop
components/admin/StatCard.tsx       converts to Card, + delta prop
app/office-scr1pts-x7k2/page.tsx     Overview v2 layout
app/office-scr1pts-x7k2/orders/page.tsx  clickable rows + drawer
```

## 6. Error handling / edge cases

- Thumbnail resolution: no name match or null/blob-dead image → placeholder tile (never broken img).
- Deltas with zero/empty previous period → "— flat" (no divide-by-zero, no ∞%).
- Status moved backwards (delivered → pending) clears shippedAt/deliveredAt; timeline renders consistently.
- Gallery capped at 6; removing an image mid-list leaves no holes.
- v1 localStorage payloads (old key or old shape) silently reseed.

## 7. Testing

- Vitest on pure logic: `applyOrderStatus` stamp/clear behaviour; seed integrity (totals = Σ lines + shipping, timelines consistent with status, 14 traffic entries); stats helpers (revenueByDay, topProducts, statusCounts, customerStats, delta calc incl. zero-previous); parseStoredState v1-shape rejection + gallery blob sanitize.
- Manual pass: open order from both pages, links work, timeline stamps on status change (and clears on regression), gallery add/remove/cap, all Overview cards with seeded and emptied data, refresh persistence, mobile (drawer full-width, charts shrink, tables scroll).

## 8. Out of scope

Real analytics, auth, Supabase/Stripe, customer management page, order search/filtering, CSV export — later phases.
