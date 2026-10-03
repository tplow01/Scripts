import type { Product } from '@/types/product'

/**
 * Where a product lives on the site.
 *
 * The storefront listing, the sitemap and the product page's robots tag all
 * key off `isBasement` — never off the Collection label — so this is the one
 * place the back office turns that flag into words and back. Main-floor pieces
 * list on /inventory and in search engines; Basement pieces list only on
 * /basement, reachable from the hidden room, and are kept out of every index.
 */
export type Placement = 'main-floor' | 'basement'

export const PLACEMENTS: readonly { value: Placement; label: string }[] = [
  { value: 'main-floor', label: 'Main floor' },
  { value: 'basement', label: 'Basement' },
]

export const placementOf = (p: Pick<Product, 'isBasement'>): Placement =>
  p.isBasement ? 'basement' : 'main-floor'

/** Pure: a copy of the product with only `isBasement` changed. */
export const withPlacement = (p: Product, placement: Placement): Product => ({
  ...p,
  isBasement: placement === 'basement',
})
