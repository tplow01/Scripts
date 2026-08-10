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
