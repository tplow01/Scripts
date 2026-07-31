# Admin: Product Options, Variants & Inventory

**Date:** 2026-07-31
**Status:** Approved design
**Scope:** Sub-project A of two. Sub-project B (orders enrichment) depends on this and gets its own spec.

## Problem

The back office cannot describe a real product. `Product` carries one price, a
`sizes: string[]`, and no stock at all, so the store cannot answer "how many
mediums are left" or "what SKU shipped". `ProductDrawer` is a 448px slide-over
with eleven flat fields — there is nowhere to put variants, media ordering,
SEO, or cost.

## Goals

Rebuild product creation and editing around Shopify's options → variants model,
with per-variant SKU, stock, and pricing. The data model must be shaped so a
real database and payment layer can slot under it later; persistence stays in
localStorage for now.

## Non-goals

Real backend persistence, image upload to remote storage, multi-location
inventory, purchase orders, and everything in sub-project B (orders).

## Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Variant depth | Full options → variants | Per-size stock and SKU-on-order both depend on it |
| Option axes | Size × Colorway | Matches how the catalog actually varies |
| Existing catalog | Merge 12 products into 6 | One PDP per emotion, swatch picker; all 12 old slugs redirect |
| Editor shell | Full-page routes | A variant grid does not fit a slide-over |
| Persistence | localStorage, real-shaped types | Store is a portfolio piece today, a real store later |

## Data model

Replaces `types/product.ts`.

```ts
export interface ProductOption {
  name: string            // 'Size' | 'Colorway'
  values: string[]        // ['S','M','L','XL']
  position: 1 | 2 | 3
}

export interface ProductMedia {
  id: string
  url: string
  alt: string
  position: number        // 0 = front, 1 = back, then gallery order
}

export interface ProductVariant {
  id: string
  productId: string
  optionValues: string[]        // index-aligned to Product.options
  sku: string                   // 'SCR-ANX-GRN-M'
  barcode: string | null
  price: number
  compareAtPrice: number | null
  cost: number | null
  stock: number
  trackInventory: boolean
  allowBackorder: boolean
  weightGrams: number | null
  imageId: string | null        // ties a variant to one ProductMedia
  position: number
}

export type PublishedStatus = 'draft' | 'active' | 'archived'

export interface Product {
  id: string
  name: string
  slug: string
  emotion: string
  description: string
  collection: string
  productType: string           // 'Tee' | 'Hoodie'
  vendor: string
  tags: string[]
  publishedStatus: PublishedStatus
  skuRoot: string               // 'SCR-ANX'
  shipDate: string
  seo: { title: string; description: string }
  options: ProductOption[]
  variants: ProductVariant[]
  media: ProductMedia[]
  // Editorial fields, unchanged
  fit: string
  fabric: string
  fabricWeight: string
  modelNote: string
  careInstructions: string[]
}
```

### Three deliberate changes

**`status` splits in two.** The old `'available' | 'pre-order' | 'sold-out'`
conflated lifecycle with availability. `publishedStatus` answers "do customers
see it"; availability is *derived* from variant stock plus `allowBackorder`.
Nothing sets "sold out" by hand — it falls out of the numbers. `shipDate` still
drives pre-order copy.

**Media becomes an ordered list of objects.** `image`, `backImage`, and
`galleryImages` collapse into `media[]`. Variants reference an image by id,
which is what lets a colorway swatch swap the photo. Positions 0 and 1 are the
front and back that `ProductCard` renders.

**Orders snapshot, never reference.** Sub-project B copies sku, price, and
option values onto line items at purchase time. This extends the existing
"denormalized on purpose" contract in `lib/admin/types.ts` rather than changing it.

### Migration

`migrateV2toV3(state)` in `lib/admin/store.tsx` upgrades stored payloads and the
seed catalog: group products by collection + emotion, fold colorways into an
option axis, expand size arrays into variants with generated SKUs and seeded
stock. The real catalog is 8 Cyber-Love products (ANXIETY / LOVE / CONFUSION /
RAGE x White, Army Green) and 4 Basement products (MJ White; ARE YOU OKAY x
White, Army Green, Black), so 12 products fold into 6: four Cyber-Love with a
2-value Colorway axis, MJ with a 1-value axis, and ARE YOU OKAY with a 3-value
axis. Must be idempotent — running it on an already-migrated payload is a
no-op. Slots into the existing `parseStoredState` fallback path, so a malformed
or unmigratable payload still reseeds cleanly.

Merged products take the emotion as their name and slug (`"ANXIETY"`,
`anxiety`), drop the colorway from the title, and keep the first source
product's editorial copy. `NEW_PRODUCT_DEFAULTS` in `store.tsx` extends to
cover the new fields (`vendor`, `productType`, `publishedStatus: 'draft'`,
empty `tags`, `seo` derived from name and description).

The low-stock threshold is a single constant in `lib/admin/config.ts`, default
5, used by both the list's amber state and the PDP's "Only N left" copy.

## The editor

