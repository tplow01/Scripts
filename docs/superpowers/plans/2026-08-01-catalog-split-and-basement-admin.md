# Catalog Split + Basement in Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Present exactly 12 products — 8 inventory, 4 Basement — one per emotion/colourway pair, with the Basement visible in the admin and no dead links from the previously-merged slugs.

**Architecture:** The change is almost entirely in the data layer. `migrateProducts` stops collapsing colourways, so each legacy row becomes one product carrying a `[Size]` axis only. Everything downstream (PDP, listings, admin) already handles a missing Colorway axis through existing `colorAxis < 0` fallbacks, so consumers need additive changes rather than rewrites.

**Tech Stack:** Next.js 15, React 19, TypeScript, Vitest, Tailwind. No new dependencies.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-01-catalog-split-and-basement-admin-design.md`.
- Inventory (`1-800-Cyber-Love`) must be exactly **8** products; Basement exactly **4**.
- Every product has exactly one option axis, named `Size`.
- SKU root rule: collection code + first 3 alphanumeric chars of emotion + first 3 alphanumeric chars of colourway, uppercased — e.g. `SCR-ANX-WHI`, `SCR-ANX-ARM`, `BSM-ARE-BLA`.
- Product slugs are the original pre-merge slugs (`anxiety-white`, `are-you-okay-black`).
- No Supabase, Stripe, API routes, or admin auth in this plan.
- Run the full suite with `npx vitest run`; typecheck with `npx tsc --noEmit`.
- Quote style in `lib/` and `app/` product files is single-quote, no semicolons — match the file you are editing.

---

### Task 1: Split colourways in the migration

**Files:**
- Modify: `types/product.ts` (add `colorway` to `Product`)
- Modify: `lib/admin/migrate.ts:56-137` (group key, options, media, skuRoot, slug, name)
- Modify: `lib/admin/store.tsx` (`blankProduct` gains `colorway: ''`)
- Test: `__tests__/adminMigrate.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `Product.colorway: string`; `migrateProducts(legacy: LegacyProduct[]): Product[]` now returning one product per legacy row, each with `options.length === 1`.

- [ ] **Step 1: Write the failing tests**

Replace the tests named `folds colorways of one emotion into a single product`, `builds a Size axis and a Colorway axis in that order`, `creates one variant per size x colorway`, `collects one media item per colorway plus the shared backs`, `points every variant at the media for its colorway`, `keeps a single-colorway product as a one-value axis`, and `derives skuRoot from the collection and emotion` in `__tests__/adminMigrate.test.ts` with:

```typescript
  it('keeps each colorway as its own product', () => {
    const out = migrateProducts(CYBER)
    expect(out).toHaveLength(2)
    expect(out.map((p) => p.colorway).sort()).toEqual(['Army Green', 'White'])
    expect(out.map((p) => p.slug).sort()).toEqual(['anxiety-green', 'anxiety-white'])
  })

  it('builds a Size axis only', () => {
    const [p] = migrateProducts(CYBER)
    expect(p.options).toHaveLength(1)
    expect(p.options[0].name).toBe('Size')
    expect(p.options[0].values).toEqual(['S', 'M', 'L', 'XL'])
  })

  it('creates one variant per size', () => {
    const [p] = migrateProducts(CYBER)
    expect(p.variants).toHaveLength(4)
    expect(p.variants.map((v) => variantTitle(v.optionValues))).toEqual(['S', 'M', 'L', 'XL'])
  })

  it('carries the front image then the back for its own colorway only', () => {
    const white = migrateProducts(CYBER).find((p) => p.colorway === 'White')!
    expect(white.media.map((m) => m.url)).toEqual([
      '/products/cutout/anxiety-white.png',
      '/products/cutout/back-white.png',
    ])
  })

  it('points every variant at the product front image', () => {
    const [p] = migrateProducts(CYBER)
    for (const v of p.variants) expect(v.imageId).toBe(p.media[0].id)
  })

  it('derives skuRoot from collection, emotion and colorway', () => {
    const out = migrateProducts(CYBER)
    expect(out.find((p) => p.colorway === 'White')!.skuRoot).toBe('SCR-ANX-WHI')
    expect(out.find((p) => p.colorway === 'Army Green')!.skuRoot).toBe('SCR-ANX-ARM')
  })

  it('keeps the legacy per-colorway name', () => {
    const white = migrateProducts(CYBER).find((p) => p.colorway === 'White')!
    expect(white.name).toBe('"ANXIETY" — White')
  })
```

