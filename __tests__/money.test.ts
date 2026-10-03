import { describe, it, expect } from 'vitest'

import { formatMoney, shippingLabel } from '@/lib/money'

describe('formatMoney', () => {
  it('always shows two decimals, so a whole-dollar price reads as currency', () => {
    expect(formatMoney(44)).toBe('$44.00')
  })

  it('keeps the cents of a fractional price rather than appending ".00" to it', () => {
    // The old string concat produced "$44.5.00" for this input.
    expect(formatMoney(44.5)).toBe('$44.50')
  })

  it('formats zero as money, not as a blank', () => {
    expect(formatMoney(0)).toBe('$0.00')
  })
})

describe('shippingLabel', () => {
  it('describes a zero charge as included, never as free', () => {
    // Flat pricing: shipping is part of the item price, so a zero line is not
    // a giveaway that could be withdrawn later.
    expect(shippingLabel(0)).toBe('Included')
    expect(shippingLabel(0)).not.toMatch(/free/i)
  })

  it('shows a real charge as money', () => {
    expect(shippingLabel(12)).toBe('$12.00')
  })
})
