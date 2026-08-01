import type { Availability, Product, ProductOption, ProductVariant } from '@/types/product'

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

const keyOf = (values: string[]) => values.join(' / ')

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