Keep unchanged: `seeds deterministic non-zero stock`, `does not merge the same emotion across different collections`, `carries editorial copy and sets publishedStatus to active`, `sets allowBackorder from a pre-order source product`, `is idempotent when handed already-migrated products`, `handles mixed arrays`, and the `isMigrated` block.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/adminMigrate.test.ts`
Expected: FAIL — the current code returns 1 product with 2 option axes.

- [ ] **Step 3: Add `colorway` to the Product type**

In `types/product.ts`, inside `interface Product`, directly after the `emotion: string` line:

```typescript
  /** The single colourway this product is sold in (e.g. 'White'). */
  colorway: string
```

- [ ] **Step 4: Rewrite the grouping and product build**

In `lib/admin/migrate.ts`, replace the body of `migrateProducts` from the `const groups = new Map(...)` line through the end of the `newProducts` mapping with:

```typescript
  // One product per emotion+colorway: colourways are separate products, not a
  // Colorway option axis. Grouping is retained so a future collection can widen
  // the key without restructuring this function.
  const groups = new Map<string, LegacyProduct[]>()
  for (const p of toMigrate) {
    const key = `${p.collection}|${p.emotion}|${p.colorway}`
    groups.set(key, [...(groups.get(key) ?? []), p])
  }

  const newProducts = [...groups.values()].map((group) => {
    const head = group[0]
    const sizes = [...new Set(group.flatMap((p) => p.sizes))]

    // Front image first, then the back and any gallery extras for this colorway.
    const media: ProductMedia[] = []
    const urls = [head.image, head.backImage, ...(head.galleryImages ?? [])]
    for (const url of urls) {
      if (!url || media.some((m) => m.url === url)) continue
      media.push({
        id: `${head.id}-m${media.length}`,
        url,
        alt: `${head.emotion} — ${head.colorway}`,
        position: media.length,
      })
    }

    const options: ProductOption[] = [{ name: 'Size', values: sizes, position: 1 }]

    const defaults: VariantDefaults = {
      price: head.price,
      compareAtPrice: null,
      cost: null,
      barcode: null,
      trackInventory: true,
      allowBackorder: head.status === 'pre-order',
      weightGrams: null,
    }

    const shell: Product = {
      id: head.id,
      name: head.name,
      slug: head.slug,
      emotion: head.emotion,
      colorway: head.colorway,
      description: head.description,
      collection: head.collection,
      productType: 'Tee',
      vendor: 'SCR!PTS',
      tags: [],
      publishedStatus: 'active',
      skuRoot: skuRoot(head.collection, head.emotion, head.colorway),
      shipDate: head.shipDate,
      requiresShipping: true,
      seo: { title: head.name, description: head.description.slice(0, 155) },
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
      imageId: media[0]?.id ?? null,
    }))

    return { ...shell, variants }
  })
```

Then replace the `collectionCode` helper with:

```typescript
const collectionCode = (collection: string) =>
  collection.toLowerCase().startsWith('basement') ? 'BSM' : 'SCR'

/** First 3 alphanumeric characters, uppercased — 'Army Green' → 'ARM'. */
const code3 = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase()

/** e.g. SCR-ANX-WHI. Unique per emotion+colorway within a collection. */
const skuRoot = (collection: string, emotion: string, colorway: string) =>
  `${collectionCode(collection)}-${code3(emotion)}-${code3(colorway)}`
