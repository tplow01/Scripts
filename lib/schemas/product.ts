import { z } from 'zod'

import { MAX_OPTIONS } from '@/types/product'
import type { Product } from '@/types/product'

/**
 * Request-body validation. Never trust a body — not even one our own admin
 * sent, since anyone can post to these routes once they're deployed.
 *
 * Shapes mirror `types/product.ts`; `satisfies` checks at the bottom of this
 * file fail the build if the two ever drift apart.
 */

export const productOptionSchema = z.object({
  name: z.string().min(1, 'Option name is required'),
  values: z.array(z.string().min(1)),
  position: z.number().int().min(1).max(MAX_OPTIONS),
})

export const productVariantSchema = z.object({
  id: z.string().min(1),
  productId: z.string().min(1),
  optionValues: z.array(z.string()),
  sku: z.string(),
  barcode: z.string().nullable(),
  price: z.number().nonnegative(),
  compareAtPrice: z.number().nonnegative().nullable(),
  cost: z.number().nonnegative().nullable(),
  stock: z.number().int(),
  trackInventory: z.boolean(),
  allowBackorder: z.boolean(),
  weightGrams: z.number().nonnegative().nullable(),
  imageId: z.string().nullable(),
  position: z.number().int().min(0),
})

export const productMediaSchema = z.object({
  id: z.string().min(1),
  url: z.string().min(1),
  alt: z.string(),
  position: z.number().int().min(0),
})

export const productSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Name is required'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase words separated by hyphens'),
  emotion: z.string(),
  description: z.string(),
  collection: z.string(),
  isBasement: z.boolean(),
  productType: z.string(),
  vendor: z.string(),
  tags: z.array(z.string()),
  publishedStatus: z.enum(['draft', 'active', 'archived']),
  skuRoot: z.string(),
  shipDate: z.string(),
  requiresShipping: z.boolean(),
  seo: z.object({ title: z.string(), description: z.string() }),
  options: z.array(productOptionSchema).max(MAX_OPTIONS),
  variants: z.array(productVariantSchema),
  media: z.array(productMediaSchema),
  fit: z.string(),
  fabric: z.string(),
  fabricWeight: z.string(),
  modelNote: z.string(),
  careInstructions: z.array(z.string()),
})

/** PATCH /api/admin/products/[id] — the only field the toggle may change. */
export const publishToggleSchema = z.object({
  publishedStatus: z.enum(['draft', 'active', 'archived']),
})

/** PATCH /api/admin/orders/[id] */
export const orderStatusSchema = z.object({
  status: z.enum(['pending', 'shipped', 'delivered']),
})

/** POST /api/cart/resolve */
export const cartResolveSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.string().min(1),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .max(100),
})

/** POST /api/newsletter */
export const newsletterSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  source: z.string().max(64).optional(),
})

export type ProductInput = z.infer<typeof productSchema>
export type CartResolveInput = z.infer<typeof cartResolveSchema>

// ── Drift guard ─────────────────────────────────────────────────────────────
// Assignable in both directions means the schema and the interface describe the
// same shape. Add a field to `Product` without adding it here (or vice versa)
// and the build fails instead of the mismatch reaching a request handler.
type AssertAssignable<A extends B, B> = A
export type _ProductInputMatchesProduct = AssertAssignable<ProductInput, Product>
export type _ProductMatchesProductInput = AssertAssignable<Product, ProductInput>
