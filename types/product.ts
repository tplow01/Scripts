export type ProductStatus = 'available' | 'pre-order' | 'sold-out'

export interface Product {
  id: string
  name: string
  emotion: string
  colorway: string
  price: number
  collection: string
  status: ProductStatus
  image: string | null
  backImage: string | null
  slug: string
  description: string
  /** Estimated dispatch window shown in cart/checkout (pre-order drop). */
  shipDate: string
  sizes: string[]
  careInstructions: string[]
  fit: string
  fabric: string
  fabricWeight: string
  modelNote: string
}