```

The `slugify` helper is now unused — delete it.

- [ ] **Step 5: Give blank products a colorway**

In `lib/admin/store.tsx`, in `blankProduct`, add `colorway: ''` to the object literal immediately after `emotion: ''`.

- [ ] **Step 6: Fix the Product fixtures that a required field breaks**

Two fixtures build full `Product` literals and will not compile without the new field.

In `__tests__/adminVariants.test.ts:145`, change:

```typescript
  id: 'p1', name: 'ANXIETY', slug: 'anxiety', emotion: 'ANXIETY',
```

to:

```typescript
  id: 'p1', name: 'ANXIETY', slug: 'anxiety', emotion: 'ANXIETY', colorway: 'White',
```

In `__tests__/adminStore.test.ts:14`, the fixture spreads `blankProduct('p1')`, which now supplies `colorway: ''` — no change needed there, but run the typecheck in the next step to confirm.

- [ ] **Step 7: Run the migrate tests**

Run: `npx tsc --noEmit && npx vitest run __tests__/adminMigrate.test.ts`
Expected: clean typecheck; tests PASS.

- [ ] **Step 8: Commit**

```bash
git add types/product.ts lib/admin/migrate.ts lib/admin/store.tsx \
  __tests__/adminMigrate.test.ts __tests__/adminVariants.test.ts
git commit -m "fix: keep each colourway as its own product"
```

---

### Task 2: Flip the slug redirects and add sibling lookup

**Files:**
- Modify: `lib/products.ts:196-205`
- Test: `__tests__/catalog.test.ts` (create)

**Interfaces:**
- Consumes: `Product.colorway` from Task 1.
- Produces: `LEGACY_SLUG_REDIRECTS: Record<string, string>` mapping merged slug → White colourway slug; `siblingColorways(product: Product): Product[]`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/catalog.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import {
  ALL_PRODUCTS,
  BASEMENT_PRODUCTS,
  CYBER_LOVE_PRODUCTS,
  LEGACY_SLUG_REDIRECTS,
  findProductBySlug,
  siblingColorways,
} from '@/lib/products'

describe('catalog shape', () => {
  it('ships 8 inventory products and 4 basement products', () => {
    expect(CYBER_LOVE_PRODUCTS).toHaveLength(8)
    expect(BASEMENT_PRODUCTS).toHaveLength(4)
  })

  it('gives every product a single Size axis and a colorway', () => {
    for (const p of ALL_PRODUCTS) {
      expect(p.options).toHaveLength(1)
      expect(p.options[0].name).toBe('Size')
      expect(p.colorway.length).toBeGreaterThan(0)
    }
  })

  it('keeps slugs and sku roots unique across the catalog', () => {
    expect(new Set(ALL_PRODUCTS.map((p) => p.slug)).size).toBe(12)
    expect(new Set(ALL_PRODUCTS.map((p) => p.skuRoot)).size).toBe(12)
  })
})

describe('merged-slug redirects', () => {
  it('resolves every merged slug to a live product', () => {
    const merged = ['anxiety', 'love', 'confusion', 'rage', 'mj', 'are-you-okay']
    expect(Object.keys(LEGACY_SLUG_REDIRECTS).sort()).toEqual([...merged].sort())
    for (const from of merged) {
      expect(findProductBySlug(LEGACY_SLUG_REDIRECTS[from])).toBeDefined()
    }
  })

  it('points each merged slug at the White colourway', () => {
    expect(LEGACY_SLUG_REDIRECTS.anxiety).toBe('anxiety-white')
    expect(LEGACY_SLUG_REDIRECTS['are-you-okay']).toBe('are-you-okay-white')
  })
})

describe('siblingColorways', () => {
  it('finds the one sibling of an inventory product', () => {
    const p = findProductBySlug('anxiety-white')!
    expect(siblingColorways(p).map((s) => s.colorway)).toEqual(['Army Green'])
  })

  it('finds both siblings of ARE YOU OKAY', () => {
    const p = findProductBySlug('are-you-okay-white')!
    expect(siblingColorways(p).map((s) => s.colorway).sort()).toEqual(['Army Green', 'Black'])
  })

  it('returns none for a single-colourway product', () => {
    expect(siblingColorways(findProductBySlug('mj-white')!)).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/catalog.test.ts`
