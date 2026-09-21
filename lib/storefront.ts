import type { Product } from '@/types/product'
import { LOW_STOCK_THRESHOLD } from '@/lib/admin/config'

/**
 * What a shopper's browser is allowed to know about a product.
 *
 * Products come out of the database with back-office fields on them: wholesale
 * cost, SKU, barcode, weight and the exact stock count. Anything passed to a
 * client component is serialised into the page HTML, and anything returned from
 * a public route is readable by anyone, so both go through this first.
 *
 * Stock is capped rather than removed. The storefront only needs "is any
 * left?" and "Only N left" (at or below LOW_STOCK_THRESHOLD), so a cap of
 * threshold + 1 keeps both working without publishing how many are in the
 * warehouse. Checkout and the back office read the real values server-side.
 */
export function toStorefrontProduct(product: Product): Product {
  return {
    ...product,
    skuRoot: '',
    variants: product.variants.map((v) => ({
      ...v,
      sku: '',
      barcode: null,
      cost: null,
      weightGrams: null,
      stock: Math.min(v.stock, LOW_STOCK_THRESHOLD + 1),
    })),
  }
}
