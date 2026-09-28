# Catalog Split + Basement in Admin — Design

**Date:** 2026-08-01
**Status:** Approved for planning
**Chunk:** A of the backend-free admin programme (see Appendix)

## Problem

Two defects introduced while building the admin:

1. **The Basement's 4 products never reach the admin.** `seedState()` in
   `lib/admin/store.tsx` seeds from `CYBER_LOVE_PRODUCTS`, omitting
   `BASEMENT_PRODUCTS`. Fixing the seed alone is not enough: `parseStoredState`
   returns any existing `scripts-admin-v2` localStorage payload verbatim, so a
   client who has already opened the admin would still see no Basement items.

2. **Colourways are collapsed into single products.** `migrateProducts` groups
   by `collection|emotion`, so 8 inventory rows become 4 products and 4 Basement
   rows become 2. The catalog should present **8 inventory** and **4 Basement**
   products, with each colourway separate.

## Goal

The storefront and the admin both show exactly 12 products: 8 in inventory, 4 in
the Basement, one per emotion/colourway pair, with no dead links from the
previously-merged slugs.

## 1. One product per colourway

Change the `migrateProducts` group key from `collection|emotion` to
`collection|emotion|colorway`. Each legacy row becomes exactly one product.

| | Products |
|---|---|
| Inventory (`1-800-Cyber-Love`) | ANXIETY, LOVE, CONFUSION, RAGE × White, Army Green = **8** |
| Basement | MJ White; ARE YOU OKAY × White, Army Green, Black = **4** |

Per product:

- **options** — `[Size]` only. The Colorway axis is removed.
- **variants** — 4 size variants, each with its own SKU and stock. The variant
  model is unchanged; only the Colorway axis goes away.
- **name** — `"ANXIETY" — White` (the legacy name), not `"ANXIETY"`.
- **slug** — `anxiety-white`, i.e. the original pre-merge slug.
- **skuRoot** — gains a colour segment so roots stay unique across colourways.
  The rule: existing collection code + first 3 alphanumeric characters of the
  emotion + first 3 alphanumeric characters of the colourway, all uppercased.
  So `SCR-ANX-WHI` (White), `SCR-ANX-ARM` (Army Green), `BSM-ARE-BLA` (Black).
- **media** — that colourway's front image at position 0, then its back image.
  No cross-colourway media, so the gallery needs no filtering.
- **imageId** — every variant points at the product's single front image.

Grouping is retained rather than removed outright: the function still groups, so
a future collection that genuinely wants a multi-value axis can change the key
without restructuring the function.

## 2. Slug redirects flip direction

`/products/anxiety` and its five siblings are live merged slugs and would 404
after the split. `LEGACY_SLUG_REDIRECTS` currently maps pre-merge slug → merged
slug; it inverts to map **merged slug → that emotion's White colourway**
(`anxiety` → `anxiety-white`). White exists for every emotion in both
collections, so every merged slug resolves.

The map stays derived from the legacy arrays — never hand-maintained.

## 3. Basement in the admin

- `seedState()` seeds from `ALL_PRODUCTS`.
- The storage key bumps to `scripts-admin-v3`. The v2 payload's product shape no
  longer matches (ids, slugs and option axes all change), and order line items
  reference product/variant ids that no longer exist, so a clean reseed is the
  correct migration rather than a merge. `parseStoredState` keeps its existing
  hardening for the new key.
- The admin products table gains a **Collection** column and a collection
  filter, so Basement items are managed in the same list, tagged. No separate
  Basement admin section.

## 4. Colourway navigation on the PDP

With one colourway per product the swatch picker has nothing to switch, so it is
replaced by an **"Other colourways"** chip row beneath the price, linking to the
sibling products' own pages.

Siblings are derived — same `collection` and `emotion`, different slug — via a
`siblingColorways(product)` helper in `lib/products.ts`. Nothing is
hand-maintained, and a product with no siblings (MJ) renders no row.

`ProductDetail` already guards every Colorway branch with `colorAxis < 0`
fallbacks, so removing the axis degrades cleanly; the colourway-scoped gallery
filtering becomes dead code and is deleted.

## 5. Tests

New assertions:

- Inventory is exactly 8 products; Basement is exactly 4.
- Every product has exactly one option axis, named `Size`.
- Slugs are unique across all 12; SKU roots are unique across all 12.
- The admin seed contains all 12 products, including the Basement's.
- Every merged slug (`anxiety`, `love`, `confusion`, `rage`, `mj`,
  `are-you-okay`) resolves through `LEGACY_SLUG_REDIRECTS` to a product that
  exists.
- `siblingColorways` returns 1 sibling for each inventory product, 2 for the
  ARE YOU OKAY items, and 0 for MJ.

Existing `adminMigrate` and `adminSeeds` tests are updated to the un-merged
expectations rather than deleted.

## 6. Documentation

`PRD.md` states the catalog ships 6 products and describes a colourway swatch
picker. Both are updated to 12 products (8 + 4) and sibling-colourway links, with
a Change Log entry.

## Out of scope

- Supabase, Stripe, API routes, admin authentication.
- Any of the five client feature areas (see Appendix).
- Changes to the variant/size model, the cart, or checkout.

## Appendix — the backend-free admin programme

Agreed sequencing. Each chunk gets its own spec, plan and review; chunk A is this
document.

- **A. Catalog split + Basement in admin** ← this spec
- **B. Analytics instrumentation.** A storefront event log (product views, cart
  adds, checkout steps, on-site searches including zero-result searches) written
  to local storage behind an adapter, so behavioural data accumulates now and
  the sink swaps to Supabase later without touching call sites.
- **C. Catalog management.** Add-product creator, rich-text description, SEO
  fields, tags, COGS with live margin, low-stock thresholds, backorder toggles,
  bulk editing. Media uploads store blobs in **IndexedDB** behind an adapter
  (localStorage cannot hold images; today's code already strips dead `blob:`
  URLs on reload).
- **D. Order operations.** Order queue with filters, fulfilment actions,
  tracking-number entry, addresses with quick-copy, printable packing slips,
  refund/cancel/restock state transitions. Refunds move no money and
  notifications are drafted-and-copyable rather than sent.
- **E. CRM + dashboards.** Customer profiles, LTV, notes and VIP tags; revenue,
  AOV, conversion, product performance, cart abandonment, checkout drop-off and
  search-demand dashboards built on chunk B's event log.
- **F. Shipping + tax settings.** Regional rules, free-shipping thresholds and
  tax rates stored as settings the storefront cart actually applies.

**Blocked until Supabase/Stripe land:** payment and payout logs, transaction fee
breakdowns, payment-decline reasons, automated tax remittance, real customer
email, real refunds, and admin authentication. The admin is currently protected
only by the obscurity of its URL; that must be fixed before the store takes real
orders.