Expected: FAIL with "siblingColorways is not a function" (and count mismatches).

- [ ] **Step 3: Rewrite the redirect map and add the helper**

In `lib/products.ts`, replace the `LEGACY_SLUG_REDIRECTS` block and `findProductBySlug` with:

```typescript
const mergedSlug = (emotion: string) =>
  emotion.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

/**
 * Colourways briefly shipped merged under one slug per emotion (/products/anxiety).
 * Those URLs are live, so each one redirects to that emotion's White colourway —
 * White exists for every emotion in both collections.
 */
export const LEGACY_SLUG_REDIRECTS: Record<string, string> = Object.fromEntries(
  [...LEGACY_CYBER_LOVE, ...LEGACY_BASEMENT]
    .filter((p) => p.colorway === 'White')
    .map((p) => [mergedSlug(p.emotion), p.slug]),
)

export function findProductBySlug(slug: string): Product | undefined {
  return ALL_PRODUCTS.find((p) => p.slug === slug)
}

/** The same piece in its other colourways — drives the PDP colourway links. */
export function siblingColorways(product: Product): Product[] {
  return ALL_PRODUCTS.filter(
    (p) =>
      p.collection === product.collection &&
      p.emotion === product.emotion &&
      p.slug !== product.slug,
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/catalog.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/products.ts __tests__/catalog.test.ts
git commit -m "fix: redirect merged slugs to the white colourway"
```

---

### Task 3: Replace the PDP swatch picker with colourway links

**Files:**
- Modify: `app/products/[slug]/ProductDetail.tsx`
- Modify: `app/products/[slug]/page.tsx`

**Interfaces:**
- Consumes: `siblingColorways` from Task 2; `Product.colorway` from Task 1.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Delete the colourway state and gallery filtering**

In `app/products/[slug]/ProductDetail.tsx` remove, in this order:

1. The `colorAxis`, `colorways`, and `colorway` state declarations (around lines 24-27).
2. The `colorAxis` clause inside `variantFor`, so it becomes:

```typescript
  const variantFor = (s: string) =>
    product.variants.find((v) => v.optionValues[sizeAxis] === s)
```

3. The `claimedIds` / `colorwayImageIds` block and the media filtering that uses them (around lines 51-59), replacing the derived gallery list with the product's own media in order:

```typescript
  // One colourway per product, so the gallery is simply this product's media.
  const gallery = product.media
```

4. The `useEffect(() => { setSize(null) }, [colorway])` reset, and `colorway` from the dependency array of the hero-image effect.
5. The swatch-picker JSX block.

Use the existing variable name for the gallery where the old derived list was consumed — read the surrounding JSX and keep it consistent.

- [ ] **Step 2: Add the colourway links**

In the same file, import at the top:

```typescript
import Link from 'next/link'
import { siblingColorways } from '@/lib/products'
```

Add above the component body:

```typescript
/** Chip colours for the colourways the catalog actually ships. */
const SWATCH: Record<string, string> = {
  White: '#f7f7f5',
  'Army Green': '#4b5320',
  Black: '#0d0d0d',
}
```

Inside the component, before the return:

```typescript
  const siblings = siblingColorways(product)
```

And render this immediately after the price paragraph (the `motion.p` showing `$…`):

```tsx
        {siblings.length > 0 && (
          <div className="mb-[28px]">
            <p className="text-[11px] uppercase tracking-[0.08em] mb-[10px] opacity-60">
              Other colourways
            </p>
            <div className="flex gap-[10px]">
              {siblings.map((s) => (
                <Link
                  key={s.slug}
                  href={`/products/${s.slug}`}
                  aria-label={`View ${s.emotion} in ${s.colorway}`}
                  title={s.colorway}
                  className="w-[28px] h-[28px] rounded-full border border-current/30 hover:border-current transition-colors"
                  style={{ backgroundColor: SWATCH[s.colorway] ?? '#888' }}
                />
              ))}
            </div>
          </div>
        )}
```

