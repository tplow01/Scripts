export type OrderStatus = 'pending' | 'shipped' | 'delivered'

/**
 * Mock order for the prototype. Items are a denormalized display string so
 * deleting a product never breaks an order.
 */
export interface AdminOrder {
  id: string // 'SCR-1042'
  customer: string
  items: string // '"RAGE" — Black ×1, "LOVE" — White ×2'
  total: number
  date: string // ISO 'YYYY-MM-DD'
  status: OrderStatus
}
