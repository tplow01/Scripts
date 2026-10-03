/**
 * Where an order is in its life.
 *
 * SCR!PTS fulfils through a maker, so an order spends most of its time in
 * `making` — paid for, handed over, not yet dispatched. Only `shipped` emails
 * the customer about movement; `delivered` sends the thank-you.
 */
export type OrderStatus = 'paid' | 'making' | 'shipped' | 'delivered'

/** In lifecycle order — drives the dropdown and the timeline. */
export const ORDER_STATUSES: readonly OrderStatus[] = ['paid', 'making', 'shipped', 'delivered']

export interface OrderCustomer {
  /** The buyer: who paid, whose email gets the receipt. */
  name: string
  email: string
  phone: string
  /** Display lines, e.g. ['14 Mercer Street', 'London, WC2H 9QP, UK'] */
  address: string[]
  /**
   * The name on the parcel, present ONLY when it is somebody other than the
   * buyer (a gift). Absent means the buyer. The webhook is the single place
   * that decides this; everything else just reads it.
   */
  recipient?: string
}

/** The name to print above the address: the recipient, else the buyer. */
export function shipToName(customer: OrderCustomer): string {
  return customer.recipient || customer.name
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
  /** Handed to the maker. */
  makingAt: string | null
  shippedAt: string | null
  deliveredAt: string | null
}

/** Rich mock order. Denormalized on purpose: deleting a product never breaks an order. */
export interface AdminOrder {
  id: string // 'SCR-1042'
  customer: OrderCustomer
  lineItems: OrderLineItem[]
  subtotal: number
  shipping: number // 0 = included in the price (flat pricing)
  total: number // subtotal + shipping
  date: string // 'YYYY-MM-DD' (sort key)
  status: OrderStatus
  paymentStatus: 'paid' | 'refunded'
  timeline: OrderTimeline
}
