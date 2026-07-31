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
