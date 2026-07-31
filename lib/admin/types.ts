export type OrderStatus = 'pending' | 'shipped' | 'delivered'

export interface OrderCustomer {
  name: string
  email: string
  phone: string
  /** Display lines, e.g. ['14 Mercer Street', 'London, WC2H 9QP, UK'] */
  address: string[]
}

export interface OrderLineItem {
  /** Matches a catalog product name where possible — used to resolve the thumbnail. */
  productName: string
  size: string
  qty: number
  unitPrice: number
}

export interface OrderTimeline {
  placedAt: string // ISO datetime
  shippedAt: string | null
  deliveredAt: string | null
}

/** Rich mock order. Denormalized on purpose: deleting a product never breaks an order. */
export interface AdminOrder {
  id: string // 'SCR-1042'
  customer: OrderCustomer
  lineItems: OrderLineItem[]
  subtotal: number
  shipping: number // 0 = free
  total: number // subtotal + shipping
  date: string // 'YYYY-MM-DD' (sort key)
  status: OrderStatus
  paymentStatus: 'paid' | 'refunded'
  timeline: OrderTimeline
}
