# Admin Product Options, Variants & Inventory — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild SCR!PTS product creation and editing around Shopify's options → variants model, giving every size/colorway combination its own SKU, stock count, and price.

**Architecture:** All risky state transitions live as pure functions in `lib/admin/` and are unit-tested before any UI exists. The `Product` type gains `options[]`, `variants[]`, and `media[]`; a migration folds the 12 existing flat products into 6 option-bearing ones. The slide-over product drawer is replaced by full-page editor routes composed of small section components under `components/admin/product/`.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind, vitest + jsdom.

## Global Constraints

- Run tests with `npm test` (`vitest run`). Watch mode: `npm run test:watch`.
- **Vitest only picks up `__tests__/**/*.test.ts`** — `.ts`, not `.tsx`. There is no component test harness. UI tasks are verified with `npm run build` plus explicit manual browser steps, not automated tests. Do not add a component testing library.
- Import aliases in tests: `@/lib/...` and `@/components/...` resolve. **`@/types/...` only resolves for `import type`** (erased at runtime) — never import a runtime value from `@/types`.
- Admin routes are built with `adminPath()` from `lib/admin/config.ts`. Never hardcode `office-scr1pts-x7k2` in a new file.
- Pure functions in `lib/admin/` take state and return new state. Never mutate arguments.
- Commit after every task with a `feat(admin):` / `refactor(admin):` / `test(admin):` prefix, matching existing history.
- The catalog is **8 Cyber-Love products** (ANXIETY / LOVE / CONFUSION / RAGE × White, Army Green) and **4 Basement products** (MJ White; ARE YOU OKAY × White, Army Green, Black). They fold into **6** products.
- Low-stock threshold: `LOW_STOCK_THRESHOLD = 5` in `lib/admin/config.ts`, used by both admin and storefront.
- Sizes across the catalog are always `['S','M','L','XL']`.

## File Structure

**Created:**

| File | Responsibility |
| --- | --- |
| `lib/admin/variants.ts` | Pure variant engine: SKU generation, cartesian expansion, option edits, availability |
| `lib/admin/migrate.ts` | V2 → V3 product/state migration and the 12 → 6 catalog fold |
| `lib/cartStorage.ts` | Pure cart-storage parsing and the `{id,size}` → `{variantId}` migration |
| `components/admin/product/ProductForm.tsx` | Owns editor state, dirty tracking, save bar; composes sections |
| `components/admin/product/TitleSection.tsx` | Name, emotion, description |
| `components/admin/product/MediaSection.tsx` | Ordered media tiles, reorder, alt text |
| `components/admin/product/PricingSection.tsx` | Price, compare-at, cost, margin readout |
| `components/admin/product/InventorySection.tsx` | SKU root, barcode, tracking + backorder defaults |
| `components/admin/product/ShippingSection.tsx` | Weight, requires-shipping |
| `components/admin/product/SeoSection.tsx` | SEO fields + search-result preview |
| `components/admin/product/SidebarSection.tsx` | Status, collection, type, vendor, tags, ship date |
| `components/admin/product/OptionsEditor.tsx` | Option axes: add/rename/remove values, destructive confirms |
| `components/admin/product/VariantTable.tsx` | Grouped, inline-editable variant grid + bulk edit (desktop) |
| `components/admin/product/VariantCards.tsx` | Stacked per-variant cards (phone) |
| `app/office-scr1pts-x7k2/products/new/page.tsx` | Create route |
| `app/office-scr1pts-x7k2/products/[id]/edit/page.tsx` | Edit route |
| `__tests__/adminVariants.test.ts` | Tests for `lib/admin/variants.ts` |
| `__tests__/adminMigrate.test.ts` | Tests for `lib/admin/migrate.ts` |
| `__tests__/cartStorage.test.ts` | Tests for `lib/cartStorage.ts` |

**Modified:** `types/product.ts`, `lib/products.ts`, `lib/admin/store.tsx`, `lib/admin/config.ts`, `lib/admin/mockTraffic.ts`, `lib/cart.tsx`, `app/office-scr1pts-x7k2/products/page.tsx`, `app/products/[slug]/page.tsx`, `app/products/[slug]/ProductDetail.tsx`, `components/ProductCard.tsx`, `components/BasementProductCard.tsx`, `__tests__/adminStore.test.ts`, `__tests__/adminSeeds.test.ts`.

**Deleted:** `components/admin/ProductDrawer.tsx` (Task 10).

---

### Task 1: Types and SKU generation

**Files:**
- Modify: `types/product.ts` (full rewrite)
- Create: `lib/admin/variants.ts`
- Create: `__tests__/adminVariants.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `ProductOption`, `ProductMedia`, `ProductVariant`, `PublishedStatus`, `Product`, `Availability` types; `abbreviate(value: string): string`; `generateSku(skuRoot: string, optionValues: string[], taken: ReadonlySet<string>): string`.

- [ ] **Step 1: Write the new types**

Replace the entire contents of `types/product.ts`:

```ts
export interface ProductOption {
  /** 'Size' | 'Colorway' — free text, admin-defined. */
  name: string
  values: string[]
  position: number // 1-based, max 3
}

export interface ProductMedia {
  id: string
  url: string
  alt: string
  /** 0 = front, 1 = back, then gallery order. */
  position: number
}

export interface ProductVariant {
  id: string
  productId: string
  /** Index-aligned to Product.options. */
  optionValues: string[]
  sku: string
  barcode: string | null
  price: number
  compareAtPrice: number | null
  cost: number | null
  stock: number
  trackInventory: boolean
  allowBackorder: boolean
  weightGrams: number | null
  /** References a ProductMedia.id — drives the colorway swatch image swap. */
  imageId: string | null
  position: number
}

export type PublishedStatus = 'draft' | 'active' | 'archived'

/** Derived from variant stock + backorder policy; never stored. */
export type Availability = 'available' | 'pre-order' | 'sold-out'

export interface Product {
  id: string
  name: string
  slug: string
  emotion: string
  description: string
  collection: string
  productType: string
  vendor: string
  tags: string[]
  publishedStatus: PublishedStatus
  skuRoot: string
  shipDate: string
  /** Physical goods ship; a future digital drop would set this false. */
  requiresShipping: boolean
  seo: { title: string; description: string }
  options: ProductOption[]
  variants: ProductVariant[]
  media: ProductMedia[]
  fit: string
  fabric: string
  fabricWeight: string
  modelNote: string
  careInstructions: string[]
}

export const MAX_OPTIONS = 3
```

Note `MAX_OPTIONS` is a runtime value in a `@/types` module, which tests cannot import. Tests import it from `lib/admin/variants.ts`, which re-exports it (Step 3).

- [ ] **Step 2: Write the failing tests**

Create `__tests__/adminVariants.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { abbreviate, generateSku } from '@/lib/admin/variants'

describe('abbreviate', () => {
  it('uppercases and takes the first three alphanumerics', () => {
    expect(abbreviate('White')).toBe('WHI')
    expect(abbreviate('Army Green')).toBe('ARM')
  })

  it('keeps short values whole', () => {
    expect(abbreviate('S')).toBe('S')
    expect(abbreviate('XL')).toBe('XL')
  })

  it('strips punctuation and spaces', () => {
    expect(abbreviate('are you okay?')).toBe('ARE')
    expect(abbreviate('  -- ')).toBe('X')
  })
})

