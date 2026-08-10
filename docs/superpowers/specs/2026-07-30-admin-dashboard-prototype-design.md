# SCR!PTS Admin Dashboard Prototype — Design Spec

**Date:** 2026-07-30
**Scope:** A fully interactive, mock-data admin dashboard for Heath — no backend, no database. All state lives in a React context (`useState`) seeded from the real catalog, with `localStorage` persistence so demo edits survive refresh. This is the front-end prototype of the PRD's "Admin system"; Supabase/Stripe wiring comes later and should only need to replace the provider's internals.

## Access model (prototype stage)

- **Hidden URL only** — no login. The route lives at a secret slug, defined once in `lib/admin/config.ts` as `ADMIN_SLUG = 'office-scr1pts-x7k2'` so it can be changed in one place. `/admin` does not exist.
- Route metadata sets `robots: { index: false, follow: false }`; nothing on the customer site links to it.
- When real auth lands (Supabase), the slug route gains a middleware/auth gate; this spec explicitly does not build auth.

## Visual language

- **Editorial ink/paper side of the brand** (matches basement/inventory/product pages, not the game console): `bg-ink` `#0D0D0D` background, paper `#F7F7F5` text, Bebas Neue (`--font-bebas`) for headings and stat numbers, system/body font for data, Primary Pink `#FF8AC7` as the single accent (active nav, focus rings, primary buttons), Neutral Grey `#6F6F73` for muted text and borders (`rgba` borders on `#1a1a1a`-ish panels).
- Lucide React icons throughout (`lucide-react` is the only new dependency).
- Responsive: sidebar becomes an icon rail on `<md`, tables scroll horizontally inside their card on small screens.

## Architecture

```
lib/admin/config.ts        ADMIN_SLUG constant + adminPath() helper
lib/admin/types.ts         AdminOrder, OrderStatus types (Product comes from types/product)
lib/admin/mockOrders.ts    seed orders built from real catalog items
lib/admin/store.tsx        AdminProvider + useAdmin() — products & orders state, actions,
                           localStorage sync (key 'scripts-admin-v1', seeds on first load)
app/office-scr1pts-x7k2/
  layout.tsx               sidebar shell + <AdminProvider>, noindex metadata
  page.tsx                 Overview
  products/page.tsx        Product management
  orders/page.tsx          Order management
components/admin/
  Sidebar.tsx              nav (Overview, Products, Orders) + back-to-store link
  StatCard.tsx             Bebas number + label + icon
  StatusBadge.tsx          color-coded order status pill
  ProductDrawer.tsx        slide-over Add/Edit form
  ImageDrop.tsx            file dropzone with object-URL preview
```

- `AdminProvider` sits in the layout so every page shares one store: products (seeded from `CYBER_LOVE_PRODUCTS`) and orders (seeded from `mockOrders`). Actions: `addProduct`, `updateProduct`, `deleteProduct`, `toggleStatus`, `setOrderStatus`.
- State is serialized to `localStorage` on change and rehydrated on mount (client components; images added via dropzone are object URLs and are session-only — on reload they fall back to a placeholder thumbnail, which is acceptable at this stage).
- No server components hold state; every admin page is `'use client'`.

## Pages

### Overview (`/<slug>`)
- Three `StatCard`s computed live from the store: **Total Revenue** (sum of order totals), **Total Orders**, **Active Products** (status `available`).
- **Recent Orders** list: five most recent by date, each row showing order ID, customer, total, and a `StatusBadge`; links to the orders page.

### Products (`/<slug>/products`)
- Table columns: image thumbnail (front image), name (with emotion + colorway as a muted subline), price, collection, **status toggle** (`available` ↔ `pre-order`, styled switch), actions (Edit opens the drawer pre-filled; Delete asks an inline confirm then removes).
- "+ Add Product" button (pink, top right) opens `ProductDrawer` — a right slide-over.
- Drawer fields mirror `types/product.ts`: Product Name, Emotion, Colorway, Price (number), Collection (dropdown of existing collections + "New…" free text), Status (available/pre-order), Ship Date, Sizes (S/M/L/XL multi-select chips), Description (textarea), Front Image and Back Image dropzones (`ImageDrop`: click-or-drop, instant preview, object URL stored).
- Submit validates name + price present, then adds/updates in the store — row appears/updates instantly. Slug and id are generated (`crypto.randomUUID()` / slugified name); the remaining `Product` fields (fabric, care, fit, model note) inherit the catalog's shared defaults so new products render correctly on the customer side's data shape.

### Orders (`/<slug>/orders`)
- Table columns: Order ID (`SCR-1042` style), Customer Name, Items Purchased (e.g. `"RAGE" — Black ×1, "LOVE" — White ×2`), Total, Date, Status.
- `StatusBadge` colors (muted, on-brand): Pending — amber `#D9A441`-tone, Shipped — blue `#5B8DC9`-tone, Delivered — green `#5FA36B`-tone, each as tinted pill (15% bg, full-tone text).
- Each row has a status `<select>` (styled) that calls `setOrderStatus` — badge and Overview stats update live.
- ~10 seed orders in `mockOrders.ts` using real product names, plausible dates over the past two weeks, mixed statuses.

## Error handling / edge cases

- Drawer submit with missing name/price: inline field errors, no crash, drawer stays open.
- Deleting a product referenced by a mock order leaves the order intact (orders store denormalized item strings, not product refs).
- Corrupt/absent `localStorage` payload: silently falls back to seeds.
- Object-URL images lost on refresh render a neutral placeholder tile instead of a broken image.

## Testing

- Vitest unit tests for the store's reducer-style actions (add/update/delete/toggle/status change) and the localStorage fallback path — the store logic is plain functions, testable without DOM.
- Manual pass: add product → appears in table + Active Products count; edit; delete; toggle status; change order status → badge + revenue/status on Overview reflect it; refresh → non-image state persists; mobile viewport → icon rail + scrollable tables.

## Out of scope (explicitly)

- Auth of any kind, Supabase, Stripe, image upload to storage, Basement product management, email — all later phases per PRD.
