import 'server-only'

import type { AdminOrder, OrderStatus } from '@/lib/admin/types'
import { MOCK_ORDERS } from '@/lib/admin/mockOrders'

import { isDatabaseConfigured, serverClient } from './supabase'

/**
 * Orders. Nothing writes real orders yet — the Stripe webhook will be the only
 * thing that ever calls `createOrder`, so an order can't exist without a
 * payment behind it. Until then the back office reads the mock set.
 */

interface OrderRow {
  id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  address: string[] | null
  subtotal: number | string
  shipping: number | string
  total: number | string
  status: OrderStatus
  payment_status: 'paid' | 'refunded'
  placed_at: string
  shipped_at: string | null
  delivered_at: string | null
  order_items?: {
    product_name: string
    size: string
    qty: number
    unit_price: number | string
  }[] | null
}

const num = (v: number | string): number => (typeof v === 'number' ? v : Number(v))

/** ISO datetime → the 'YYYY-MM-DD' sort key the admin's stats helpers expect. */
const dayOf = (iso: string): string => iso.slice(0, 10)

export function rowToOrder(row: OrderRow): AdminOrder {
  return {
    id: row.id,
    customer: {
      name: row.customer_name,
      email: row.customer_email,
      phone: row.customer_phone,
      address: row.address ?? [],
    },
    lineItems: (row.order_items ?? []).map((i) => ({
      productName: i.product_name,
      size: i.size,
      qty: i.qty,
      unitPrice: num(i.unit_price),
    })),
    subtotal: num(row.subtotal),
    shipping: num(row.shipping),
    total: num(row.total),
    date: dayOf(row.placed_at),
    status: row.status,
    paymentStatus: row.payment_status,
    timeline: {
      placedAt: row.placed_at,
      shippedAt: row.shipped_at,
      deliveredAt: row.delivered_at,
    },
  }
}

const SELECT = `
  id, customer_name, customer_email, customer_phone, address, subtotal,
  shipping, total, status, payment_status, placed_at, shipped_at, delivered_at,
  order_items ( product_name, size, qty, unit_price )
`

export async function listOrders(): Promise<AdminOrder[]> {
  if (!isDatabaseConfigured()) return MOCK_ORDERS

  const { data, error } = await serverClient()
    .from('orders')
    .select(SELECT)
    .order('placed_at', { ascending: false })
  if (error) throw new Error(`listOrders: ${error.message}`)
  return (data as unknown as OrderRow[]).map(rowToOrder)
}

/**
 * Set fulfilment status, stamping the matching timeline column. Mirrors
 * `setOrderStatus` in lib/admin/store.tsx so the admin behaves identically.
 */
export async function setOrderStatus(
  id: string,
  status: OrderStatus,
  now = new Date().toISOString(),
): Promise<AdminOrder | null> {
  const patch: Record<string, unknown> = { status }
  if (status === 'shipped') patch.shipped_at = now
  if (status === 'delivered') patch.delivered_at = now

  const { error } = await serverClient().from('orders').update(patch).eq('id', id)
  if (error) throw new Error(`setOrderStatus(${id}): ${error.message}`)

  const { data, error: readErr } = await serverClient()
    .from('orders')
    .select(SELECT)
    .eq('id', id)
    .maybeSingle()
  if (readErr) throw new Error(`setOrderStatus(${id}) reading back: ${readErr.message}`)
  return data ? rowToOrder(data as unknown as OrderRow) : null
}
