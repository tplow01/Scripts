# Catalog Split + Basement in Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split every colourway into its own product so the storefront and admin both show exactly 12 products (8 inventory + 4 Basement), and get the Basement's products into the admin for the first time.

**Architecture:** `migrateProducts` currently groups legacy rows by `collection|emotion`, folding 12 rows into 6 products with a Colorway option axis. The group key gains `|colorway`, so each legacy row becomes exactly one product with a Size-only axis. Everything downstream follows from that: slug redirects invert, the PDP swatch picker becomes sibling-product links, and the admin seeds from `ALL_PRODUCTS` instead of `CYBER_LOVE_PRODUCTS`.

**Tech Stack:** TypeScript, Next.js 15 (App Router), React 19, Vitest, Tailwind.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-01-catalog-split-and-basement-admin-design.md`.
- Final catalog is exactly **8 inventory + 4 Basement = 12 products**.
- Every product has **exactly one option axis, named `Size`**, values `['S','M','L','XL']`.
- Product `name` is the legacy name verbatim, e.g. `"ANXIETY" — White`.
- Product `slug` is the original pre-merge slug, e.g. `anxiety-white`.
- `skuRoot` rule: collection code + first 3 alphanumeric characters of the emotion + first 3 alphanumeric characters of the colourway, all uppercased, hyphen-separated. Collection code is `BSM` when the collection starts with `basement` (case-insensitive), else `SCR`.
- Grouping is **retained**, not removed — only the key changes, so a future collection can reintroduce a real multi-value axis.
- `LEGACY_SLUG_REDIRECTS` stays **derived** from the legacy arrays; never hand-maintained.
- Out of scope: Supabase, Stripe, API routes, admin auth, cart/checkout changes, the variant/size model itself.
- Run the full suite with `npm test`. Typecheck with `npx tsc --noEmit`.

## Reference: the 12 legacy rows

| id | emotion | colorway | slug | collection | expected skuRoot |
|---|---|---|---|---|---|
| 1 | ANXIETY | White | `anxiety-white` | 1-800-Cyber-Love | `SCR-ANX-WHI` |
| 2 | LOVE | White | `love-white` | 1-800-Cyber-Love | `SCR-LOV-WHI` |
| 3 | CONFUSION | White | `confusion-white` | 1-800-Cyber-Love | `SCR-CON-WHI` |
| 4 | RAGE | White | `rage-white` | 1-800-Cyber-Love | `SCR-RAG-WHI` |
| 5 | ANXIETY | Army Green | `anxiety-green` | 1-800-Cyber-Love | `SCR-ANX-ARM` |
| 6 | LOVE | Army Green | `love-green` | 1-800-Cyber-Love | `SCR-LOV-ARM` |
| 7 | CONFUSION | Army Green | `confusion-green` | 1-800-Cyber-Love | `SCR-CON-ARM` |
| 8 | RAGE | Army Green | `rage-green` | 1-800-Cyber-Love | `SCR-RAG-ARM` |
| b1 | MJ | White | `mj-white` | Basement | `BSM-MJ-WHI` |
| b2 | ARE YOU OKAY | White | `are-you-okay-white` | Basement | `BSM-ARE-WHI` |
| b3 | ARE YOU OKAY | Army Green | `are-you-okay-green` | Basement | `BSM-ARE-ARM` |
| b4 | ARE YOU OKAY | Black | `are-you-okay-black` | Basement | `BSM-ARE-BLA` |

Note `MJ` is only two characters, so its segment is `MJ`, not padded. All 12 roots are unique.

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `lib/admin/migrate.ts` | Modify | Group key, Size-only axis, per-colourway media, name/slug/skuRoot |
| `__tests__/adminMigrate.test.ts` | Modify | Unit coverage for the split |
| `lib/products.ts` | Modify | Inverted redirects, `siblingColorways`, `colorwayLabel` |
| `__tests__/adminSeeds.test.ts` | Modify | Catalog-shape assertions |
| `lib/admin/store.tsx` | Modify | Seed from `ALL_PRODUCTS`, storage key v3 |
| `app/office-scr1pts-x7k2/products/page.tsx` | Modify | Collection column |
| `app/products/[slug]/ProductDetail.tsx` | Modify | Drop swatch picker, add sibling links |
| `PRD.md` | Modify | 12 products, sibling links, Change Log |

**Already done, do not rebuild:** the admin products page already has a collection `<select>` filter (`collection` state, `collections` memo) and already shows `p.collection` in the row subline and phone card. Task 4 adds only the dedicated table column.

**No change needed:** `app/products/[slug]/page.tsx` reads `LEGACY_SLUG_REDIRECTS[slug]` and redirects — that logic is correct regardless of which direction the map points.

---

### Task 1: Split products by colourway in the migrator

**Files:**
- Modify: `lib/admin/migrate.ts:34-139`
- Test: `__tests__/adminMigrate.test.ts`

**Interfaces:**
- Consumes: `reconcileVariants(productId, skuRoot, options, existing, defaults)` and `VariantDefaults` from `./variants` (unchanged).
- Produces: `migrateProducts(legacy: LegacyProduct[]): Product[]` — same signature, new behaviour. Each returned `Product` has `options.length === 1` (`Size`), `variants.length === options[0].values.length`, `slug === head.slug`, `name === head.name`, and every variant's `imageId === media[0].id`.

- [ ] **Step 1: Write the failing tests**

Replace the `describe('migrateProducts', ...)` block in `__tests__/adminMigrate.test.ts` with this. Keep the `legacy()` helper and the `describe('isMigrated', ...)` block at the bottom of the file exactly as they are.

```ts
const CYBER = [
  legacy(),
  legacy({ id: '5', name: '"ANXIETY" — Army Green', colorway: 'Army Green', slug: 'anxiety-green', image: '/g.png' }),
]

