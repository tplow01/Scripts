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
 * Maps the pre-split `productId + size` key onto a variant id. Post-split
 * each colourway is its own product, so the id → product mapping is exact
 * and per-colourway rather than a best-effort merge.
 */
export function buildLegacyIndex(products: Product[]): LegacyIndex {
  const out: LegacyIndex = new Map()
  for (const product of products) {
    const sizeAxis = product.options.findIndex((o) => o.name === 'Size')
    if (sizeAxis < 0) continue
    for (const variant of product.variants) {
      // '::' must never appear inside a product id or a size value — it is not an
      // enforced invariant, just a data-shape assumption of the current catalog.
      const key = `${product.id}::${variant.optionValues[sizeAxis]}`
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
      const variantId = legacy.get(`${entry.id}::${entry.size}`)
      if (variantId) out.push({ variantId, quantity })
    }
  }
  return out
}