`/products/new` and `/products/[id]/edit` become real routes sharing one
`ProductForm` component. Two columns on desktop (main plus a 320px sidebar),
single stacked column on phone, reusing `useIsPhone` and the responsive patterns
already established in the admin. A sticky save bar appears only when the form
is dirty: Discard / Save, with unsaved-changes interception on back-nav.

Main column, in order:

1. **Title & description** — name, emotion, editorial description
2. **Media** — `ImageDrop` tiles, drag to reorder, first two labelled Front and
   Back, alt text per image
3. **Pricing** — default price, compare-at, cost, live margin readout
   (`$44.00 · 68% margin`)
4. **Inventory** — sku root, barcode, track-inventory toggle, backorder policy.
   With variants present these act as defaults stamped onto new variant rows
5. **Variants** — see below
6. **Shipping** — weight, requires-shipping
7. **SEO preview** — title, description, url handle, rendered as a search result

Sidebar: published status, collection, product type, vendor, tags, ship date.

### Variants section

```
┌─ Variants ────────────────────────────────────┐
│ Size       S  M  L  XL              [Edit]    │
│ Colorway   White  Army Green  Black [Edit]    │
│ + Add another option                          │
├───────────────────────────────────────────────┤
│ Select all │ 12 variants   [Bulk edit ▾]      │
│ ▾ White (4)                          $44      │
│   ☐ White / S    SCR-ANX-WHT-S   12   $44     │
│   ☐ White / M    SCR-ANX-WHT-M    3   $44     │
│   ☐ White / L    SCR-ANX-WHT-L    0   $44     │
│ ▸ Army Green (4)                     $44      │
│ ▸ Black (4)                          $49      │
└───────────────────────────────────────────────┘
```

Rows group by the first option and collapse. Stock and price cells are
inline-editable. Selecting rows enables bulk edit of price, stock, or SKU
prefix. SKUs auto-generate as `skuRoot-VALUE-VALUE` (abbreviated, uppercased);
any cell can be overridden by hand and the override persists — regeneration
never overwrites it.

On phone the table becomes stacked cards, one per variant, with stock and price
as large tap targets.

### Variant reconciliation

Editing an option's values must preserve existing variant data. This is where a
naive implementation silently destroys inventory, so it is a pure function,
isolated and tested before any UI exists.

| Edit | Behaviour |
| --- | --- |
| Add a value | Create the new combinations at stock 0, generated SKUs |
| Remove a value | Warn with the count of variants and total stock to be deleted, then delete |
| Rename a value | Keep the variants and their stock; update `optionValues` in place |
| Reorder values | Update variant `position` only |
| Add an option axis | Existing variants gain the first value of the new axis; the rest are created at stock 0 |
| Remove an option axis | Keep the variant matching the first value of the removed axis, delete the rest, with the same warning |

Maximum of three option axes.

## Products list

Gains a thumbnail, published-status badge, inventory column (`38 in stock
across 12 variants` — amber below the low-stock threshold, red at 0), product
type, and vendor. Filters across the top for status, collection, type, and tag,
plus a low-stock quick filter. Search covers name, sku, and tag. Row click
navigates to the edit route. `ProductDrawer` is retired for products.

Phone keeps the existing card layout, with stock on the second line.

## Storefront changes

- `app/products/[slug]/ProductDetail.tsx` — colorway swatch row above the size
  picker. Selecting a swatch swaps the gallery to that colorway's media and
  re-filters sizes. Zero-stock sizes render struck-through and unselectable
  unless backorder is on; low stock shows "Only 3 left".
- `lib/cart.tsx` — stored items become `{variantId, quantity}`. Existing
  localStorage carts are migrated on read, not dropped.
- `app/products/[slug]/page.tsx` — resolve the 6 merged slugs plus a redirect
  map for all 12 old ones.
- `components/ProductCard.tsx`, `components/BasementProductCard.tsx` — link to
  merged slugs, optional colorway dot row.
- `lib/admin/mockTraffic.ts` — paths updated to merged slugs.

## Testing

Every risky transition is a pure function in `lib/admin/`, tested with vitest
before the UI exists, matching how `store.tsx` is already structured.

- `reconcileVariants(options, existingVariants)` — all six cases in the table above
- `generateSku(root, optionValues, overrides)` — abbreviation, collision
  suffixes, override preservation
- `migrateV2toV3(state)` — the 12→6 catalog fold; idempotent on re-run
- `deriveAvailability(product)` — active / pre-order / sold-out from stock and
  backorder policy
- `migrateCart(stored)` — old `{id, size}` entries resolving to variant ids

## Risks

**Inventory loss through reconciliation** is the sharpest one; mitigated by
pure-function tests written first and a destructive-edit confirmation showing
the variant and stock counts at risk.

**Slug changes break inbound links**; mitigated by the redirect map covering all
12 old slugs.

**`ProductForm` becoming a monolith** — each numbered section is its own
component under `components/admin/product/`, with `ProductForm` owning state and
composing them.