describe('migrateProducts', () => {
  it('splits each colorway of one emotion into its own product', () => {
    const out = migrateProducts(CYBER)
    expect(out).toHaveLength(2)
    expect(out.map((p) => p.slug)).toEqual(['anxiety-white', 'anxiety-green'])
    expect(out.map((p) => p.name)).toEqual(['"ANXIETY" — White', '"ANXIETY" — Army Green'])
  })

  it('builds a Size axis and nothing else', () => {
    const [p] = migrateProducts(CYBER)
    expect(p.options.map((o) => o.name)).toEqual(['Size'])
    expect(p.options[0].values).toEqual(['S', 'M', 'L', 'XL'])
    expect(p.options[0].position).toBe(1)
  })

  it('creates one variant per size', () => {
    const [p] = migrateProducts(CYBER)
    expect(p.variants).toHaveLength(4)
    expect(new Set(p.variants.map((v) => v.sku)).size).toBe(4)
    expect(p.variants.every((v) => v.price === 44)).toBe(true)
  })

  it('derives skuRoot from collection, emotion and colourway', () => {
    const out = migrateProducts(CYBER)
    expect(out.map((p) => p.skuRoot)).toEqual(['SCR-ANX-WHI', 'SCR-ANX-ARM'])
  })

  it('gives a two-character emotion an unpadded segment', () => {
    const out = migrateProducts([legacy({ id: 'b1', emotion: 'MJ', collection: 'Basement', slug: 'mj-white' })])
    expect(out[0].skuRoot).toBe('BSM-MJ-WHI')
  })

  it('collects this colourway front shot first, then its back', () => {
    const [white, green] = migrateProducts(CYBER)
    expect(white.media[0].url).toBe('/products/cutout/anxiety-white.png')
    expect(white.media[0].position).toBe(0)
    expect(white.media[1].url).toBe('/products/cutout/back-white.png')
    expect(green.media[0].url).toBe('/g.png')
  })

  it('points every variant at this product single front image', () => {
    const [p] = migrateProducts(CYBER)
    expect(p.variants.every((v) => v.imageId === p.media[0].id)).toBe(true)
  })

  it('seeds deterministic non-zero stock', () => {
    const a = migrateProducts(CYBER)
    const b = migrateProducts(CYBER)
    expect(totalStock(a[0])).toBe(totalStock(b[0]))
    expect(totalStock(a[0])).toBeGreaterThan(0)
  })

  it('does not merge the same emotion across different collections', () => {
    const out = migrateProducts([
      legacy(),
      legacy({ id: 'b9', collection: 'Basement', slug: 'anxiety-basement' }),
    ])
    expect(out).toHaveLength(2)
  })

  it('carries editorial copy and sets publishedStatus to active', () => {
    const [p] = migrateProducts(CYBER)
    expect(p.description).toBe('copy')
    expect(p.careInstructions).toEqual(['wash'])
    expect(p.fabric).toBe('100% Cotton')
    expect(p.publishedStatus).toBe('active')
    expect(p.seo.title).toBe('"ANXIETY" — White')
  })

  it('sets allowBackorder from a pre-order source product', () => {
    const [p] = migrateProducts(CYBER)
    expect(p.variants.every((v) => v.allowBackorder)).toBe(true)
  })

  it('is idempotent when handed already-migrated products', () => {
    const once = migrateProducts(CYBER)
    expect(migrateProducts(once as unknown as LegacyProduct[])).toEqual(once)
  })

  it('handles mixed arrays: passes through migrated, migrates legacy, returns both', () => {
    const migrated = migrateProducts(CYBER)[0]
    const legacyItem = legacy({ id: 'new', emotion: 'NEW', slug: 'new-white' })
    const mixed = [migrated, legacyItem] as unknown as LegacyProduct[]
    const result = migrateProducts(mixed)

    expect(result).toHaveLength(2)
    expect(result[1]).toEqual(migrated)
    expect(result[0].emotion).toBe('NEW')
    expect(result[0].slug).toBe('new-white')
    expect(result[0].variants.length).toBeGreaterThan(0)
  })
})
```

Also remove `variantTitle` from the import on line 4 — it is no longer used. The line becomes:

```ts
import { totalStock } from '@/lib/admin/variants'
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run __tests__/adminMigrate.test.ts`
Expected: FAIL — the split test reports `expected length 2, got 1`, and the skuRoot test reports `'SCR-ANX'` instead of `'SCR-ANX-WHI'`.

- [ ] **Step 3: Change the group key and the product shell**

In `lib/admin/migrate.ts`, delete the now-unused `slugify` constant (lines 34-35) and add an `alpha3` helper in its place:

```ts
/** First 3 alphanumeric characters, uppercased — the sku segment for one field. */
const alpha3 = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase()
```

Change the group key on line 60 from:

```ts
    const key = `${p.collection}|${p.emotion}`
