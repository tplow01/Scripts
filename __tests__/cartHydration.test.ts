import { createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CartProvider, useCart } from '@/lib/cart'
import { CYBER_LOVE_PRODUCTS } from '@/lib/products'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const [first, second] = CYBER_LOVE_PRODUCTS
const savedVariant = first.variants[0]
const newVariant = second.variants[0]
const KEY = 'scripts-cart'

let api: ReturnType<typeof useCart>
function Probe(): ReactNode {
  api = useCart()
  return null
}

const stored = () => JSON.parse(window.localStorage.getItem(KEY) ?? '[]') as { variantId: string; quantity: number }[]

describe('cart hydration', () => {
  let root: Root
  let container: HTMLElement
  let resolveOk = false

  beforeEach(() => {
    vi.useFakeTimers()
    window.localStorage.setItem(KEY, JSON.stringify([{ variantId: savedVariant.id, quantity: 2 }]))
    resolveOk = false
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        if (!resolveOk) throw new Error('offline')
        return { ok: true, json: async () => ({ items: [{ product: first, variant: savedVariant, quantity: 2 }] }) }
      }),
    )
    container = document.createElement('div')
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    vi.useRealTimers()
    vi.unstubAllGlobals()
    window.localStorage.clear()
  })

  const mount = async () => {
    await act(async () => {
      root.render(createElement(CartProvider, null, createElement(Probe)))
    })
  }

  it('keeps the saved cart when the lookup fails and the shopper then adds something', async () => {
    await mount()
    await act(async () => api.add(second, newVariant))

    // The saved line must still be there. Before the fix it was overwritten
    // with just the new item.
    expect(stored().map((i) => i.variantId)).toContain(savedVariant.id)
  })

  it('recovers on retry: saved and new items are both in the bag and the store', async () => {
    await mount()
    await act(async () => api.add(second, newVariant))

    resolveOk = true
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500)
    })

    const ids = api.items.map((i) => i.variant.id).sort()
    expect(ids).toEqual([savedVariant.id, newVariant.id].sort())
    expect(stored().map((i) => i.variantId).sort()).toEqual(ids)
    expect(stored().find((i) => i.variantId === savedVariant.id)?.quantity).toBe(2)
  })

  it('still persists normally when the lookup succeeds', async () => {
    resolveOk = true
    await mount()
    await act(async () => api.add(second, newVariant))
    expect(stored().map((i) => i.variantId).sort()).toEqual([savedVariant.id, newVariant.id].sort())
  })
})