- [ ] **Step 3: Verify the type checks and the suite still passes**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors; all tests pass.

- [ ] **Step 4: Verify both pages render**

Run `npm run dev` and read the port it prints — it falls back to 3001 if 3000 is taken. Open `/products/anxiety-white` and `/products/anxiety` on that port.
Expected: the first shows one Army Green chip under the price that navigates to `/products/anxiety-green`; the second redirects to `/products/anxiety-white`. Stop the dev server afterwards.

- [ ] **Step 5: Commit**

```bash
git add "app/products/[slug]/ProductDetail.tsx" "app/products/[slug]/page.tsx"
git commit -m "feat: link sibling colourways from the product page"
```

---

### Task 4: Seed the admin from the whole catalog

**Files:**
- Modify: `lib/admin/store.tsx:14` (storage key), `lib/admin/store.tsx:58-60` (`seedState`)
- Modify: `app/office-scr1pts-x7k2/products/page.tsx:229-246` (table columns)
- Test: `__tests__/adminStore.test.ts`

**Interfaces:**
- Consumes: `ALL_PRODUCTS` from `lib/products`.
- Produces: `seedState(): AdminState` containing all 12 products.

- [ ] **Step 1: Write the failing test**

Append to `__tests__/adminStore.test.ts`:

```typescript
describe('seedState', () => {
  it('seeds every product, including the basement', () => {
    const s = seedState()
    expect(s.products).toHaveLength(12)
    expect(s.products.filter((p) => p.collection === 'Basement')).toHaveLength(4)
  })
})
```

Add `seedState` to the existing import from `@/lib/admin/store` at the top of that file.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/adminStore.test.ts`
Expected: FAIL — receives 8 products, 0 from the Basement.

- [ ] **Step 3: Seed from the full catalog and bump the storage key**

In `lib/admin/store.tsx`:

Change the import to:

```typescript
import { ALL_PRODUCTS } from '@/lib/products'
```

Change the storage key — the v2 payload's ids, slugs and option axes no longer match, and its order line items reference variants that no longer exist, so a clean reseed is the migration:

```typescript
const STORAGE_KEY = 'scripts-admin-v3'
```

Change `seedState`:

```typescript
export function seedState(): AdminState {
  return { products: [...ALL_PRODUCTS], orders: [...MOCK_ORDERS] }
}
```

- [ ] **Step 4: Show the collection in the products table**

The page already has a working collection filter (`const [collection, setCollection]`), so only the column is missing. In `app/office-scr1pts-x7k2/products/page.tsx`, replace the `Vendor` header with `Collection` — vendor is `SCR!PTS` on every product and carries no information:

```tsx
                <th className="px-5 py-3 font-medium">Collection</th>
```

Then find the matching `<td>` rendering `p.vendor` in the row body and change it to render `p.collection`. Leave the column count and `colSpan={7}` unchanged.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run`
Expected: PASS. If `__tests__/adminSeeds.test.ts` fails on the old 4/2 counts, leave it — Task 5 updates that file.

- [ ] **Step 6: Commit**

```bash
git add lib/admin/store.tsx app/office-scr1pts-x7k2/products/page.tsx __tests__/adminStore.test.ts
git commit -m "fix: seed the admin with the basement products"
```

---

### Task 5: Update the catalog seed tests and the PRD

**Files:**
- Modify: `__tests__/adminSeeds.test.ts` (the `migrated catalog` describe block)
- Modify: `PRD.md`

**Interfaces:**
- Consumes: everything from Tasks 1-4.
- Produces: nothing.

- [ ] **Step 1: Update the stale catalog assertions**

