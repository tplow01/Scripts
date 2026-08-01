import type { ProductOption, ProductVariant } from '@/types/product'

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
