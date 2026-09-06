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
export interface StatusChange {
  order: AdminOrder | null
  /**
   * False when the order was already in this status. The back office can PATCH
   * the same value repeatedly, and each one must not fire another email.
   */
  changed: boolean
}

export async function setOrderStatus(
  id: string,
  status: OrderStatus,
  now = new Date().toISOString(),
): Promise<StatusChange> {
  const before = await findOrder(id)
  const patch: Record<string, unknown> = { status }
  if (status === 'shipped') patch.shipped_at = now
  if (status === 'delivered') patch.delivered_at = now

  const { error } = await serverClient().from('orders').update(patch).eq('id', id)
  if (error) throw new Error(`setOrderStatus(${id}): ${error.message}`)

  const after = await findOrder(id)
  return { order: after, changed: Boolean(after) && before?.status !== status }
}

/** One order by its id. */
export async function findOrder(id: string): Promise<AdminOrder | null> {
  const { data, error } = await serverClient()
    .from('orders')
    .select(SELECT)
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`findOrder(${id}): ${error.message}`)
  return data ? rowToOrder(data as unknown as OrderRow) : null
}

// ── Writing orders (Stripe webhook only) ────────────────────────────────────

export interface NewOrderLine {
  variantId: string | null
  productName: string
  size: string
  qty: number
  unitPrice: number
}

export interface NewOrder {
  stripeSessionId: string
  stripePaymentIntent: string | null
  customer: { name: string; email: string; phone: string; address: string[] }
  lines: NewOrderLine[]
  subtotal: number
  shipping: number
  total: number
}

/** An order already written for this Stripe session, if any. */
export async function findOrderBySession(sessionId: string): Promise<AdminOrder | null> {
  const { data, error } = await serverClient()
    .from('orders')
    .select(SELECT)
    .eq('stripe_session_id', sessionId)
    .maybeSingle()
  if (error) throw new Error(`findOrderBySession: ${error.message}`)
  return data ? rowToOrder(data as unknown as OrderRow) : null
}

export interface CreatedOrder {
  order: AdminOrder
  /** False when this delivery was a replay of one already recorded. */
  created: boolean
}

/**
 * Record a paid order and take the stock.
 *
 * Idempotent by `stripe_session_id`, which is UNIQUE in the schema: Stripe
 * retries webhooks, and a retry must not create a second order or decrement
 * stock twice. Retries return the order that already exists.
 *
 * `created` matters as much as the order itself — without it the caller cannot
 * tell a fresh payment from a retry, and would email the customer again on
 * every redelivery.
 */
export async function createPaidOrder(input: NewOrder): Promise<CreatedOrder> {
  const existing = await findOrderBySession(input.stripeSessionId)
  if (existing) return { order: existing, created: false }

  const db = serverClient()

  const { data: numberData, error: numberErr } = await db.rpc('next_order_number')
  if (numberErr) throw new Error(`next_order_number: ${numberErr.message}`)
  const id = String(numberData)

  const { error: orderErr } = await db.from('orders').insert({
    id,
    customer_name: input.customer.name,
    customer_email: input.customer.email,
    customer_phone: input.customer.phone,
    address: input.customer.address,
    subtotal: input.subtotal,
    shipping: input.shipping,
    total: input.total,
    status: 'pending',
    payment_status: 'paid',
    stripe_session_id: input.stripeSessionId,
    stripe_payment_intent: input.stripePaymentIntent,
  })
  if (orderErr) {
    // A concurrent delivery of the same event won the race on the unique index.
    const raced = await findOrderBySession(input.stripeSessionId)
    if (raced) return { order: raced, created: false }
    throw new Error(`createPaidOrder(${id}): ${orderErr.message}`)
  }

  if (input.lines.length) {
    const { error: itemsErr } = await db.from('order_items').insert(
      input.lines.map((l) => ({
        order_id: id,
        product_name: l.productName,
        size: l.size,
        qty: l.qty,
        unit_price: l.unitPrice,
      })),
    )
    if (itemsErr) throw new Error(`createPaidOrder(${id}) items: ${itemsErr.message}`)
  }

  // Stock comes off after the order is safely recorded. Decrementing first
  // would lose the count if the insert then failed.
  for (const line of input.lines) {
    if (!line.variantId) continue
    const { error } = await db.rpc('decrement_variant_stock', {
      p_variant_id: line.variantId,
      p_qty: line.qty,
    })
    // A stock failure must not fail the webhook — the customer has paid and the
    // order exists. Surface it in the logs for someone to reconcile.
    if (error) console.error(`[order ${id}] stock not decremented for ${line.variantId}: ${error.message}`)
  }

  const written = await findOrderBySession(input.stripeSessionId)
  if (!written) throw new Error(`createPaidOrder(${id}): order vanished after insert`)
  return { order: written, created: true }
}