```

to:

```ts
    const key = `${p.collection}|${p.emotion}|${p.colorway}`
```

- [ ] **Step 4: Rewrite the per-group mapping**

Replace the whole body of the `.map((group) => { ... })` callback (lines 64-135, from `const head = group[0]` down to and including `return { ...shell, variants }`) with:

```ts
    const head = group[0]
    const sizes = [...new Set(group.flatMap((p) => p.sizes))]

    // This colourway's own front shot first, then its back and any gallery
    // extras. No cross-colourway media, so the PDP gallery needs no filtering.
    const media: ProductMedia[] = []
    const pushMedia = (url: string | null | undefined, alt: string) => {
      if (!url || media.some((m) => m.url === url)) return
      media.push({ id: `${head.id}-m${media.length}`, url, alt, position: media.length })
    }
    pushMedia(head.image, `${head.emotion} — ${head.colorway}`)
    for (const p of group) {
      pushMedia(p.backImage, `${head.emotion} — back`)
      for (const url of p.galleryImages ?? []) pushMedia(url, `${head.emotion} — detail`)
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
      description: head.description,
      collection: head.collection,
      productType: 'Tee',
      vendor: 'SCR!PTS',
      tags: [],
      publishedStatus: 'active',
      skuRoot: `${collectionCode(head.collection)}-${alpha3(head.emotion)}-${alpha3(head.colorway)}`,
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
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run __tests__/adminMigrate.test.ts`
Expected: PASS, all tests in the file.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output. If it reports `'slugify' is declared but its value is never read`, you missed deleting it in Step 3.

- [ ] **Step 7: Commit**

```bash
git add lib/admin/migrate.ts __tests__/adminMigrate.test.ts
git commit -m "feat(catalog): split each colourway into its own product"
```

---

### Task 2: Invert the slug redirects and add sibling helpers

**Files:**
- Modify: `lib/products.ts:191-206`
- Test: `__tests__/adminSeeds.test.ts`

**Interfaces:**
- Consumes: `migrateProducts` from Task 1; `ALL_PRODUCTS`, `LEGACY_CYBER_LOVE`, `LEGACY_BASEMENT` already exported from this file.
- Produces:
  - `LEGACY_SLUG_REDIRECTS: Record<string, string>` — now **merged slug → White colourway slug**, 6 entries.
  - `siblingColorways(product: Product): Product[]` — same collection and emotion, different slug.
  - `colorwayLabel(product: Product): string` — the segment after `' — '` in the product name, e.g. `'White'`.

- [ ] **Step 1: Write the failing tests**

In `__tests__/adminSeeds.test.ts`, replace the entire `describe('migrated catalog', ...)` block with:

```ts
describe('split catalog', () => {
  it('ships 8 inventory and 4 Basement products', () => {
    expect(CYBER_LOVE_PRODUCTS).toHaveLength(8)
    expect(BASEMENT_PRODUCTS).toHaveLength(4)
    expect(ALL_PRODUCTS).toHaveLength(12)
  })

  it('gives every product a single Size axis, plus variants and media', () => {
    for (const p of ALL_PRODUCTS) {
      expect(p.options.map((o) => o.name)).toEqual(['Size'])
      expect(p.variants).toHaveLength(4)
      expect(p.media.length).toBeGreaterThan(0)
    }
  })

  it('has unique slugs, sku roots and variant skus across all twelve', () => {
    expect(new Set(ALL_PRODUCTS.map((p) => p.slug)).size).toBe(12)
    expect(new Set(ALL_PRODUCTS.map((p) => p.skuRoot)).size).toBe(12)
    const skus = ALL_PRODUCTS.flatMap((p) => p.variants.map((v) => v.sku))
    expect(new Set(skus).size).toBe(skus.length)
  })

  it('redirects every merged slug to a live White product', () => {
    const entries = Object.entries(LEGACY_SLUG_REDIRECTS)
    expect(entries).toHaveLength(6)
    expect(Object.keys(LEGACY_SLUG_REDIRECTS).sort()).toEqual(
      ['anxiety', 'are-you-okay', 'confusion', 'love', 'mj', 'rage'],
    )
    for (const [, to] of entries) {
      expect(to.endsWith('-white')).toBe(true)
      expect(ALL_PRODUCTS.some((p) => p.slug === to)).toBe(true)
    }
  })

  it('ships stock, so nothing reads as sold out', () => {
    for (const p of ALL_PRODUCTS) {
      expect(totalStock(p)).toBeGreaterThan(0)
      expect(deriveAvailability(p)).not.toBe('sold-out')
    }
  })

  it('links sibling colourways: 1 for inventory, 2 for ARE YOU OKAY, 0 for MJ', () => {
    const anxietyWhite = ALL_PRODUCTS.find((p) => p.slug === 'anxiety-white')!
    expect(siblingColorways(anxietyWhite).map((p) => p.slug)).toEqual(['anxiety-green'])

    const areBlack = ALL_PRODUCTS.find((p) => p.slug === 'are-you-okay-black')!
    expect(siblingColorways(areBlack)).toHaveLength(2)

    const mj = ALL_PRODUCTS.find((p) => p.slug === 'mj-white')!
    expect(siblingColorways(mj)).toHaveLength(0)
  })

  it('reads the colourway label off the product name', () => {
    const green = ALL_PRODUCTS.find((p) => p.slug === 'anxiety-green')!
    expect(colorwayLabel(green)).toBe('Army Green')
  })
})
```

Update the import on line 5 of that file to:

```ts
import { ALL_PRODUCTS, BASEMENT_PRODUCTS, CYBER_LOVE_PRODUCTS, LEGACY_SLUG_REDIRECTS, colorwayLabel, siblingColorways } from '@/lib/products'
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run __tests__/adminSeeds.test.ts`
Expected: FAIL — `siblingColorways is not a function`, and the redirect test reports 12 entries instead of 6.

- [ ] **Step 3: Invert the redirect map and add the helpers**

In `lib/products.ts`, replace the `LEGACY_SLUG_REDIRECTS` block (lines 195-201) and append the two helpers after `findProductBySlug`:

```ts
/**
 * Merged slug → that emotion's White colourway. The pre-split PDP served
 * `/products/anxiety`; after the split that slug has no product, so it
 * redirects to `anxiety-white`. White exists for every emotion in both
 * collections, so every merged slug resolves. Derived, never hand-maintained.
 */
export const LEGACY_SLUG_REDIRECTS: Record<string, string> = Object.fromEntries(
  [...LEGACY_CYBER_LOVE, ...LEGACY_BASEMENT]
    .filter((p) => p.colorway === 'White')
    .map((p) => [
      p.emotion.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      p.slug,
    ]),
)
```

```ts
/** Other colourways of the same piece — same collection and emotion, different product. */
export function siblingColorways(product: Product): Product[] {
  return ALL_PRODUCTS.filter(
    (p) =>
      p.collection === product.collection &&
      p.emotion === product.emotion &&
      p.slug !== product.slug,
  )
}

/** The colourway segment of a split product's name: '"ANXIETY" — White' → 'White'. */
export function colorwayLabel(product: Product): string {
  return product.name.split(' — ')[1] ?? ''
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run __tests__/adminSeeds.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/products.ts __tests__/adminSeeds.test.ts
git commit -m "feat(catalog): invert slug redirects and add sibling colourway helpers"
```

---

### Task 3: Seed the admin from the whole catalog

**Files:**
- Modify: `lib/admin/store.tsx:5`, `lib/admin/store.tsx:16`, `lib/admin/store.tsx:58-60`
- Test: `__tests__/adminStore.test.ts`

**Interfaces:**
- Consumes: `ALL_PRODUCTS` from `@/lib/products` (Task 2).
- Produces: `seedState(): AdminState` with `products.length === 12`; `STORAGE_KEY` is `'scripts-admin-v3'`.

**Why the key bumps:** the v2 payload's product shape no longer matches — ids, slugs and option axes all change, and stored order line items reference product and variant ids that no longer exist. A clean reseed under a new key is the correct migration, not a merge.

- [ ] **Step 1: Write the failing test**

Append to `__tests__/adminStore.test.ts`:

```ts
describe('seed covers the whole catalog', () => {
  it('seeds all twelve products, including the Basement', () => {
    const s = seedState()
    expect(s.products).toHaveLength(12)
    expect(s.products.filter((p) => p.collection === 'Basement')).toHaveLength(4)
    expect(s.products.some((p) => p.slug === 'mj-white')).toBe(true)
    expect(s.products.some((p) => p.slug === 'are-you-okay-black')).toBe(true)
  })
})
```

`seedState` is already in that file's import block from `@/lib/admin/store` (line 4) — no import change needed.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run __tests__/adminStore.test.ts`
Expected: FAIL — `expected length 12, got 8` (the seed currently holds inventory only).

- [ ] **Step 3: Seed from ALL_PRODUCTS and bump the key**

In `lib/admin/store.tsx`, change the import on line 5 from:

```ts
import { CYBER_LOVE_PRODUCTS } from '@/lib/products'
```

to:

```ts
import { ALL_PRODUCTS } from '@/lib/products'
```

Change line 16 to:

```ts
const STORAGE_KEY = 'scripts-admin-v3'
```

Change the body of `seedState` to:

```ts
export function seedState(): AdminState {
  return { products: [...ALL_PRODUCTS], orders: [...MOCK_ORDERS] }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run __tests__/adminStore.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all files pass. If `adminStats` tests fail, it is because mock order line items reference product names; report it rather than editing mock orders, since order data is deliberately denormalized.

- [ ] **Step 6: Commit**

```bash
git add lib/admin/store.tsx __tests__/adminStore.test.ts
git commit -m "feat(admin): seed from the full catalog so Basement products appear"
```

---

### Task 4: Add a Collection column to the admin products table

**Files:**
- Modify: `app/office-scr1pts-x7k2/products/page.tsx:230-238` (header), `:265-272` (body cells), `:241-246` (colSpan)

**Interfaces:**
- Consumes: nothing new. The `collection` filter state and `collections` memo already exist at lines 104 and 107-110 — do not re-add them.

- [ ] **Step 1: Add the header cell**

In the `<thead>` row, insert a Collection header between `Inventory` and `Type`:

```tsx
                <th className="px-5 py-3 font-medium">Inventory</th>
                <th className="px-5 py-3 font-medium">Collection</th>
                <th className="px-5 py-3 font-medium">Type</th>
```

- [ ] **Step 2: Add the body cell**

In the `visible.map` row, insert the matching cell between the Inventory `<td>` and the Type `<td>`:

```tsx
                  <td className="px-5 py-3">
                    <InventoryCell product={p} />
                  </td>
                  <td className="px-5 py-3 text-grey max-w-[160px] truncate">
                    {p.collection}
                  </td>
                  <td className="px-5 py-3 text-grey max-w-[140px] truncate">
                    {p.productType}
                  </td>
```

- [ ] **Step 3: Update both empty-state colSpans**

The table now has 8 columns. Change both `colSpan={7}` occurrences to `colSpan={8}`:

```tsx
                <tr><td colSpan={8} className="px-5 py-8 text-center text-grey">No products yet — add your first drop</td></tr>
```

```tsx
                <tr><td colSpan={8} className="px-5 py-8 text-center text-grey">No products match your filters</td></tr>
```

- [ ] **Step 4: Bump the table min-width**

The table declares `min-w-[760px]`; an eighth column needs more room. Change that class to `min-w-[880px]`.

- [ ] **Step 5: Verify in the browser**

Run `npm run dev`, open `http://localhost:3000/office-scr1pts-x7k2/products`, and confirm: 12 rows, a Collection column showing `1-800-Cyber-Love` and `Basement`, and selecting `Basement` in the collection filter narrows to 4 rows.

- [ ] **Step 6: Typecheck and commit**

```bash
npx tsc --noEmit
git add app/office-scr1pts-x7k2/products/page.tsx
git commit -m "feat(admin): show collection as its own products-table column"
```

---

### Task 5: Replace the PDP swatch picker with sibling colourway links

**Files:**
- Modify: `app/products/[slug]/ProductDetail.tsx` — lines 24-27, 38-41, 46-60, 69-79, 234-257, 317

**Interfaces:**
- Consumes: `siblingColorways(product)` and `colorwayLabel(product)` from `@/lib/products` (Task 2).
- Produces: no new exports.

**Why:** with one colourway per product the picker has nothing to switch. Every `colorAxis` branch already has a `colorAxis < 0` fallback, so removing the axis degrades cleanly and the colourway-scoped gallery filtering becomes dead code.

- [ ] **Step 1: Delete the colourway state**

Remove lines 24-27 entirely:

```tsx
  const colorAxis = product.options.findIndex((o) => o.name === 'Colorway')
  const colorways = colorAxis >= 0 ? product.options[colorAxis].values : []

  const [colorway, setColorway] = useState<string>(colorways[0] ?? '')
```

- [ ] **Step 2: Simplify variant lookup**

Replace the `variantFor` definition:

```tsx
  const variantFor = (s: string) =>
    product.variants.find((v) => sizeAxis < 0 || v.optionValues[sizeAxis] === s)
```

- [ ] **Step 3: Simplify the gallery**

Replace the entire colourway-scoped gallery block (the `claimedIds` / `colorwayImageIds` / `gallery` computation and its comment) with:

```tsx
  // One colourway per product, so the gallery is simply this product's media
  // in position order — no filtering needed.
  const images = product.media.map((m) => m.url)
```

- [ ] **Step 4: Fix the effects**

Delete the size-reset effect entirely:

```tsx
  useEffect(() => { setSize(null) }, [colorway])
```

and change the image-sync effect's dependency array from `[heroUrl, colorway]` to `[heroUrl]`:

```tsx
  useEffect(() => {
    const idx = heroUrl ? images.indexOf(heroUrl) : -1
    setActiveImage(idx >= 0 ? idx : 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroUrl])
```

- [ ] **Step 5: Replace the picker with sibling links**

Replace the whole `{colorways.length > 1 && ( ... )}` block (lines 234-257) with:

```tsx
            {siblings.length > 0 && (
              <motion.div variants={item} className="mb-5">
                <span className={`block text-[11px] uppercase tracking-[0.14em] ${textMuted} mb-2`}>
                  Other colourways
                </span>
                <div className="flex flex-wrap gap-2">
                  {siblings.map((s) => (
                    <Link
                      key={s.slug}
                      href={`/products/${s.slug}`}
                      className={`h-11 px-4 flex items-center text-[12px] font-bold tracking-[0.04em] border rounded transition-colors duration-150 ${sizeUnselected}`}
                    >
                      {colorwayLabel(s)}
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}
```

Add near the other derived values at the top of the component:

```tsx
  const siblings = siblingColorways(product)
```

Add the imports at the top of the file. `next/link` is **not** currently imported here (only `next/image` on line 4), so both lines are new:

```tsx
import Link from 'next/link'
import { colorwayLabel, siblingColorways } from '@/lib/products'
```

- [ ] **Step 6: Fix the description sentence**

Line 317 opens with `{colorway} colorway.` which no longer has a variable. Change it to use the product's own label:

```tsx
              {colorwayLabel(product)} colorway. {product.fit} {product.fabric}, {product.fabricWeight}. Printed graphic on front. Part of the &ldquo;Emotions&rdquo; collection. {product.modelNote}
```

- [ ] **Step 7: Typecheck and lint**

Run: `npx tsc --noEmit && npx next lint`
Expected: no errors. A `'useState' is defined but never used` warning means an import needs trimming — `useState` is still used for `size`, `activeImage` and `added`, so it should stay.

- [ ] **Step 8: Verify in the browser**

Run `npm run dev` and check:
- `http://localhost:3000/products/anxiety-white` — one "Other colourways" chip reading `Army Green`, linking to `/products/anxiety-green`.
- `http://localhost:3000/products/are-you-okay-black` — two chips.
- `http://localhost:3000/products/mj-white` — no chip row at all.
- `http://localhost:3000/products/anxiety` — redirects to `/products/anxiety-white`.

- [ ] **Step 9: Commit**

```bash
git add app/products/\[slug\]/ProductDetail.tsx
git commit -m "feat(pdp): link sibling colourways instead of a swatch picker"
```

---

### Task 6: Update the PRD

**Files:**
- Modify: `PRD.md:248`, plus a new Change Log entry

- [ ] **Step 1: Correct the catalog description**

Line 248 currently reads:

> The storefront catalog ships with **6 products**, each carrying a colour option; the product detail page shows a **colourway swatch picker** so shoppers pick a variant directly, with stock-aware size selection layered on top.

Replace it with:

> The storefront catalog ships with **12 products** — 8 in the inventory collection and 4 in the Basement — one per emotion/colourway pair. Each product carries a single **Size** axis; the product detail page links **sibling colourways** as separate products, with stock-aware size selection layered on top.

Leave the 2026-08-01 Change Log entry on line 313 alone — it is a historical record of what shipped that day.

- [ ] **Step 2: Add a Change Log entry**

Append to the Change Log, following the existing format:

```markdown
- **2026-08-03** — **Catalog split one product per colourway.** `migrateProducts` now groups by `collection|emotion|colorway`, so the catalog is **12 products** (8 inventory + 4 Basement) with a single **Size** axis each, keeping the original pre-split slugs (`anxiety-white`). The PDP's colourway swatch picker is replaced by **"Other colourways"** links to sibling products, and `LEGACY_SLUG_REDIRECTS` inverts to send merged slugs (`/products/anxiety`) to that emotion's White colourway. The admin now seeds from `ALL_PRODUCTS`, so the **Basement's 4 products reach the back office for the first time**, managed in the same list with a Collection column and filter. Storage key bumped to `scripts-admin-v3` (the v2 payload's ids, slugs and axes no longer match). Spec: `docs/superpowers/specs/2026-08-01-catalog-split-and-basement-admin-design.md`.
```

- [ ] **Step 3: Run the full suite one last time**

Run: `npm test && npx tsc --noEmit`
Expected: all tests pass, no type errors.

- [ ] **Step 4: Commit**

```bash
git add PRD.md
git commit -m "docs(prd): record the catalogue split to 12 products"
```

---

## Self-review notes

**Spec coverage.** Spec §1 (one product per colourway) → Task 1. §2 (slug redirects flip) → Task 2. §3 (Basement in admin) → Tasks 3 and 4. §4 (colourway navigation on the PDP) → Task 5. §5 (tests) → assertions distributed across Tasks 1-3. §6 (documentation) → Task 6.

**Deviation from the spec, deliberate.** Spec §3 says the products table "gains a Collection column and a collection filter." The filter already exists in `app/office-scr1pts-x7k2/products/page.tsx` (state at line 104, `<select>` at lines 165-170), so Task 4 adds only the column. Flagged rather than silently rebuilt.

**Detail the spec left open.** The skuRoot rule says "first 3 alphanumeric characters," but `MJ` has only two. Task 1 takes the unpadded `MJ`, giving `BSM-MJ-WHI`, which is still unique across all 12. Covered by an explicit test.

**Sibling chip labels.** The spec does not say where the chip's text comes from. Since the split removes the Colorway axis, the colourway survives only inside the product name (`"ANXIETY" — White`), so `colorwayLabel()` parses it back out. Adding a dedicated field to `Product` was the alternative and was rejected as a wider schema change than this chunk warrants.