describe('generateSku', () => {
  it('joins the root with abbreviated option values', () => {
    expect(generateSku('SCR-ANX', ['M', 'Army Green'], new Set())).toBe('SCR-ANX-M-ARM')
  })

  it('suffixes on collision', () => {
    const taken = new Set(['SCR-ANX-M-ARM'])
    expect(generateSku('SCR-ANX', ['M', 'Army Green'], taken)).toBe('SCR-ANX-M-ARM-2')
  })

  it('keeps suffixing until the sku is free', () => {
    const taken = new Set(['SCR-ANX-M-ARM', 'SCR-ANX-M-ARM-2'])
    expect(generateSku('SCR-ANX', ['M', 'Army Green'], taken)).toBe('SCR-ANX-M-ARM-3')
  })

  it('falls back to SCR when the root is blank', () => {
    expect(generateSku('', ['S'], new Set())).toBe('SCR-S')
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test -- adminVariants`
Expected: FAIL — `Failed to resolve import "@/lib/admin/variants"`.

- [ ] **Step 4: Implement**

Create `lib/admin/variants.ts`:

```ts
import type { Product, ProductOption, ProductVariant } from '@/types/product'

export const MAX_OPTIONS = 3

/** First three alphanumerics, uppercased. 'Army Green' → 'ARM'. Never empty. */
export function abbreviate(value: string): string {
  const clean = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  return clean.slice(0, 3) || 'X'
}

/**
 * `skuRoot-VAL-VAL`, uppercased. Collisions get a numeric suffix so a
 * generated sku is always unique within the product.
 */
export function generateSku(
  skuRoot: string,
  optionValues: string[],
  taken: ReadonlySet<string>,
): string {
  const root = skuRoot.trim().toUpperCase() || 'SCR'
  const base = [root, ...optionValues.map(abbreviate)].join('-')
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- adminVariants`
Expected: PASS, 7 tests.

- [ ] **Step 6: Commit**

```bash
git add types/product.ts lib/admin/variants.ts __tests__/adminVariants.test.ts
git commit -m "feat(admin): variant types and sku generation"
```

Type errors in the rest of the app are expected at this point — Tasks 2–5 resolve them. Do not run `npm run build` yet.

---

### Task 2: Cartesian expansion and reconciliation

**Files:**
- Modify: `lib/admin/variants.ts`
- Modify: `__tests__/adminVariants.test.ts`

**Interfaces:**
- Consumes: `generateSku`, `abbreviate` (Task 1).
- Produces: `VariantDefaults` type; `cartesian(options: ProductOption[]): string[][]`; `variantTitle(optionValues: string[]): string`; `reconcileVariants(productId: string, skuRoot: string, options: ProductOption[], existing: ProductVariant[], defaults: VariantDefaults): ProductVariant[]`.

`reconcileVariants` is the engine every option edit runs through. It matches existing variants by their `optionValues` joined with `' / '`, keeps matched ones untouched (stock, sku overrides and all), creates missing ones from `defaults`, drops orphans, and renumbers `position`.

- [ ] **Step 1: Write the failing tests**

Append to `__tests__/adminVariants.test.ts`:

```ts
import { cartesian, reconcileVariants, variantTitle } from '@/lib/admin/variants'
import type { ProductOption, ProductVariant } from '@/types/product'

const SIZE: ProductOption = { name: 'Size', values: ['S', 'M'], position: 1 }
const COLOR: ProductOption = { name: 'Colorway', values: ['White', 'Black'], position: 2 }

const DEFAULTS = {
  price: 44, compareAtPrice: null, cost: null, barcode: null,
  trackInventory: true, allowBackorder: false, weightGrams: null,
}

describe('cartesian', () => {
  it('expands one axis', () => {
    expect(cartesian([SIZE])).toEqual([['S'], ['M']])
  })

  it('expands two axes with the first axis varying slowest', () => {
    expect(cartesian([SIZE, COLOR])).toEqual([
      ['S', 'White'], ['S', 'Black'], ['M', 'White'], ['M', 'Black'],
    ])
  })

  it('returns a single empty combination when there are no options', () => {
    expect(cartesian([])).toEqual([[]])
  })

  it('returns nothing when an axis has no values', () => {
    expect(cartesian([{ name: 'Size', values: [], position: 1 }])).toEqual([])
  })
})

describe('variantTitle', () => {
  it('joins option values with a slash', () => {
    expect(variantTitle(['M', 'Army Green'])).toBe('M / Army Green')
  })

  it('falls back to Default for an optionless product', () => {
    expect(variantTitle([])).toBe('Default')
  })
})

describe('reconcileVariants', () => {
  it('creates a variant per combination with generated skus', () => {
    const out = reconcileVariants('p1', 'SCR-ANX', [SIZE], [], DEFAULTS)
    expect(out).toHaveLength(2)
    expect(out.map((v) => v.sku)).toEqual(['SCR-ANX-S', 'SCR-ANX-M'])
    expect(out.map((v) => v.optionValues)).toEqual([['S'], ['M']])
    expect(out.every((v) => v.stock === 0 && v.price === 44 && v.productId === 'p1')).toBe(true)
    expect(out.map((v) => v.position)).toEqual([0, 1])
  })

  it('preserves stock, price and sku of variants that still exist', () => {
    const first = reconcileVariants('p1', 'SCR-ANX', [SIZE], [], DEFAULTS)
    const edited: ProductVariant[] = first.map((v) =>
      v.optionValues[0] === 'M' ? { ...v, stock: 12, price: 49, sku: 'CUSTOM-M' } : v)
    const widened = { ...SIZE, values: ['S', 'M', 'L'] }
    const out = reconcileVariants('p1', 'SCR-ANX', [widened], edited, DEFAULTS)

    const m = out.find((v) => v.optionValues[0] === 'M')
    expect(m).toMatchObject({ stock: 12, price: 49, sku: 'CUSTOM-M' })
  })

  it('adds new combinations at zero stock', () => {
    const first = reconcileVariants('p1', 'SCR-ANX', [SIZE], [], DEFAULTS)
    const widened = { ...SIZE, values: ['S', 'M', 'L'] }
    const out = reconcileVariants('p1', 'SCR-ANX', [widened], first, DEFAULTS)
    expect(out).toHaveLength(3)
    expect(out.find((v) => v.optionValues[0] === 'L')?.stock).toBe(0)
  })

  it('drops variants whose combination no longer exists', () => {
    const first = reconcileVariants('p1', 'SCR-ANX', [SIZE], [], DEFAULTS)
    const narrowed = { ...SIZE, values: ['S'] }
    const out = reconcileVariants('p1', 'SCR-ANX', [narrowed], first, DEFAULTS)
    expect(out.map((v) => v.optionValues[0])).toEqual(['S'])
  })

  it('never generates a duplicate sku across a two-axis product', () => {
    const out = reconcileVariants('p1', 'SCR-ANX', [SIZE, COLOR], [], DEFAULTS)
    expect(out).toHaveLength(4)
    expect(new Set(out.map((v) => v.sku)).size).toBe(4)
  })

  it('does not reuse a sku already held by a preserved variant', () => {
    const first = reconcileVariants('p1', 'SCR', [SIZE], [], DEFAULTS)
    // Force a collision: rename S's sku to what L would generate.
    const clashed = first.map((v) =>
      v.optionValues[0] === 'S' ? { ...v, sku: 'SCR-L' } : v)
    const widened = { ...SIZE, values: ['S', 'M', 'L'] }
    const out = reconcileVariants('p1', 'SCR', [widened], clashed, DEFAULTS)
    expect(out.find((v) => v.optionValues[0] === 'L')?.sku).toBe('SCR-L-2')
  })

  it('does not mutate the variants passed in', () => {
    const first = reconcileVariants('p1', 'SCR-ANX', [SIZE], [], DEFAULTS)
    const snapshot = JSON.parse(JSON.stringify(first))
    reconcileVariants('p1', 'SCR-ANX', [{ ...SIZE, values: ['S'] }], first, DEFAULTS)
    expect(first).toEqual(snapshot)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- adminVariants`
Expected: FAIL — `cartesian is not a function`.

- [ ] **Step 3: Implement**

Append to `lib/admin/variants.ts`:

```ts
export interface VariantDefaults {
  price: number
  compareAtPrice: number | null
  cost: number | null
  barcode: string | null
  trackInventory: boolean
  allowBackorder: boolean
  weightGrams: number | null
}

/** Every combination of option values, first axis varying slowest. */
export function cartesian(options: ProductOption[]): string[][] {
  return options.reduce<string[][]>(
    (acc, opt) => acc.flatMap((combo) => opt.values.map((v) => [...combo, v])),
    [[]],
  )
}

/** Human label for a variant row: 'M / Army Green'. */
export function variantTitle(optionValues: string[]): string {
  return optionValues.length ? optionValues.join(' / ') : 'Default'
}

const keyOf = (values: string[]) => values.join(' ')

/**
 * Rebuilds the variant list for a set of options, preserving every variant
 * whose exact combination survives. Preserved variants keep their stock,
 * price and hand-edited sku; new combinations are created from `defaults` at
 * zero stock; orphans are dropped. Pure — never mutates `existing`.
 */
export function reconcileVariants(
  productId: string,
  skuRoot: string,
  options: ProductOption[],
  existing: ProductVariant[],
  defaults: VariantDefaults,
): ProductVariant[] {
  const byCombo = new Map(existing.map((v) => [keyOf(v.optionValues), v]))
  const combos = cartesian(options)

  // Reserve every surviving sku up front so generated ones can never collide.
  const taken = new Set<string>()
  for (const combo of combos) {
    const kept = byCombo.get(keyOf(combo))
    if (kept) taken.add(kept.sku)
  }

  return combos.map((optionValues, position) => {
    const kept = byCombo.get(keyOf(optionValues))
    if (kept) return { ...kept, productId, position }
    const sku = generateSku(skuRoot, optionValues, taken)
    taken.add(sku)
    return {
      id: `${productId}-v${position}-${sku}`,
      productId,
      optionValues,
      sku,
      stock: 0,
      imageId: null,
      position,
      ...defaults,
    }
  })
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- adminVariants`
Expected: PASS, 17 tests total.

- [ ] **Step 5: Commit**

```bash
git add lib/admin/variants.ts __tests__/adminVariants.test.ts
git commit -m "feat(admin): cartesian variant expansion and reconciliation"
```

---

### Task 3: Option edits, removal impact, and availability

**Files:**
- Modify: `lib/admin/variants.ts`
- Modify: `__tests__/adminVariants.test.ts`

**Interfaces:**
- Consumes: `reconcileVariants`, `VariantDefaults` (Task 2).
- Produces: `addOptionValue`, `removeOptionValue`, `renameOptionValue`, `reorderOptionValues`, `addOption`, `removeOption` — all `(product: Product, ...args, defaults: VariantDefaults) => Product`; `impactOfRemoval(product: Product, optionIndex: number, value: string): { variants: number; stock: number }`; `totalStock(product: Product): number`; `variantCount(product: Product): number`; `deriveAvailability(product: Product): Availability`.

Rename is deliberately its own function: `reconcileVariants` matches on option values, so a rename routed through it would read as "remove old, add new" and destroy stock. Rename rewrites `optionValues` in place first, after which reconciliation is a no-op.

- [ ] **Step 1: Write the failing tests**

Append to `__tests__/adminVariants.test.ts`:

```ts
import {
  addOption, addOptionValue, deriveAvailability, impactOfRemoval,
  removeOption, removeOptionValue, renameOptionValue, reorderOptionValues,
  totalStock, variantCount,
} from '@/lib/admin/variants'
import type { Product } from '@/types/product'

const base = (over: Partial<Product> = {}): Product => ({
  id: 'p1', name: 'ANXIETY', slug: 'anxiety', emotion: 'ANXIETY',
  description: '', collection: '1-800-Cyber-Love', productType: 'Tee',
  vendor: 'SCR!PTS', tags: [], publishedStatus: 'active', skuRoot: 'SCR-ANX',
  shipDate: 'July 2026', requiresShipping: true, seo: { title: '', description: '' },
  options: [{ name: 'Size', values: ['S', 'M'], position: 1 }],
  variants: [], media: [], fit: '', fabric: '', fabricWeight: '',
  modelNote: '', careInstructions: [], ...over,
})

const withVariants = (over: Partial<Product> = {}): Product => {
  const p = base(over)
  return { ...p, variants: reconcileVariants(p.id, p.skuRoot, p.options, [], DEFAULTS) }
}

const stocked = (p: Product, stocks: Record<string, number>): Product => ({
  ...p,
  variants: p.variants.map((v) => ({ ...v, stock: stocks[variantTitle(v.optionValues)] ?? v.stock })),
})

describe('addOptionValue', () => {
  it('adds the new combinations at zero stock and keeps the rest', () => {
    const p = stocked(withVariants(), { S: 7, M: 3 })
    const out = addOptionValue(p, 0, 'L', DEFAULTS)
    expect(out.options[0].values).toEqual(['S', 'M', 'L'])
    expect(out.variants).toHaveLength(3)
    expect(totalStock(out)).toBe(10)
  })

  it('ignores a duplicate value', () => {
    const p = withVariants()
    expect(addOptionValue(p, 0, 'S', DEFAULTS).variants).toHaveLength(2)
  })
})

describe('removeOptionValue', () => {
  it('drops the value and its variants', () => {
    const p = stocked(withVariants(), { S: 7, M: 3 })
    const out = removeOptionValue(p, 0, 'M', DEFAULTS)
    expect(out.options[0].values).toEqual(['S'])
    expect(totalStock(out)).toBe(7)
  })
})

describe('impactOfRemoval', () => {
  it('reports how many variants and how much stock a removal destroys', () => {
    const p = stocked(withVariants({
      options: [
        { name: 'Size', values: ['S', 'M'], position: 1 },
        { name: 'Colorway', values: ['White', 'Black'], position: 2 },
      ],
    }), { 'S / Black': 4, 'M / Black': 6 })
    expect(impactOfRemoval(p, 1, 'Black')).toEqual({ variants: 2, stock: 10 })
  })
})

describe('renameOptionValue', () => {
  it('keeps variants and their stock', () => {
    const p = stocked(withVariants({
      options: [{ name: 'Colorway', values: ['Army Green', 'White'], position: 1 }],
    }), { 'Army Green': 9 })
    const out = renameOptionValue(p, 0, 'Army Green', 'Olive', DEFAULTS)
    expect(out.options[0].values).toEqual(['Olive', 'White'])
    expect(out.variants).toHaveLength(2)
    expect(out.variants.find((v) => v.optionValues[0] === 'Olive')?.stock).toBe(9)
  })

  it('leaves the existing sku alone', () => {
    const p = withVariants({ options: [{ name: 'Colorway', values: ['Army Green'], position: 1 }] })
    const before = p.variants[0].sku
    expect(renameOptionValue(p, 0, 'Army Green', 'Olive', DEFAULTS).variants[0].sku).toBe(before)
  })
})

describe('reorderOptionValues', () => {
  it('reorders variants without losing stock', () => {
    const p = stocked(withVariants(), { S: 7, M: 3 })
    const out = reorderOptionValues(p, 0, ['M', 'S'], DEFAULTS)
    expect(out.variants.map((v) => v.optionValues[0])).toEqual(['M', 'S'])
    expect(out.variants.map((v) => v.stock)).toEqual([3, 7])
    expect(out.variants.map((v) => v.position)).toEqual([0, 1])
  })
})

describe('addOption', () => {
  it('multiplies the variant grid and keeps stock on the first value', () => {
    const p = stocked(withVariants(), { S: 7, M: 3 })
    const out = addOption(p, 'Colorway', ['White', 'Black'], DEFAULTS)
    expect(out.variants).toHaveLength(4)
    expect(out.variants.find((v) => variantTitle(v.optionValues) === 'S / White')?.stock).toBe(7)
    expect(out.variants.find((v) => variantTitle(v.optionValues) === 'S / Black')?.stock).toBe(0)
  })

  it('refuses a fourth axis', () => {
    const p = withVariants({
      options: [
        { name: 'A', values: ['1'], position: 1 },
        { name: 'B', values: ['1'], position: 2 },
        { name: 'C', values: ['1'], position: 3 },
      ],
    })
    expect(addOption(p, 'D', ['1'], DEFAULTS)).toBe(p)
  })
})

describe('removeOption', () => {
  it('keeps the variants sitting on the first value of the removed axis', () => {
    const p = stocked(withVariants({
      options: [
        { name: 'Size', values: ['S', 'M'], position: 1 },
        { name: 'Colorway', values: ['White', 'Black'], position: 2 },
      ],
    }), { 'S / White': 7, 'M / White': 3, 'S / Black': 5 })
    const out = removeOption(p, 1, DEFAULTS)
    expect(out.options.map((o) => o.name)).toEqual(['Size'])
    expect(out.variants).toHaveLength(2)
    expect(totalStock(out)).toBe(10)
  })

  it('renumbers the positions of remaining axes', () => {
    const p = withVariants({
      options: [
        { name: 'Size', values: ['S'], position: 1 },
        { name: 'Colorway', values: ['White'], position: 2 },
      ],
    })
    expect(removeOption(p, 0, DEFAULTS).options[0].position).toBe(1)
  })
})

describe('deriveAvailability', () => {
  it('is sold-out when every tracked variant is empty', () => {
    expect(deriveAvailability(stocked(withVariants(), { S: 0, M: 0 }))).toBe('sold-out')
  })

  it('is available when any variant has stock', () => {
    expect(deriveAvailability(stocked(withVariants(), { S: 0, M: 2 }))).toBe('available')
  })

  it('is pre-order when empty but backorder is allowed', () => {
    const p = stocked(withVariants(), { S: 0, M: 0 })
    const backorder = { ...p, variants: p.variants.map((v) => ({ ...v, allowBackorder: true })) }
    expect(deriveAvailability(backorder)).toBe('pre-order')
  })

  it('is available when inventory is not tracked', () => {
    const p = stocked(withVariants(), { S: 0, M: 0 })
    const untracked = { ...p, variants: p.variants.map((v) => ({ ...v, trackInventory: false })) }
    expect(deriveAvailability(untracked)).toBe('available')
  })

  it('is sold-out for a product with no variants at all', () => {
    expect(deriveAvailability(base())).toBe('sold-out')
  })
})

describe('variantCount', () => {
  it('counts variants', () => {
    expect(variantCount(withVariants())).toBe(2)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- adminVariants`
Expected: FAIL — `addOptionValue is not a function`.

- [ ] **Step 3: Implement**

Append to `lib/admin/variants.ts`:

```ts
import type { Availability } from '@/types/product'

const rebuild = (p: Product, options: ProductOption[], defaults: VariantDefaults): Product => ({
  ...p,
  options,
  variants: reconcileVariants(p.id, p.skuRoot, options, p.variants, defaults),
})

const mapOption = (p: Product, i: number, fn: (o: ProductOption) => ProductOption) =>
  p.options.map((o, idx) => (idx === i ? fn(o) : o))

export function addOptionValue(p: Product, i: number, value: string, d: VariantDefaults): Product {
  const clean = value.trim()
  if (!clean || p.options[i]?.values.includes(clean)) return p
  return rebuild(p, mapOption(p, i, (o) => ({ ...o, values: [...o.values, clean] })), d)
}

export function removeOptionValue(p: Product, i: number, value: string, d: VariantDefaults): Product {
  if (!p.options[i]?.values.includes(value)) return p
  return rebuild(p, mapOption(p, i, (o) => ({ ...o, values: o.values.filter((v) => v !== value) })), d)
}

/** How much damage `removeOptionValue` would do. Drives the confirm dialog. */
export function impactOfRemoval(p: Product, i: number, value: string): { variants: number; stock: number } {
  const doomed = p.variants.filter((v) => v.optionValues[i] === value)
  return { variants: doomed.length, stock: doomed.reduce((n, v) => n + v.stock, 0) }
}

/**
 * Rewrites the value in place on the option AND on every variant holding it,
 * so reconciliation sees no change and stock survives.
 */
export function renameOptionValue(p: Product, i: number, from: string, to: string, d: VariantDefaults): Product {
  const clean = to.trim()
  if (!clean || clean === from || !p.options[i]?.values.includes(from)) return p
  const renamed: Product = {
    ...p,
    options: mapOption(p, i, (o) => ({ ...o, values: o.values.map((v) => (v === from ? clean : v)) })),
    variants: p.variants.map((v) =>
      v.optionValues[i] === from
        ? { ...v, optionValues: v.optionValues.map((val, idx) => (idx === i ? clean : val)) }
        : v),
  }
  return rebuild(renamed, renamed.options, d)
}

export function reorderOptionValues(p: Product, i: number, values: string[], d: VariantDefaults): Product {
  return rebuild(p, mapOption(p, i, (o) => ({ ...o, values })), d)
}

export function addOption(p: Product, name: string, values: string[], d: VariantDefaults): Product {
  const clean = name.trim()
  if (!clean || !values.length || p.options.length >= MAX_OPTIONS) return p
  // Existing variants inherit the new axis's first value so their stock survives.
  const seeded: Product = {
    ...p,
    variants: p.variants.map((v) => ({ ...v, optionValues: [...v.optionValues, values[0]] })),
  }
  const options = [...p.options, { name: clean, values, position: p.options.length + 1 }]
  return rebuild(seeded, options, d)
}

export function removeOption(p: Product, i: number, d: VariantDefaults): Product {
  const doomed = p.options[i]
  if (!doomed) return p
  const survivor = doomed.values[0]
  // Keep only the slice sitting on the first value, then drop that coordinate.
  const kept: Product = {
    ...p,
    variants: p.variants
      .filter((v) => v.optionValues[i] === survivor)
      .map((v) => ({ ...v, optionValues: v.optionValues.filter((_, idx) => idx !== i) })),
  }
  const options = p.options
    .filter((_, idx) => idx !== i)
    .map((o, idx) => ({ ...o, position: idx + 1 }))
  return rebuild(kept, options, d)
}

export function totalStock(p: Product): number {
  return p.variants.reduce((n, v) => n + v.stock, 0)
}

export function variantCount(p: Product): number {
  return p.variants.length
}

/**
 * Availability falls out of the numbers — nothing sets 'sold-out' by hand.
 * Untracked inventory always counts as sellable.
 */
export function deriveAvailability(p: Product): Availability {
  if (!p.variants.length) return 'sold-out'
  const sellable = p.variants.some((v) => !v.trackInventory || v.stock > 0)
  if (sellable) return 'available'
  return p.variants.some((v) => v.allowBackorder) ? 'pre-order' : 'sold-out'
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- adminVariants`
Expected: PASS, 34 tests total.

- [ ] **Step 5: Commit**

```bash
git add lib/admin/variants.ts __tests__/adminVariants.test.ts
git commit -m "feat(admin): option edits, removal impact and derived availability"
```

---

### Task 4: Catalog migration

**Files:**
- Create: `lib/admin/migrate.ts`
- Create: `__tests__/adminMigrate.test.ts`
- Modify: `lib/admin/config.ts`

**Interfaces:**
- Consumes: `reconcileVariants`, `VariantDefaults`, `totalStock`, `variantTitle` (Tasks 2–3).
- Produces: `LegacyProduct` type; `migrateProducts(legacy: LegacyProduct[]): Product[]`; `isMigrated(value: unknown): boolean`; `LOW_STOCK_THRESHOLD` in config.

Grouping key is `collection + ' ' + emotion`, so Cyber-Love ANXIETY and a future Basement ANXIETY never merge. Merged slug is the slugified emotion; merged name is the emotion in quotes. Seeded stock is deterministic (no `Math.random`) so tests are stable: `12 - (index % 5) * 3`, floored at 0.

- [ ] **Step 1: Write the failing tests**

Create `__tests__/adminMigrate.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { isMigrated, migrateProducts } from '@/lib/admin/migrate'
import type { LegacyProduct } from '@/lib/admin/migrate'
import { totalStock, variantTitle } from '@/lib/admin/variants'

const legacy = (over: Partial<LegacyProduct> = {}): LegacyProduct => ({
  id: '1', name: '"ANXIETY" — White', emotion: 'ANXIETY', colorway: 'White',
  price: 44, collection: '1-800-Cyber-Love', status: 'pre-order',
  image: '/products/cutout/anxiety-white.png', backImage: '/products/cutout/back-white.png',
  slug: 'anxiety-white', description: 'copy', shipDate: 'July 2026',
  sizes: ['S', 'M', 'L', 'XL'], careInstructions: ['wash'], fit: 'boxy',
  fabric: '100% Cotton', fabricWeight: '260 g/m²', modelNote: 'note', ...over,
})

const CYBER = [
  legacy(),
  legacy({ id: '5', name: '"ANXIETY" — Army Green', colorway: 'Army Green', slug: 'anxiety-green', image: '/g.png' }),
]

describe('migrateProducts', () => {
  it('folds colorways of one emotion into a single product', () => {
    const out = migrateProducts(CYBER)
    expect(out).toHaveLength(1)
    expect(out[0].slug).toBe('anxiety')
    expect(out[0].name).toBe('"ANXIETY"')
  })

  it('builds a Size axis and a Colorway axis in that order', () => {
    const [p] = migrateProducts(CYBER)
    expect(p.options.map((o) => o.name)).toEqual(['Size', 'Colorway'])
    expect(p.options[0].values).toEqual(['S', 'M', 'L', 'XL'])
    expect(p.options[1].values).toEqual(['White', 'Army Green'])
    expect(p.options.map((o) => o.position)).toEqual([1, 2])
  })

  it('creates one variant per size x colorway', () => {
    const [p] = migrateProducts(CYBER)
    expect(p.variants).toHaveLength(8)
    expect(new Set(p.variants.map((v) => v.sku)).size).toBe(8)
    expect(p.variants.every((v) => v.price === 44)).toBe(true)
  })

  it('seeds deterministic non-zero stock', () => {
    const a = migrateProducts(CYBER)
    const b = migrateProducts(CYBER)
    expect(totalStock(a[0])).toBe(totalStock(b[0]))
    expect(totalStock(a[0])).toBeGreaterThan(0)
  })

  it('collects one media item per colorway plus the shared backs', () => {
    const [p] = migrateProducts(CYBER)
    expect(p.media.length).toBeGreaterThanOrEqual(2)
    expect(p.media[0].position).toBe(0)
  })

  it('points every variant at the media for its colorway', () => {
    const [p] = migrateProducts(CYBER)
    const white = p.variants.find((v) => variantTitle(v.optionValues) === 'S / White')
    const green = p.variants.find((v) => variantTitle(v.optionValues) === 'S / Army Green')
    expect(white?.imageId).toBeTruthy()
    expect(green?.imageId).toBeTruthy()
    expect(white?.imageId).not.toBe(green?.imageId)
  })

  it('does not merge the same emotion across different collections', () => {
    const out = migrateProducts([
      legacy(),
      legacy({ id: 'b9', collection: 'Basement', slug: 'anxiety-basement' }),
    ])
    expect(out).toHaveLength(2)
  })

  it('keeps a single-colorway product as a one-value axis', () => {
    const out = migrateProducts([legacy({ id: 'b1', emotion: 'MJ', collection: 'Basement', slug: 'mj-white' })])
    expect(out[0].options[1].values).toEqual(['White'])
    expect(out[0].variants).toHaveLength(4)
  })

  it('derives skuRoot from the collection and emotion', () => {
    expect(migrateProducts(CYBER)[0].skuRoot).toBe('SCR-ANX')
  })

  it('carries editorial copy and sets publishedStatus to active', () => {
    const [p] = migrateProducts(CYBER)
    expect(p.description).toBe('copy')
    expect(p.careInstructions).toEqual(['wash'])
    expect(p.fabric).toBe('100% Cotton')
    expect(p.publishedStatus).toBe('active')
    expect(p.seo.title).toBe('"ANXIETY"')
  })

  it('sets allowBackorder from a pre-order source product', () => {
    const [p] = migrateProducts(CYBER)
    expect(p.variants.every((v) => v.allowBackorder)).toBe(true)
  })

  it('is idempotent when handed already-migrated products', () => {
    const once = migrateProducts(CYBER)
    expect(migrateProducts(once as unknown as LegacyProduct[])).toEqual(once)
  })
})

describe('isMigrated', () => {
  it('recognises a v3 product', () => {
    expect(isMigrated(migrateProducts(CYBER)[0])).toBe(true)
  })

  it('rejects a legacy product', () => {
    expect(isMigrated(legacy())).toBe(false)
  })

  it('rejects junk', () => {
    expect(isMigrated(null)).toBe(false)
    expect(isMigrated({})).toBe(false)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- adminMigrate`
Expected: FAIL — `Failed to resolve import "@/lib/admin/migrate"`.

- [ ] **Step 3: Add the threshold constant**

Append to `lib/admin/config.ts`:

```ts
/** Stock at or below this reads as low — amber in the admin, "Only N left" on the PDP. */
export const LOW_STOCK_THRESHOLD = 5
```

- [ ] **Step 4: Implement the migration**

Create `lib/admin/migrate.ts`:

```ts
import type { Product, ProductMedia, ProductOption } from '@/types/product'
import { reconcileVariants, type VariantDefaults } from './variants'

/** The pre-variant Product shape, as it exists in v2 localStorage payloads. */
export interface LegacyProduct {
  id: string
  name: string
  emotion: string
  colorway: string
  price: number
  collection: string
  status: 'available' | 'pre-order' | 'sold-out'
  image: string | null
  backImage: string | null
  galleryImages?: string[]
  slug: string
  description: string
  shipDate: string
  sizes: string[]
  careInstructions: string[]
  fit: string
  fabric: string
  fabricWeight: string
  modelNote: string
}

/** A v3 product has an options array; a v2 one has a colorway string. */
export function isMigrated(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const p = value as Partial<Product>
  return Array.isArray(p.options) && Array.isArray(p.variants) && Array.isArray(p.media)
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'product'

const collectionCode = (collection: string) =>
  collection.toLowerCase().startsWith('basement') ? 'BSM' : 'SCR'

/** Deterministic seed stock so tests and reloads agree. */
const seedStock = (index: number) => Math.max(0, 12 - (index % 5) * 3)

export function migrateProducts(legacy: LegacyProduct[]): Product[] {
  if (legacy.every(isMigrated)) return legacy as unknown as Product[]

  const groups = new Map<string, LegacyProduct[]>()
  for (const p of legacy) {
    const key = `${p.collection} ${p.emotion}`
    groups.set(key, [...(groups.get(key) ?? []), p])
  }

  return [...groups.values()].map((group) => {
    const head = group[0]
    const colorways = [...new Set(group.map((p) => p.colorway))]
    const sizes = [...new Set(group.flatMap((p) => p.sizes))]

    // One front image per colorway, then every distinct back/gallery shot.
    const media: ProductMedia[] = []
    const mediaIdByColorway = new Map<string, string>()
    group.forEach((p) => {
      if (!p.image || mediaIdByColorway.has(p.colorway)) return
      const id = `${head.id}-m${media.length}`
      media.push({ id, url: p.image, alt: `${head.emotion} — ${p.colorway}`, position: media.length })
      mediaIdByColorway.set(p.colorway, id)
    })
    const extras = [...new Set(group.flatMap((p) => [p.backImage, ...(p.galleryImages ?? [])]))]
    for (const url of extras) {
      if (!url || media.some((m) => m.url === url)) continue
      media.push({ id: `${head.id}-m${media.length}`, url, alt: `${head.emotion} — back`, position: media.length })
    }

    const options: ProductOption[] = [
      { name: 'Size', values: sizes, position: 1 },
      { name: 'Colorway', values: colorways, position: 2 },
    ]

    const defaults: VariantDefaults = {
      price: head.price,
      compareAtPrice: null,
      cost: null,
      barcode: null,
      trackInventory: true,
      allowBackorder: head.status === 'pre-order',
      weightGrams: null,
    }

    const name = `"${head.emotion}"`
    const shell: Product = {
      id: head.id,
      name,
      slug: slugify(head.emotion),
      emotion: head.emotion,
      description: head.description,
      collection: head.collection,
      productType: 'Tee',
      vendor: 'SCR!PTS',
      tags: [],
      publishedStatus: 'active',
      skuRoot: `${collectionCode(head.collection)}-${head.emotion.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase()}`,
      shipDate: head.shipDate,
      requiresShipping: true,
      seo: { title: name, description: head.description.slice(0, 155) },
      options,
      variants: [],
      media,
      fit: head.fit,
      fabric: head.fabric,
      fabricWeight: head.fabricWeight,
      modelNote: head.modelNote,
      careInstructions: head.careInstructions,
    }

    const variants = reconcileVariants(shell.id, shell.skuRoot, options, [], defaults).map((v, i) => ({
      ...v,
      stock: seedStock(i),
      imageId: mediaIdByColorway.get(v.optionValues[1]) ?? media[0]?.id ?? null,
    }))

    return { ...shell, variants }
  })
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- adminMigrate`
Expected: PASS, 16 tests.

- [ ] **Step 6: Commit**

```bash
git add lib/admin/migrate.ts lib/admin/config.ts __tests__/adminMigrate.test.ts
git commit -m "feat(admin): v2 to v3 catalog migration"
```

---

### Task 5: Catalog and store wiring

**Files:**
- Modify: `lib/products.ts`
- Modify: `lib/admin/store.tsx:22-40,80-100`
- Modify: `__tests__/adminStore.test.ts`
- Modify: `__tests__/adminSeeds.test.ts`

**Interfaces:**
- Consumes: `migrateProducts`, `isMigrated` (Task 4); `deriveAvailability`, `totalStock`, `reconcileVariants` (Tasks 2–3).
- Produces: `CYBER_LOVE_PRODUCTS: Product[]` and `BASEMENT_PRODUCTS: Product[]` (now v3, 4 and 2 entries); `LEGACY_SLUG_REDIRECTS: Record<string, string>`; `NEW_PRODUCT_DEFAULTS` covering v3 fields; `parseStoredState` migrating v2 payloads.

The 12 legacy literals stay in `lib/products.ts` as the source of truth — they are renamed to `LEGACY_CYBER_LOVE` / `LEGACY_BASEMENT` and typed `LegacyProduct`, and the exported v3 catalogs are produced by running `migrateProducts` over them at module load. Hand-authoring 6 v3 products with 40 variants would be unreviewable and would drift from the migration.

- [ ] **Step 1: Rewrite the catalog exports**

In `lib/products.ts`: change the import to `import type { LegacyProduct } from '@/lib/admin/migrate'` plus `import { migrateProducts } from '@/lib/admin/migrate'`, retype `SHARED` and both arrays against `LegacyProduct`, rename the exported arrays to `LEGACY_CYBER_LOVE` and `LEGACY_BASEMENT` (keeping all 12 literals byte-identical), and append:

```ts
export const CYBER_LOVE_PRODUCTS: Product[] = migrateProducts(LEGACY_CYBER_LOVE)
export const BASEMENT_PRODUCTS: Product[] = migrateProducts(LEGACY_BASEMENT)
export const ALL_PRODUCTS: Product[] = [...CYBER_LOVE_PRODUCTS, ...BASEMENT_PRODUCTS]

/** Every pre-merge slug → its merged destination. Drives the PDP redirects. */
export const LEGACY_SLUG_REDIRECTS: Record<string, string> = Object.fromEntries(
  [...LEGACY_CYBER_LOVE, ...LEGACY_BASEMENT].map((p) => [
    p.slug,
    p.emotion.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
  ]),
)

export function findProductBySlug(slug: string): Product | undefined {
  return ALL_PRODUCTS.find((p) => p.slug === slug)
}
```

Add `import type { Product } from '@/types/product'` alongside the existing type import.

- [ ] **Step 2: Write the failing catalog tests**

Append to `__tests__/adminSeeds.test.ts`:

```ts
import { ALL_PRODUCTS, BASEMENT_PRODUCTS, CYBER_LOVE_PRODUCTS, LEGACY_SLUG_REDIRECTS } from '@/lib/products'
import { deriveAvailability, totalStock } from '@/lib/admin/variants'

describe('migrated catalog', () => {
  it('folds twelve legacy products into six', () => {
    expect(CYBER_LOVE_PRODUCTS).toHaveLength(4)
    expect(BASEMENT_PRODUCTS).toHaveLength(2)
  })

  it('gives every product options, variants and media', () => {
    for (const p of ALL_PRODUCTS) {
      expect(p.options.length).toBeGreaterThan(0)
      expect(p.variants.length).toBeGreaterThan(0)
      expect(p.media.length).toBeGreaterThan(0)
    }
  })

  it('has unique slugs and globally unique variant skus', () => {
    expect(new Set(ALL_PRODUCTS.map((p) => p.slug)).size).toBe(ALL_PRODUCTS.length)
    const skus = ALL_PRODUCTS.flatMap((p) => p.variants.map((v) => v.sku))
    expect(new Set(skus).size).toBe(skus.length)
  })

  it('redirects all twelve legacy slugs to a live product', () => {
    const entries = Object.entries(LEGACY_SLUG_REDIRECTS)
    expect(entries).toHaveLength(12)
    for (const [, to] of entries) {
      expect(ALL_PRODUCTS.some((p) => p.slug === to)).toBe(true)
    }
  })

  it('ships stock, so nothing reads as sold out', () => {
    for (const p of ALL_PRODUCTS) {
      expect(totalStock(p)).toBeGreaterThan(0)
      expect(deriveAvailability(p)).not.toBe('sold-out')
    }
  })

  it('gives ARE YOU OKAY a three-value colorway axis', () => {
    const p = BASEMENT_PRODUCTS.find((x) => x.emotion === 'ARE YOU OKAY')
    expect(p?.options[1].values).toHaveLength(3)
    expect(p?.variants).toHaveLength(12)
  })
})
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm test -- adminSeeds`
Expected: FAIL — `LEGACY_SLUG_REDIRECTS` is not exported (before Step 1 lands) or a length mismatch.

- [ ] **Step 4: Update the store**

In `lib/admin/store.tsx`, replace `NEW_PRODUCT_DEFAULTS` with:

```ts
import { reconcileVariants, type VariantDefaults } from './variants'
import { isMigrated, migrateProducts, type LegacyProduct } from './migrate'

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
```

Delete `toggleProductStatus` and its export (availability is derived now; nothing toggles it). Replace it with:

```ts
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
```

In `parseStoredState`, after the existing array checks and blob-URL cleaning, run the migration:

```ts
    parsed.products = parsed.products.every(isMigrated)
      ? parsed.products
      : migrateProducts(parsed.products as unknown as LegacyProduct[])
```

The existing blob-URL scrub must now walk `media[]` instead of `image`/`backImage`:

```ts
    parsed.products = parsed.products.map((p) => ({
      ...p,
      media: (p.media ?? []).filter((m) => !m.url.startsWith('blob:')),
      variants: (p.variants ?? []).map((v) => ({ ...v })),
    }))
```

Update the provider's `add` / `update` / `remove` callbacks only where they reference removed fields; their signatures are unchanged.

- [ ] **Step 5: Update the store tests**

In `__tests__/adminStore.test.ts`, replace the `sample()` factory with a v3 one and swap `toggleProductStatus` for `togglePublished`:

```ts
import { blankProduct, setVariantStock, togglePublished } from '@/lib/admin/store'

const sample = (over: Partial<Product> = {}): Product => ({
  ...blankProduct('p1'), name: '"TEST"', slug: 'test', emotion: 'TEST', ...over,
})

describe('togglePublished', () => {
  it('flips active to draft and back', () => {
    const s = { products: [sample({ publishedStatus: 'active' })], orders: [] }
    const drafted = togglePublished(s, 'p1')
    expect(drafted.products[0].publishedStatus).toBe('draft')
    expect(togglePublished(drafted, 'p1').products[0].publishedStatus).toBe('active')
  })
})

describe('setVariantStock', () => {
  it('sets one variant and floors at zero', () => {
    const p = sample()
    const s = { products: [p], orders: [] }
    const vid = p.variants[0].id
    expect(setVariantStock(s, 'p1', vid, 9).products[0].variants[0].stock).toBe(9)
    expect(setVariantStock(s, 'p1', vid, -4).products[0].variants[0].stock).toBe(0)
  })
})

describe('parseStoredState', () => {
  it('migrates a v2 payload in place', () => {
    const v2 = JSON.stringify({
      products: [{
        id: '1', name: '"ANXIETY" — White', emotion: 'ANXIETY', colorway: 'White',
        price: 44, collection: '1-800-Cyber-Love', status: 'pre-order',
        image: '/a.png', backImage: '/b.png', slug: 'anxiety-white',
        description: 'x', shipDate: 'July 2026', sizes: ['S', 'M'],
        careInstructions: [], fit: '', fabric: '', fabricWeight: '', modelNote: '',
      }],
      orders: [],
    })
    const out = parseStoredState(v2)
    expect(out?.products[0].variants).toHaveLength(2)
    expect(out?.products[0].slug).toBe('anxiety')
  })
})
```

Delete the old `toggleProductStatus` describe block.

- [ ] **Step 6: Run the whole suite**

Run: `npm test`
Expected: PASS. `adminStats.test.ts` may need its product fixtures updated to the v3 shape — if `topProducts` reads `p.price`, point it at `p.variants[0].price` and update the test fixture to match.

- [ ] **Step 7: Commit**

```bash
git add lib/products.ts lib/admin/store.tsx lib/admin/stats.ts __tests__
git commit -m "refactor(admin): migrate catalog and store to the variant model"
```

---

### Task 6: Cart storage migration

**Files:**
- Create: `lib/cartStorage.ts`
- Create: `__tests__/cartStorage.test.ts`
- Modify: `lib/cart.tsx:1-100`

**Interfaces:**
- Consumes: `ALL_PRODUCTS` (Task 5).
- Produces: `StoredItem = { variantId: string; quantity: number }`; `VariantRef = { product: Product; variant: ProductVariant }`; `buildVariantIndex(products: Product[]): Map<string, VariantRef>`; `parseStoredCart(raw: string | null, index: Map<string, VariantRef>, legacy: LegacyIndex): StoredItem[]`; `buildLegacyIndex(products: Product[]): LegacyIndex`.

Old entries are `{id, size, quantity}` where `id` was the pre-merge product id. Those ids survive migration only for the group head (e.g. `'1'` for ANXIETY), so the legacy index maps `productId + ' ' + size` to a variant id, using the first colorway. Unresolvable entries are dropped, exactly as the current code drops unknown ids.

- [ ] **Step 1: Write the failing tests**

Create `__tests__/cartStorage.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { ALL_PRODUCTS } from '@/lib/products'
import { buildLegacyIndex, buildVariantIndex, parseStoredCart } from '@/lib/cartStorage'

const index = buildVariantIndex(ALL_PRODUCTS)
const legacy = buildLegacyIndex(ALL_PRODUCTS)

describe('buildVariantIndex', () => {
  it('indexes every variant of every product', () => {
    expect(index.size).toBe(ALL_PRODUCTS.reduce((n, p) => n + p.variants.length, 0))
  })

  it('resolves a variant back to its product', () => {
    const anxiety = ALL_PRODUCTS.find((p) => p.slug === 'anxiety')!
    expect(index.get(anxiety.variants[0].id)?.product.slug).toBe('anxiety')
  })
})

describe('parseStoredCart', () => {
  it('returns nothing for null or junk', () => {
    expect(parseStoredCart(null, index, legacy)).toEqual([])
    expect(parseStoredCart('not json', index, legacy)).toEqual([])
    expect(parseStoredCart('{}', index, legacy)).toEqual([])
  })

  it('keeps valid v3 entries', () => {
    const anxiety = ALL_PRODUCTS.find((p) => p.slug === 'anxiety')!
    const vid = anxiety.variants[0].id
    const raw = JSON.stringify([{ variantId: vid, quantity: 2 }])
    expect(parseStoredCart(raw, index, legacy)).toEqual([{ variantId: vid, quantity: 2 }])
  })

  it('drops entries for unknown variants and non-positive quantities', () => {
    const anxiety = ALL_PRODUCTS.find((p) => p.slug === 'anxiety')!
    const raw = JSON.stringify([
      { variantId: 'gone', quantity: 1 },
      { variantId: anxiety.variants[0].id, quantity: 0 },
    ])
    expect(parseStoredCart(raw, index, legacy)).toEqual([])
  })

  it('migrates a legacy {id,size} entry to a variant id', () => {
    const raw = JSON.stringify([{ id: '1', size: 'M', quantity: 3 }])
    const out = parseStoredCart(raw, index, legacy)
    expect(out).toHaveLength(1)
    expect(out[0].quantity).toBe(3)
    const ref = index.get(out[0].variantId)!
    expect(ref.product.slug).toBe('anxiety')
    expect(ref.variant.optionValues).toContain('M')
  })

  it('drops a legacy entry whose product no longer exists', () => {
    const raw = JSON.stringify([{ id: 'nope', size: 'M', quantity: 1 }])
    expect(parseStoredCart(raw, index, legacy)).toEqual([])
  })

  it('drops a legacy entry whose size no longer exists', () => {
    const raw = JSON.stringify([{ id: '1', size: 'XXL', quantity: 1 }])
    expect(parseStoredCart(raw, index, legacy)).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- cartStorage`
Expected: FAIL — unresolved import.

- [ ] **Step 3: Implement**

Create `lib/cartStorage.ts`:

```ts
import type { Product, ProductVariant } from '@/types/product'

export interface StoredItem { variantId: string; quantity: number }
export interface VariantRef { product: Product; variant: ProductVariant }
export type LegacyIndex = Map<string, string>

export function buildVariantIndex(products: Product[]): Map<string, VariantRef> {
  const out = new Map<string, VariantRef>()
  for (const product of products) {
    for (const variant of product.variants) out.set(variant.id, { product, variant })
  }
  return out
}

/**
 * Maps the pre-merge `productId + size` key onto a variant id, choosing the
 * first colorway. Product ids survive the merge for the group head, which is
 * enough to rescue most live carts.
 */
export function buildLegacyIndex(products: Product[]): LegacyIndex {
  const out: LegacyIndex = new Map()
  for (const product of products) {
    const sizeAxis = product.options.findIndex((o) => o.name === 'Size')
    if (sizeAxis < 0) continue
    for (const variant of product.variants) {
      const key = `${product.id} ${variant.optionValues[sizeAxis]}`
      if (!out.has(key)) out.set(key, variant.id)
    }
  }
  return out
}

interface LegacyStoredItem { id: string; size: string; quantity: number }

export function parseStoredCart(
  raw: string | null,
  index: Map<string, VariantRef>,
  legacy: LegacyIndex,
): StoredItem[] {
  if (!raw) return []
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }
  if (!Array.isArray(parsed)) return []

  const out: StoredItem[] = []
  for (const entry of parsed as Array<Partial<StoredItem & LegacyStoredItem>>) {
    const quantity = Number(entry?.quantity)
    if (!Number.isFinite(quantity) || quantity <= 0) continue

    if (typeof entry.variantId === 'string') {
      if (index.has(entry.variantId)) out.push({ variantId: entry.variantId, quantity })
      continue
    }
    if (typeof entry.id === 'string' && typeof entry.size === 'string') {
      const variantId = legacy.get(`${entry.id} ${entry.size}`)
      if (variantId) out.push({ variantId, quantity })
    }
  }
  return out
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- cartStorage`
Expected: PASS, 8 tests.

- [ ] **Step 5: Rewire the cart provider**

In `lib/cart.tsx`, replace the catalog block and `loadStored` with the new module, and rekey the context on `variantId`:

```ts
import { ALL_PRODUCTS } from '@/lib/products'
import { buildLegacyIndex, buildVariantIndex, parseStoredCart, type StoredItem } from '@/lib/cartStorage'
import type { Product, ProductVariant } from '@/types/product'

const VARIANTS = buildVariantIndex(ALL_PRODUCTS)
const LEGACY = buildLegacyIndex(ALL_PRODUCTS)

export interface CartItem {
  product: Product
  variant: ProductVariant
  quantity: number
}

function loadStored(): CartItem[] {
  if (typeof window === 'undefined') return []
  return parseStoredCart(window.localStorage.getItem(STORAGE_KEY), VARIANTS, LEGACY)
    .map(({ variantId, quantity }) => {
      const ref = VARIANTS.get(variantId)!
      return { product: ref.product, variant: ref.variant, quantity }
    })
}
```

`add`, `remove`, `increment`, and `decrement` change from `(productId, size)` to `(variantId)`; `add` becomes `(product: Product, variant: ProductVariant) => void`. The persist effect writes `{ variantId: i.variant.id, quantity: i.quantity }`.

- [ ] **Step 6: Update the cart page**

In `app/cart/page.tsx`, replace `item.size` with `variantTitle(item.variant.optionValues)` (import from `@/lib/admin/variants`), `item.product.price` with `item.variant.price`, `item.product.image` with the product's media resolved by `item.variant.imageId` (falling back to `media[0]?.url`), and the `remove`/`increment`/`decrement` call sites with `item.variant.id`.

- [ ] **Step 7: Verify**

Run: `npm test` — Expected: PASS.
Run: `npm run build` — Expected: succeeds. Any remaining type error will be in `ProductDetail.tsx` or the product cards; leave those for Tasks 7–8 only if the build still passes, otherwise stub the minimum to compile and finish them in their own tasks.

- [ ] **Step 8: Commit**

```bash
git add lib/cartStorage.ts lib/cart.tsx app/cart/page.tsx __tests__/cartStorage.test.ts
git commit -m "feat(cart): key the cart on variant ids with legacy migration"
```

---

### Task 7: Product cards and slug redirects

**Files:**
- Modify: `components/ProductCard.tsx`, `components/BasementProductCard.tsx`
- Modify: `app/products/[slug]/page.tsx`
- Modify: `app/page.tsx:88`, `app/inventory/page.tsx`
- Modify: `lib/admin/mockTraffic.ts:42-44`

**Interfaces:**
- Consumes: `ALL_PRODUCTS`, `LEGACY_SLUG_REDIRECTS`, `findProductBySlug` (Task 5); `deriveAvailability` (Task 3).
- Produces: no new exports. `ProductDetail` continues to receive a single `product: Product` prop.

- [ ] **Step 1: Redirect legacy slugs**

In `app/products/[slug]/page.tsx`, replace the `ALL_PRODUCTS` local with the catalog export and add the redirect before the not-found branch:

```tsx
import { redirect, notFound } from 'next/navigation'
import { ALL_PRODUCTS, LEGACY_SLUG_REDIRECTS, findProductBySlug } from '@/lib/products'

export function generateStaticParams() {
  return ALL_PRODUCTS.map((p) => ({ slug: p.slug }))
}

// …inside the page component, after resolving `slug`:
const product = findProductBySlug(slug)
if (!product) {
  const merged = LEGACY_SLUG_REDIRECTS[slug]
  if (merged) redirect(`/products/${merged}`)
  notFound()
}
```

- [ ] **Step 2: Point the cards at media and derived availability**

In both `ProductCard.tsx` and `BasementProductCard.tsx`, replace `product.image` with `product.media[0]?.url ?? null` and `product.backImage` with `product.media[1]?.url ?? null`. Where either card reads `product.status`, call `deriveAvailability(product)` instead. Where either shows a price, use `product.variants[0]?.price ?? 0`.

- [ ] **Step 3: Fix the remaining catalog consumers**

`app/page.tsx:88` picks a random product for the hero — it only needs the image, so swap `p.image` for `p.media[0]?.url`. `app/inventory/page.tsx` passes `CYBER_LOVE_PRODUCTS` straight to `InventoryGrid`; no change beyond whatever the grid reads (apply the same image/price/status swaps).

- [ ] **Step 4: Update mock traffic paths**

In `lib/admin/mockTraffic.ts`, change `/products/rage-black` → `/products/rage`, `/products/love-white` → `/products/love`, and any other pre-merge product path to its merged slug. Merge the view counts of paths that collapse onto the same slug.

- [ ] **Step 5: Verify**

Run: `npm run build` — Expected: succeeds with no type errors.
Manual: `npm run dev`, then visit `/products/anxiety-white` and confirm it redirects to `/products/anxiety`; visit `/products/are-you-okay-black` and confirm it redirects to `/products/are-you-okay`. Confirm the shop grid still renders images.

- [ ] **Step 6: Commit**

```bash
git add components/ProductCard.tsx components/BasementProductCard.tsx app/products app/page.tsx app/inventory lib/admin/mockTraffic.ts
git commit -m "feat(shop): merged product slugs with legacy redirects"
```

---

### Task 8: PDP colorway swatches and stock-aware sizes

**Files:**
- Modify: `app/products/[slug]/ProductDetail.tsx:21-40,180-220`

**Interfaces:**
- Consumes: `variantTitle`, `deriveAvailability` (Tasks 2–3); `LOW_STOCK_THRESHOLD` (Task 4); cart `add(product, variant)` (Task 6).
- Produces: no new exports.

- [ ] **Step 1: Derive the option axes and selection state**

Replace the `selectedSize` state with axis-aware selection near the top of the component:

```tsx
const sizeAxis = product.options.findIndex((o) => o.name === 'Size')
const colorAxis = product.options.findIndex((o) => o.name === 'Colorway')
const colorways = colorAxis >= 0 ? product.options[colorAxis].values : []

const [colorway, setColorway] = useState<string>(colorways[0] ?? '')
const [size, setSize] = useState<string | null>(null)

const variantFor = (s: string) =>
  product.variants.find((v) =>
    (sizeAxis < 0 || v.optionValues[sizeAxis] === s) &&
    (colorAxis < 0 || v.optionValues[colorAxis] === colorway))

const selected = size ? variantFor(size) : undefined
const sellable = (v: ProductVariant | undefined) =>
  !!v && (!v.trackInventory || v.stock > 0 || v.allowBackorder)

// Gallery follows the chosen colorway.
const heroUrl =
  product.media.find((m) => m.id === variantFor(size ?? product.options[sizeAxis]?.values[0] ?? '')?.imageId)?.url
  ?? product.media[0]?.url
  ?? null
```

Reset `size` to `null` whenever `colorway` changes, so a size that is sold out in the new colorway is never left selected:

```tsx
useEffect(() => { setSize(null) }, [colorway])
```

- [ ] **Step 2: Render the swatch row**

Insert directly above the existing Size block (around line 184), rendering only when there is more than one colorway:

```tsx
{colorways.length > 1 && (
  <div className="mb-5">
    <span className="block text-[11px] uppercase tracking-[0.14em] text-grey mb-2">
      Colorway — {colorway}
    </span>
    <div className="flex gap-2" role="radiogroup" aria-label="Colorway">
      {colorways.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={colorway === c}
          aria-label={c}
          onClick={() => setColorway(c)}
          className={`h-11 px-4 flex items-center text-[12px] font-bold tracking-[0.04em] border rounded transition-colors duration-150 ${
            colorway === c ? sizeSelected : sizeUnselected
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 3: Make the size buttons stock-aware**

Replace the `product.sizes.map(...)` block with:

```tsx
{(sizeAxis >= 0 ? product.options[sizeAxis].values : []).map((s) => {
  const v = variantFor(s)
  const ok = sellable(v)
  return (
    <button
      key={s}
      type="button"
      disabled={!ok}
      aria-disabled={!ok}
      onClick={() => setSize(s === size ? null : s)}
      className={`w-[64px] h-[44px] flex items-center justify-center text-[12px] font-bold tracking-[0.04em] border rounded transition-colors duration-150 ${
        size === s ? sizeSelected : sizeUnselected
      } ${ok ? '' : 'opacity-40 line-through cursor-not-allowed'}`}
    >
      {s}
    </button>
  )
})}
```

Below the row, show the low-stock nudge:

```tsx
{selected && selected.trackInventory && selected.stock > 0 && selected.stock <= LOW_STOCK_THRESHOLD && (
  <p className="mt-2 text-[11px] text-pink-deep">Only {selected.stock} left</p>
)}
```

- [ ] **Step 4: Rewire add-to-bag and price**

The add handler becomes `add(product, selected)` guarded on `selected && sellable(selected)`. The toast reads `` `${product.emotion} (${variantTitle(selected.optionValues)}) added to bag` ``. The displayed price becomes `selected?.price ?? product.variants[0]?.price ?? 0`. The button's disabled condition becomes `!selected`, and its label `selected ? 'Add to Bag' : 'Select a Size'`.

Replace the colorway sentence at line 226 with `{colorway} colorway.` so it tracks the selection.

- [ ] **Step 5: Verify**

Run: `npm run build` — Expected: succeeds.
Manual: `npm run dev`, open `/products/are-you-okay`. Confirm three swatches; switching swatch swaps the hero image and clears the size selection. Set one variant's stock to 0 in the admin, reload, confirm the size renders struck-through and unclickable. Set another to 3, confirm "Only 3 left". Add to bag, open `/cart`, confirm the line reads `M / Army Green` at the variant price.

- [ ] **Step 6: Commit**

```bash
git add app/products/\[slug\]/ProductDetail.tsx
git commit -m "feat(shop): colorway swatches and stock-aware size picker"
```

---

### Task 9: Editor shell and routes

**Files:**
- Create: `app/office-scr1pts-x7k2/products/new/page.tsx`
- Create: `app/office-scr1pts-x7k2/products/[id]/edit/page.tsx`
- Create: `components/admin/product/ProductForm.tsx`

**Interfaces:**
- Consumes: `blankProduct`, `NEW_VARIANT_DEFAULTS`, `useAdmin` (Task 5).
- Produces: `ProductForm` default export, props `{ initial: Product; mode: 'create' | 'edit' }`. Section components created in Tasks 10–11 take `{ product: Product; onChange: (next: Product) => void }` — that is the contract every section follows.

`ProductForm` holds a single `Product` in state. Every section receives it and reports a whole new `Product` back. This keeps the option/variant functions from Task 3 usable directly, with no field-by-field plumbing.

- [ ] **Step 1: Build the form shell**

Create `components/admin/product/ProductForm.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { adminPath } from '@/lib/admin/config'
import { useAdmin } from '@/lib/admin/store'
import type { Product } from '@/types/product'

export interface SectionProps {
  product: Product
  onChange: (next: Product) => void
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'product'

export default function ProductForm({ initial, mode }: { initial: Product; mode: 'create' | 'edit' }) {
  const { add, update } = useAdmin()
  const router = useRouter()
  const [product, setProduct] = useState<Product>(initial)
  const [errors, setErrors] = useState<{ name?: string }>({})

  const dirty = useMemo(() => JSON.stringify(product) !== JSON.stringify(initial), [product, initial])

  const onChange = useCallback((next: Product) => setProduct(next), [])

  const save = () => {
    if (!product.name.trim()) { setErrors({ name: 'Name is required' }); return }
    const built: Product = {
      ...product,
      name: product.name.trim(),
      slug: product.slug.trim() || slugify(product.emotion || product.name),
    }
    if (mode === 'create') add(built)
    else update(built)
    router.push(adminPath('products'))
  }

  const discard = () => {
    if (dirty && !window.confirm('Discard unsaved changes?')) return
    router.push(adminPath('products'))
  }

  return (
    <div className="pb-28">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[28px] uppercase tracking-[0.04em]" style={{ fontFamily: 'var(--font-bebas)' }}>
          {mode === 'create' ? 'New Product' : product.name || 'Edit Product'}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="space-y-6">
          {/* Sections 1-7 mount here in Tasks 10-11 */}
          {errors.name && <p className="text-[11px] text-pink-deep">{errors.name}</p>}
        </div>
        <div className="space-y-6">
          {/* SidebarSection mounts here in Task 10 */}
        </div>
      </div>

      {dirty && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-grey/25 bg-[#141414]/95 backdrop-blur px-5 py-3 flex items-center justify-end gap-3">
          <span className="mr-auto text-[12px] text-grey">Unsaved changes</span>
          <button type="button" onClick={discard} className="px-4 py-2 rounded-lg border border-grey/30 text-[13px] text-grey hover:text-paper">
            Discard
          </button>
          <button type="button" onClick={save} className="px-4 py-2 rounded-lg bg-pink text-[13px] font-bold text-black">
            Save
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add the create route**

Create `app/office-scr1pts-x7k2/products/new/page.tsx`:

```tsx
'use client'

import { useMemo } from 'react'
import ProductForm from '@/components/admin/product/ProductForm'
import { blankProduct } from '@/lib/admin/store'

export default function NewProductPage() {
  const initial = useMemo(() => blankProduct(crypto.randomUUID()), [])
  return <ProductForm initial={initial} mode="create" />
}
```

- [ ] **Step 3: Add the edit route**

Create `app/office-scr1pts-x7k2/products/[id]/edit/page.tsx`:

```tsx
'use client'

import { use } from 'react'
import Link from 'next/link'
import ProductForm from '@/components/admin/product/ProductForm'
import { adminPath } from '@/lib/admin/config'
import { useAdmin } from '@/lib/admin/store'

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { state } = useAdmin()
  const product = state.products.find((p) => p.id === id)

  if (!product) {
    return (
      <div className="py-16 text-center">
        <p className="text-grey text-[13px] mb-4">That product no longer exists.</p>
        <Link href={adminPath('products')} className="text-pink text-[13px] underline">Back to products</Link>
      </div>
    )
  }
  return <ProductForm initial={product} mode="edit" />
}
```

- [ ] **Step 4: Verify**

Run: `npm run build` — Expected: succeeds.
Manual: `npm run dev`, visit `/office-scr1pts-x7k2/products/new`. Confirm the heading renders and no save bar is visible. Visit an edit route with a bad id and confirm the empty state.

- [ ] **Step 5: Commit**

```bash
git add components/admin/product/ProductForm.tsx app/office-scr1pts-x7k2/products
git commit -m "feat(admin): full-page product editor shell and routes"
```

---

### Task 10: Editor sections

**Files:**
- Create: `components/admin/product/TitleSection.tsx`, `MediaSection.tsx`, `PricingSection.tsx`, `InventorySection.tsx`, `ShippingSection.tsx`, `SeoSection.tsx`, `SidebarSection.tsx`
- Modify: `components/admin/product/ProductForm.tsx`

**Interfaces:**
- Consumes: `SectionProps` (Task 9); `ImageDrop` (`components/admin/ImageDrop.tsx`, props `{ label, value, onChange, compact? }`).
- Produces: seven default-exported components, each taking `SectionProps`.

Pricing, inventory, and shipping fields live on variants, not the product. These sections edit the **defaults**, writing across every variant that has not been individually overridden — represented simply as "write the value to all variants". Per-variant overrides happen in the variant table (Task 11).

- [ ] **Step 1: Add a shared section chrome**

Add to the top of `ProductForm.tsx` and export it:

```tsx
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-grey/25 bg-[#141414] p-5">
      <h2 className="text-[13px] uppercase tracking-[0.14em] text-grey mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

export const inputCls =
  'w-full rounded-lg border border-grey/30 bg-[#101010] px-3 py-2 text-[13px] text-paper placeholder:text-grey/60 focus:outline-none focus:border-pink'
export const labelCls = 'block text-[11px] uppercase tracking-[0.14em] text-grey mb-1.5'
```

- [ ] **Step 2: TitleSection**

```tsx
'use client'
import { Section, inputCls, labelCls, type SectionProps } from './ProductForm'

export default function TitleSection({ product, onChange }: SectionProps) {
  return (
    <Section title="Title & description">
      <div>
        <label className={labelCls} htmlFor="p-name">Product name</label>
        <input id="p-name" className={inputCls} value={product.name}
          onChange={(e) => onChange({ ...product, name: e.target.value })} placeholder='"ANXIETY"' />
      </div>
      <div>
        <label className={labelCls} htmlFor="p-emotion">Emotion</label>
        <input id="p-emotion" className={inputCls} value={product.emotion}
          onChange={(e) => onChange({ ...product, emotion: e.target.value.toUpperCase() })} placeholder="ANXIETY" />
      </div>
      <div>
        <label className={labelCls} htmlFor="p-desc">Description</label>
        <textarea id="p-desc" rows={5} className={inputCls} value={product.description}
          onChange={(e) => onChange({ ...product, description: e.target.value })} />
      </div>
    </Section>
  )
}
```

- [ ] **Step 3: MediaSection**

Renders `product.media` as a grid of `ImageDrop` tiles plus one empty tile for adding. Positions 0 and 1 are labelled Front and Back. Reordering uses explicit left/right buttons rather than drag — keyboard-accessible and far less code:

```tsx
'use client'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import ImageDrop from '../ImageDrop'
import { Section, inputCls, type SectionProps } from './ProductForm'
import type { ProductMedia } from '@/types/product'

const renumber = (media: ProductMedia[]) => media.map((m, i) => ({ ...m, position: i }))
const labelFor = (i: number) => (i === 0 ? 'Front' : i === 1 ? 'Back' : `Shot ${i + 1}`)

export default function MediaSection({ product, onChange }: SectionProps) {
  const set = (media: ProductMedia[]) => onChange({ ...product, media: renumber(media) })

  const move = (i: number, by: number) => {
    const next = [...product.media]
    const j = i + by
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    set(next)
  }

  const removeAt = (i: number) => {
    const gone = product.media[i]
    onChange({
      ...product,
      media: renumber(product.media.filter((_, idx) => idx !== i)),
      // Any variant pointing at the deleted image falls back to unset.
      variants: product.variants.map((v) => (v.imageId === gone.id ? { ...v, imageId: null } : v)),
    })
  }

  return (
    <Section title="Media">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {product.media.map((m, i) => (
          <div key={m.id} className="space-y-1.5">
            <ImageDrop label={labelFor(i)} value={m.url} compact
              onChange={(url) => (url ? set(product.media.map((x) => (x.id === m.id ? { ...x, url } : x))) : removeAt(i))} />
            <input className={inputCls} value={m.alt} placeholder="Alt text" aria-label={`Alt text for ${labelFor(i)}`}
              onChange={(e) => set(product.media.map((x) => (x.id === m.id ? { ...x, alt: e.target.value } : x)))} />
            <div className="flex gap-1">
              <button type="button" aria-label={`Move ${labelFor(i)} earlier`} onClick={() => move(i, -1)}
                className="p-1.5 text-grey hover:text-paper"><ArrowLeft size={14} /></button>
              <button type="button" aria-label={`Move ${labelFor(i)} later`} onClick={() => move(i, 1)}
                className="p-1.5 text-grey hover:text-paper"><ArrowRight size={14} /></button>
            </div>
          </div>
        ))}
        <ImageDrop label="Add" value={null} compact
          onChange={(url) => url && set([...product.media, {
            id: `${product.id}-m${Date.now()}`, url, alt: '', position: product.media.length,
          }])} />
      </div>
      <p className="text-[11px] text-grey">
        Images are session-only object URLs — they do not survive a reload. Positions 1 and 2 are the front and back shots the shop grid uses.
      </p>
    </Section>
  )
}
```

- [ ] **Step 4: PricingSection**

Writes across all variants and shows margin from the first variant:

```tsx
'use client'
import { Section, inputCls, labelCls, type SectionProps } from './ProductForm'
import type { ProductVariant } from '@/types/product'

const num = (s: string): number | null => {
  const n = Number(s)
  return s.trim() === '' || Number.isNaN(n) ? null : n
}

export default function PricingSection({ product, onChange }: SectionProps) {
  const first = product.variants[0]
  const setAll = (patch: Partial<ProductVariant>) =>
    onChange({ ...product, variants: product.variants.map((v) => ({ ...v, ...patch })) })

  const margin =
    first && first.cost != null && first.price > 0
      ? Math.round(((first.price - first.cost) / first.price) * 100)
      : null

  return (
    <Section title="Pricing">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className={labelCls} htmlFor="p-price">Price (USD)</label>
          <input id="p-price" inputMode="decimal" className={inputCls} value={first?.price ?? ''}
            onChange={(e) => setAll({ price: num(e.target.value) ?? 0 })} />
        </div>
        <div>
          <label className={labelCls} htmlFor="p-compare">Compare at</label>
          <input id="p-compare" inputMode="decimal" className={inputCls} value={first?.compareAtPrice ?? ''}
            onChange={(e) => setAll({ compareAtPrice: num(e.target.value) })} />
        </div>
        <div>
          <label className={labelCls} htmlFor="p-cost">Cost per item</label>
          <input id="p-cost" inputMode="decimal" className={inputCls} value={first?.cost ?? ''}
            onChange={(e) => setAll({ cost: num(e.target.value) })} />
        </div>
      </div>
      <p className="text-[12px] text-grey">
        ${(first?.price ?? 0).toFixed(2)}
        {margin != null && <> · {margin}% margin</>}
      </p>
      <p className="text-[11px] text-grey">Applies to every variant. Override individual rows in the variants table.</p>
    </Section>
  )
}
```

- [ ] **Step 5: InventorySection, ShippingSection, SeoSection, SidebarSection**

`InventorySection` edits `product.skuRoot` (a plain product field) plus `trackInventory` and `allowBackorder` written across all variants, using the same `setAll` helper pattern as Step 4. Add a "Regenerate SKUs" button that calls `reconcileVariants(product.id, product.skuRoot, product.options, [], defaultsFrom(product))` — passing `[]` as `existing` deliberately, so every SKU is rebuilt from the new root; guard it behind `window.confirm('Regenerate every SKU from the root? Hand-edited SKUs will be replaced.')`.

`ShippingSection` edits `weightGrams` across all variants using the same pattern, plus a `requiresShipping` checkbox on the product itself.

`SeoSection` edits `product.seo.title`, `product.seo.description`, and `product.slug`, and renders a preview block: slug as a green URL line, title in blue, description in grey.

`SidebarSection` edits `publishedStatus` (select: Draft / Active / Archived), `collection` (datalist of existing collections from `useAdmin().state.products`), `productType`, `vendor`, `tags` (comma-separated input split on save), and `shipDate`. It also shows a read-only derived availability chip from `deriveAvailability(product)`.

- [ ] **Step 6: Mount them all**

In `ProductForm.tsx`, fill the two column placeholders:

```tsx
<TitleSection product={product} onChange={onChange} />
<MediaSection product={product} onChange={onChange} />
<PricingSection product={product} onChange={onChange} />
<InventorySection product={product} onChange={onChange} />
{/* VariantsSection mounts here in Task 11 */}
<ShippingSection product={product} onChange={onChange} />
<SeoSection product={product} onChange={onChange} />
```

and `<SidebarSection product={product} onChange={onChange} />` in the sidebar column.

- [ ] **Step 7: Verify**

Run: `npm run build` — Expected: succeeds.
Manual: at `/office-scr1pts-x7k2/products/new`, type a name and confirm the save bar appears. Set a cost and confirm the margin readout. Add two images and reorder them. Save, and confirm the product appears in the list.

- [ ] **Step 8: Commit**

```bash
git add components/admin/product
git commit -m "feat(admin): product editor sections"
```

---

### Task 11: Options editor and variant table

**Files:**
- Create: `components/admin/product/OptionsEditor.tsx`, `VariantTable.tsx`, `VariantCards.tsx`
- Modify: `components/admin/product/ProductForm.tsx`

**Interfaces:**
- Consumes: every option function from Task 3; `useIsPhone` (`lib/admin/useIsPhone.ts`); `LOW_STOCK_THRESHOLD` (Task 4); `SectionProps` (Task 9).
- Produces: three default-exported components taking `SectionProps`.

- [ ] **Step 1: OptionsEditor**

One row per axis: the axis name, its values as removable chips, an add-value input, and an axis-level remove. Renaming happens by clicking a chip, which swaps it for an input. Every destructive edit confirms with the impact numbers:

```tsx
'use client'
import { X } from 'lucide-react'
import { useState } from 'react'
import {
  MAX_OPTIONS, addOption, addOptionValue, impactOfRemoval,
  removeOption, removeOptionValue, renameOptionValue,
} from '@/lib/admin/variants'
import { NEW_VARIANT_DEFAULTS } from '@/lib/admin/store'
import { inputCls, labelCls, type SectionProps } from './ProductForm'

const D = NEW_VARIANT_DEFAULTS

export default function OptionsEditor({ product, onChange }: SectionProps) {
  const [drafts, setDrafts] = useState<Record<number, string>>({})
  const [editing, setEditing] = useState<{ axis: number; value: string } | null>(null)

  const confirmRemoveValue = (axis: number, value: string) => {
    const { variants, stock } = impactOfRemoval(product, axis, value)
    if (!window.confirm(`Remove "${value}"? This deletes ${variants} variant${variants === 1 ? '' : 's'} holding ${stock} in stock.`)) return
    onChange(removeOptionValue(product, axis, value, D))
  }

  return (
    <div className="space-y-3">
      {product.options.map((opt, axis) => (
        <div key={opt.name} className="rounded-lg border border-grey/25 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className={labelCls + ' mb-0'}>{opt.name}</span>
            <button type="button" className="text-[11px] text-grey hover:text-pink-deep"
              onClick={() => {
                if (window.confirm(`Remove the ${opt.name} axis? Only variants on "${opt.values[0]}" are kept.`))
                  onChange(removeOption(product, axis, D))
              }}>Remove axis</button>
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            {opt.values.map((v) =>
              editing?.axis === axis && editing.value === v ? (
                <input key={v} autoFocus defaultValue={v} className={inputCls + ' w-32'}
                  onBlur={(e) => { onChange(renameOptionValue(product, axis, v, e.target.value, D)); setEditing(null) }}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }} />
              ) : (
                <span key={v} className="inline-flex items-center gap-1 rounded-full border border-grey/30 px-3 py-1 text-[12px]">
                  <button type="button" onClick={() => setEditing({ axis, value: v })} className="hover:text-pink">{v}</button>
                  <button type="button" aria-label={`Remove ${v}`} onClick={() => confirmRemoveValue(axis, v)}
                    className="text-grey hover:text-pink-deep"><X size={12} /></button>
                </span>
              ))}
          </div>
          <input className={inputCls} placeholder={`Add a ${opt.name.toLowerCase()} value and press Enter`}
            value={drafts[axis] ?? ''}
            onChange={(e) => setDrafts({ ...drafts, [axis]: e.target.value })}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              onChange(addOptionValue(product, axis, drafts[axis] ?? '', D))
              setDrafts({ ...drafts, [axis]: '' })
            }} />
        </div>
      ))}

      {product.options.length < MAX_OPTIONS && (
        <button type="button" className="text-[12px] text-pink hover:underline"
          onClick={() => {
            const name = window.prompt('Option name (e.g. Colorway)')?.trim()
            if (name) onChange(addOption(product, name, ['Default'], D))
          }}>+ Add another option</button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: VariantTable**

Groups rows by the first axis, collapsible, with inline stock/price/SKU editing, row selection, and bulk edit:

```tsx
'use client'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { LOW_STOCK_THRESHOLD } from '@/lib/admin/config'
import { variantTitle } from '@/lib/admin/variants'
import { inputCls, type SectionProps } from './ProductForm'
import type { ProductVariant } from '@/types/product'

export default function VariantTable({ product, onChange }: SectionProps) {
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const patch = (id: string, p: Partial<ProductVariant>) =>
    onChange({ ...product, variants: product.variants.map((v) => (v.id === id ? { ...v, ...p } : v)) })

  const bulk = (p: Partial<ProductVariant>) =>
    onChange({ ...product, variants: product.variants.map((v) => (selected.has(v.id) ? { ...v, ...p } : v)) })

  const groups = new Map<string, ProductVariant[]>()
  for (const v of product.variants) {
    const key = v.optionValues[0] ?? 'All'
    groups.set(key, [...(groups.get(key) ?? []), v])
  }

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  return (
    <div>
      <div className="flex items-center gap-3 mb-3 text-[12px] text-grey">
        <span>{product.variants.length} variants</span>
        {selected.size > 0 && (
          <>
            <span>· {selected.size} selected</span>
            <button type="button" className="text-pink hover:underline" onClick={() => {
              const v = window.prompt('Set stock for selected variants')
              if (v != null && !Number.isNaN(Number(v))) bulk({ stock: Math.max(0, Number(v)) })
            }}>Set stock</button>
            <button type="button" className="text-pink hover:underline" onClick={() => {
              const v = window.prompt('Set price for selected variants')
              if (v != null && !Number.isNaN(Number(v))) bulk({ price: Math.max(0, Number(v)) })
            }}>Set price</button>
          </>
        )}
      </div>

      <div className="rounded-lg border border-grey/25 overflow-hidden">
        {[...groups.entries()].map(([key, rows]) => {
          const shown = open[key] ?? true
          return (
            <div key={key} className="border-b border-grey/20 last:border-0">
              <button type="button" onClick={() => setOpen({ ...open, [key]: !shown })}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-white/[0.03]">
                {shown ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span className="font-bold">{key}</span>
                <span className="text-grey text-[12px]">({rows.length})</span>
                <span className="ml-auto text-grey text-[12px]">
                  {rows.reduce((n, v) => n + v.stock, 0)} in stock
                </span>
              </button>
              {shown && rows.map((v) => (
                <div key={v.id} className="grid grid-cols-[24px_1fr_140px_80px_90px] gap-2 items-center px-3 py-2 border-t border-grey/15">
                  <input type="checkbox" aria-label={`Select ${variantTitle(v.optionValues)}`}
                    checked={selected.has(v.id)} onChange={() => toggle(v.id)} />
                  <span className="text-[13px] truncate">{variantTitle(v.optionValues)}</span>
                  <input className={inputCls + ' py-1'} value={v.sku} aria-label={`SKU for ${variantTitle(v.optionValues)}`}
                    onChange={(e) => patch(v.id, { sku: e.target.value })} />
                  <input className={`${inputCls} py-1 ${v.stock === 0 ? 'text-pink-deep' : v.stock <= LOW_STOCK_THRESHOLD ? 'text-amber-400' : ''}`}
                    inputMode="numeric" value={v.stock} aria-label={`Stock for ${variantTitle(v.optionValues)}`}
                    onChange={(e) => patch(v.id, { stock: Math.max(0, Number(e.target.value) || 0) })} />
                  <input className={inputCls + ' py-1'} inputMode="decimal" value={v.price}
                    aria-label={`Price for ${variantTitle(v.optionValues)}`}
                    onChange={(e) => patch(v.id, { price: Math.max(0, Number(e.target.value) || 0) })} />
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: VariantCards**

The phone view: one card per variant with `variantTitle` as the heading and full-width stock and price inputs (min-height 44px), plus the SKU as a small monospace line. Same `patch` helper, no selection or bulk edit.

- [ ] **Step 4: Mount the variants section**

In `ProductForm.tsx`, replace the Task 11 placeholder:

```tsx
<Section title="Variants">
  <OptionsEditor product={product} onChange={onChange} />
  {isPhone
    ? <VariantCards product={product} onChange={onChange} />
    : <VariantTable product={product} onChange={onChange} />}
</Section>
```

with `const isPhone = useIsPhone()` at the top of `ProductForm`.

- [ ] **Step 5: Verify**

Run: `npm run build` — Expected: succeeds.
Manual, at `/office-scr1pts-x7k2/products/<id>/edit` for ARE YOU OKAY:
1. Confirm 12 variant rows grouped under S / M / L / XL.
2. Set S / White stock to 12. Add a colorway value "Pink" — confirm 16 rows and that S / White still reads 12.
3. Click "White" to rename it "Ivory" — confirm the rows still read 12 and the count stays 16.
4. Remove "Pink" — confirm the dialog names the variant and stock counts, and that removal leaves 12 rows.
5. Select two rows, bulk-set stock to 5, confirm both update and both render amber.
6. Save, reopen, confirm everything persisted.
7. Narrow the window below the phone breakpoint and confirm the cards render with tappable inputs.

- [ ] **Step 6: Commit**

```bash
git add components/admin/product
git commit -m "feat(admin): options editor and variant grid"
```

---

### Task 12: Products list and drawer retirement

**Files:**
- Modify: `app/office-scr1pts-x7k2/products/page.tsx` (full rewrite)
- Delete: `components/admin/ProductDrawer.tsx`

**Interfaces:**
- Consumes: `totalStock`, `variantCount`, `deriveAvailability` (Task 3); `LOW_STOCK_THRESHOLD` (Task 4); `togglePublished`, `useAdmin` (Task 5); `adminPath`; `useIsPhone`.
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Add filters and search state**

At the top of the page component:

```tsx
const [query, setQuery] = useState('')
const [status, setStatus] = useState<'all' | PublishedStatus>('all')
const [collection, setCollection] = useState('all')
const [lowOnly, setLowOnly] = useState(false)

const collections = useMemo(
  () => [...new Set(state.products.map((p) => p.collection))],
  [state.products],
)

const visible = useMemo(() => state.products.filter((p) => {
  if (status !== 'all' && p.publishedStatus !== status) return false
  if (collection !== 'all' && p.collection !== collection) return false
  if (lowOnly && totalStock(p) > LOW_STOCK_THRESHOLD) return false
  const q = query.trim().toLowerCase()
  if (!q) return true
  return p.name.toLowerCase().includes(q)
    || p.tags.some((t) => t.toLowerCase().includes(q))
    || p.variants.some((v) => v.sku.toLowerCase().includes(q))
}), [state.products, status, collection, lowOnly, query])
```

Render them as a row of `select`s plus a search input above the table, with a "Low stock" toggle button.

- [ ] **Step 2: Rebuild the row**

Each desktop row shows: thumbnail (`p.media[0]?.url`), name + `{p.emotion} · {p.collection}`, a `publishedStatus` badge, the inventory cell, product type, vendor, and a published toggle. The inventory cell:

```tsx
const stock = totalStock(p)
const count = variantCount(p)
const tone = stock === 0 ? 'text-pink-deep' : stock <= LOW_STOCK_THRESHOLD ? 'text-amber-400' : 'text-paper'
// …
<td className={`text-[12px] ${tone}`}>
  {stock} in stock<span className="text-grey"> across {count} variant{count === 1 ? '' : 's'}</span>
</td>
```

The whole row links to `adminPath(\`products/${p.id}/edit\`)`. Keep the existing delete control, and replace the old status select with a Draft/Active toggle calling `togglePublished`.

- [ ] **Step 3: Add the create entry point**

Replace the "Add product" button's drawer-opening handler with a `Link` to `adminPath('products/new')`.

- [ ] **Step 4: Update the phone cards**

Keep the existing card layout, with the second line becoming `{stock} in stock · {count} variants` using the same tone class, and the card linking to the edit route.

- [ ] **Step 5: Delete the drawer**

```bash
git rm components/admin/ProductDrawer.tsx
```

Then grep to confirm nothing still imports it:

Run: `grep -rn "ProductDrawer" app components lib`
Expected: no matches.

- [ ] **Step 6: Verify**

Run: `npm test` — Expected: PASS.
Run: `npm run build` — Expected: succeeds.
Manual: at `/office-scr1pts-x7k2/products`, confirm 6 rows with thumbnails and stock counts. Search a SKU fragment and confirm the matching product survives the filter. Toggle "Low stock" and confirm the list narrows. Click a row and confirm it opens the editor. Toggle a product to Draft and confirm the badge changes.

- [ ] **Step 7: Commit**

```bash
git add app/office-scr1pts-x7k2/products/page.tsx
git commit -m "feat(admin): products list with inventory, filters and search"
```

---

### Task 13: Full verification pass

**Files:** none created; fixes only.

- [ ] **Step 1: Run the whole suite**

Run: `npm test`
Expected: PASS across `adminVariants`, `adminMigrate`, `adminStore`, `adminSeeds`, `adminStats`, `cartStorage`, and the untouched game tests.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: succeeds with no type errors and no ESLint failures.

- [ ] **Step 3: Walk the whole flow manually**

With `npm run dev`:

1. `/office-scr1pts-x7k2/products/new` → fill name, emotion, description; add a front image; set price 44 and cost 14 (confirm 68% margin); add a Colorway axis with two values; set stock on four variants; set status Active; save.
2. Confirm the new product appears in the list with the right stock and variant count.
3. Open its storefront PDP via its slug; confirm swatches, sizes, stock states, and add-to-bag.
4. `/cart` → confirm the line shows the variant title and variant price.
5. `/products/anxiety-white` → confirm the redirect to `/products/anxiety`.
6. Reload the admin and confirm the product survived (minus object-URL images, which is expected and documented).

- [ ] **Step 4: Verify the stale-payload path**

In the browser console, run `localStorage.removeItem('scripts-admin-v2')` and reload the admin — confirm it reseeds to 6 products. Then set `localStorage.setItem('scripts-admin-v2', '{"products":[],"orders":[]}')` and reload — confirm it does not crash.

- [ ] **Step 5: Update PRD.md**

`CLAUDE.md` requires that any change to the product is reflected in `PRD.md` in the same change. Update the admin section to describe the options → variants model, per-variant SKU and stock, and the full-page editor replacing the drawer, then add a Change Log line:

```
- 2026-07-31 — Products rebuilt on a Shopify-style options → variants model:
  per-variant SKU, stock, and pricing; full-page editor replaces the slide-over;
  the 12 flat catalog products merged into 6 with a colorway swatch on the PDP.
```

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix(admin): verification pass corrections and PRD update"
```

---

## Follow-up

Sub-project B (orders: variant-identity line items, fulfilment and tracking, money and refunds, customer and risk) needs its own spec and plan. `AdminOrder.lineItems` is untouched by this plan and still carries `productName` + `size`; B replaces that with a variant snapshot and adds stock decrement on order placement.
