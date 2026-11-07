// __tests__/ordersRepoTax.test.ts
//
// Sales tax is added on top of the $55 where Stripe Tax has a registration.
// The order has to carry that amount, or a taxed order's lines would not add
// up to its total anywhere it is shown.
import { beforeEach, describe, expect, it, vi } from 'vitest'

type Row = Record<string, unknown>
let stored: Row | null = null
const inserted: { table: string; payload: Row | Row[] }[] = []

vi.mock('@/lib/server/supabase', () => ({
  isDatabaseConfigured: () => true,
  serverClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: table === 'orders' ? stored : null, error: null }) }),
      }),
      insert: async (payload: Row | Row[]) => {
        inserted.push({ table, payload })
        if (table === 'orders' && !Array.isArray(payload)) {
          stored = { ...payload, placed_at: '2026-11-06T18:00:00Z', making_at: null, shipped_at: null, delivered_at: null, order_items: [] }
        }
        return { error: null }
      },
    }),
    rpc: async (fn: string) => (fn === 'next_order_number' ? { data: 'SCR-1061', error: null } : { data: null, error: null }),
  }),
}))

const input = (tax: number) => ({
  stripeSessionId: 'cs_test_tax',
  stripePaymentIntent: 'pi_1',
  customer: { name: 'Maya Okafor', email: 'maya@example.com', phone: '', address: ['655 Valencia St', 'San Francisco, CA 94110, US'], recipient: null },
  lines: [],
  subtotal: 55,
  shipping: 0,
  tax,
  total: 55 + tax,
})

const orderInsert = () => inserted.find((i) => i.table === 'orders')!.payload as Row

beforeEach(() => {
  stored = null
  inserted.length = 0
})

describe('createPaidOrder — sales tax', () => {
  it('writes the tax Stripe collected and reads it back on the order', async () => {
    const { createPaidOrder } = await import('@/lib/server/orders.repo')
    const { order, created } = await createPaidOrder(input(4.95))
    expect(created).toBe(true)
    expect(orderInsert()).toMatchObject({ tax: 4.95, total: 59.95 })
    expect(order.tax).toBe(4.95)
  })

  it('leaves the tax column out of the insert when nothing was charged, so the column can land after the code', async () => {
    // Every order until the first state is registered carries zero tax. Not
    // naming the column then means a deploy that outruns migration 0012 still
    // records orders; only a real tax amount needs the column to exist.
    const { createPaidOrder } = await import('@/lib/server/orders.repo')
    const { order } = await createPaidOrder(input(0))
    expect(orderInsert()).not.toHaveProperty('tax')
    expect(order.tax).toBe(0)
  })
})
