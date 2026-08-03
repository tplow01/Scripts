# Commerce Pages Foundation: Unified ProductCard/Grid — Design Spec

**Date:** 2026-07-10 · **Status:** approved

## Context

This is sub-project 1 of a larger initiative to improve the Inventory, Basement,
and Product pages. A UX audit found real gaps in all three (no filtering/sorting
on the grids, thin product-page conversion features, no distinct "secret drop"
feel for Basement) — but `ProductCard`/`BasementProductCard` and
`InventoryGrid`/`BasementGrid` are near-exact duplicates first, and building
grid UX (filters, sort, search, empty/loading states) on top of two divergent
implementations would double the work and let them drift further.

This spec covers only the dedupe/foundation step. Grid UX, Basement identity,
and product-page depth are separate follow-on specs.

**Confirmed decisions:**
- Theme is light/dark only — no extensible style-hook props (badge variants,
  accent colors). YAGNI; add hooks when a real need appears.
- Basement keeps its narrower, 2-column layout as a deliberate distinction from
  Inventory's 3-column full-width grid — not unified into one column count.

## Components

**`ProductCard`** (replaces `ProductCard` + `BasementProductCard`)
- New prop: `theme: 'light' | 'dark'`.
- All markup/motion/logic stays as-is (image hover-swap, motion.div scale,
  Link to `/products/[slug]`).
- Only the pill and text color classes change based on `theme`:
  - `light`: pills `bg-[#0d0d0d] text-[#f7f7f5]`, name/price `text-[#0d0d0d]`
    (current `ProductCard` behavior).
  - `dark`: pills `bg-[#f7f7f5] text-[#0d0d0d]`, name/price `text-[#f7f7f5]`
    (current `BasementProductCard` behavior).
- `BasementProductCard.tsx` is deleted, not deprecated.

**`ProductGrid`** (replaces `InventoryGrid` + `BasementGrid`)
- New props: `theme: 'light' | 'dark'`, `columns: 2 | 3`.
- Passes `theme` through to each `ProductCard`.
- `columns` drives the layout:
  - `3`: current `InventoryGrid` layout — `flex flex-wrap justify-center`,
    items `sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)]`, no max-width.
  - `2`: current `BasementGrid` layout — `grid grid-cols-1 sm:grid-cols-2`,
    `max-w-2xl mx-auto w-full`.
- Motion (stagger/fadeIn, reduced-motion handling) stays as-is, unchanged
  between column modes.
- `BasementGrid.tsx` is deleted, not deprecated.

## Call sites

- `app/inventory/page.tsx`: `<ProductGrid products={...} theme="light" columns={3} />`
- `app/basement/page.tsx`: `<ProductGrid products={...} theme="dark" columns={2} />`

## Testing

- Visual check: Inventory renders identically to today (3-col, light pills).
- Visual check: Basement renders identically to today (2-col, dark pills,
  narrower centered layout).
- No other pages reference `ProductCard`, `BasementProductCard`,
  `InventoryGrid`, or `BasementGrid` before deleting the old files (grep to
  confirm).