In `__tests__/adminSeeds.test.ts`, inside `describe('migrated catalog')`:

Replace the `folds twelve legacy products into six` test with:

```typescript
  it('keeps all twelve products, one per colourway', () => {
    expect(CYBER_LOVE_PRODUCTS).toHaveLength(8)
    expect(BASEMENT_PRODUCTS).toHaveLength(4)
  })
```

Replace `redirects all twelve legacy slugs to a live product` with:

```typescript
  it('redirects every merged slug to a live product', () => {
    const entries = Object.entries(LEGACY_SLUG_REDIRECTS)
    expect(entries).toHaveLength(6)
    for (const [, to] of entries) {
      expect(ALL_PRODUCTS.some((p) => p.slug === to)).toBe(true)
    }
  })
```

Replace `gives ARE YOU OKAY a three-value colorway axis` with:

```typescript
  it('ships ARE YOU OKAY as three separate colourway products', () => {
    const items = BASEMENT_PRODUCTS.filter((x) => x.emotion === 'ARE YOU OKAY')
    expect(items).toHaveLength(3)
    for (const p of items) expect(p.variants).toHaveLength(4)
  })
```

Leave the other tests in the block unchanged.

- [ ] **Step 2: Run the full suite**

Run: `npx vitest run`
Expected: PASS, all files.

- [ ] **Step 3: Update the PRD**

In `PRD.md`:

Change the line reading `The storefront catalog ships with **6 products**, each carrying a colour option; the product detail page shows a **colourway swatch picker** so shoppers pick a variant directly, with stock-aware size selection layered on top.` to:

```markdown
The storefront catalog ships with **12 products** — 8 in the inventory and 4 in the Basement — one per emotion and colourway. Each product carries a stock-aware size selection, and the product detail page links out to the same piece in its other colourways.
```

Update the `**Last meaningful update:**` line to `2026-08-01 (catalog split into 12 per-colourway products)`.

Append to the Change Log:

```markdown
- **2026-08-01** — **Catalog split back to one product per colourway.** The variant rebuild had collapsed colourways into a single product per emotion, leaving 6 storefront products and hiding the Basement's items from the admin entirely (the admin seeded from `CYBER_LOVE_PRODUCTS` only). The catalog is now **8 inventory + 4 Basement products**, each with its own slug, SKU root and `[Size]` axis; the admin seeds from `ALL_PRODUCTS` and lists Collection as a column; the briefly-live merged slugs redirect to each emotion's White colourway; and the PDP's swatch picker is replaced by links to sibling colourways. Spec: `docs/superpowers/specs/2026-08-01-catalog-split-and-basement-admin-design.md`.
```

- [ ] **Step 4: Verify the build**

Run: `npx tsc --noEmit && npm run build`
Expected: clean typecheck; build succeeds and prerenders 12 `/products/[slug]` paths.

- [ ] **Step 5: Commit**

```bash
git add __tests__/adminSeeds.test.ts PRD.md
git commit -m "docs: record the 12-product catalog split"
```

---

## Self-Review

**Spec coverage**

| Spec section | Task |
|---|---|
| 1. One product per colourway | Task 1 |
| 2. Slug redirects flip direction | Task 2 |
| 3. Basement in the admin (seed, storage key, Collection column) | Task 4 |
| 4. Colourway navigation on the PDP | Tasks 2 (helper) + 3 (UI) |
| 5. Tests | Tasks 1, 2, 4, 5 |
| 6. Documentation | Task 5 |

**Correction to the spec:** the spec says the products table "gains a Collection column and filter". The filter already exists (`app/office-scr1pts-x7k2/products/page.tsx:103`); only the column is added, replacing the uninformative Vendor column. Task 4 Step 4 reflects this.

**Deviation from the spec:** the spec did not mention adding `colorway` to the `Product` type. It is required — once the Colorway option axis is gone there is no non-fragile way to label a colourway chip or an admin row without parsing the product name. Task 1 adds it.
