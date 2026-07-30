import { describe, expect, it } from 'vitest'
import {
  addProduct, deleteProduct, parseStoredState, seedState,
  setOrderStatus, toggleProductStatus, updateProduct,
  type AdminState,
} from '@/lib/admin/store'
import type { Product } from '@/types/product'

const sample = (over: Partial<Product> = {}): Product => ({
  id: 'p1', name: '"TEST" — White', emotion: 'TEST', colorway: 'White',
  price: 44, collection: '1-800-Cyber-Love', status: 'available',
  image: null, backImage: null, slug: 'test-white', description: 'test',
  shipDate: 'July 2026', sizes: ['S', 'M'], careInstructions: [], fit: '',
  fabric: '', fabricWeight: '', modelNote: '', ...over,
})

describe('admin store actions', () => {
  it('seedState loads real catalog products and mock orders', () => {
    const s = seedState()
    expect(s.products.length).toBeGreaterThan(0)
    expect(s.orders.length).toBeGreaterThanOrEqual(8)
  })

  it('addProduct prepends; updateProduct replaces by id; deleteProduct removes', () => {
    let s: AdminState = { products: [sample()], orders: [] }
    s = addProduct(s, sample({ id: 'p2', name: 'second' }))
    expect(s.products[0].id).toBe('p2')
    s = updateProduct(s, sample({ id: 'p1', price: 60 }))
    expect(s.products.find((p) => p.id === 'p1')?.price).toBe(60)
    s = deleteProduct(s, 'p2')
    expect(s.products.map((p) => p.id)).toEqual(['p1'])
  })

  it('toggleProductStatus flips available↔pre-order and rescues sold-out to available', () => {
    let s: AdminState = { products: [sample({ status: 'available' })], orders: [] }
    s = toggleProductStatus(s, 'p1')
    expect(s.products[0].status).toBe('pre-order')
    s = toggleProductStatus(s, 'p1')
    expect(s.products[0].status).toBe('available')
    s = { products: [sample({ status: 'sold-out' })], orders: [] } as AdminState
    s = toggleProductStatus(s, 'p1')
    expect(s.products[0].status).toBe('available')
  })

  it('setOrderStatus updates only the target order', () => {
    const base = seedState()
    const target = base.orders[0].id
    const next = setOrderStatus(base, target, 'delivered')
    expect(next.orders.find((o) => o.id === target)?.status).toBe('delivered')
    expect(next.orders.filter((o) => o.status === base.orders[1].status).length).toBeGreaterThan(0)
  })

  it('parseStoredState returns null on corrupt/absent payloads', () => {
    expect(parseStoredState(null)).toBeNull()
    expect(parseStoredState('not json')).toBeNull()
    expect(parseStoredState('{"products": "nope"}')).toBeNull()
    const good = JSON.stringify(seedState())
    expect(parseStoredState(good)?.orders.length).toBeGreaterThan(0)
  })
})
