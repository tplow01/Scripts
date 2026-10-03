import { describe, expect, it } from 'vitest'

import { PLACEMENTS, placementOf, withPlacement } from '@/lib/admin/placement'
import { blankProduct } from '@/lib/admin/store'

/**
 * Where a product shows on the site is the `isBasement` flag, not the
 * Collection label. The Placement control in the product editor is the only
 * way the back office can set that flag, so its mapping must be exact in both
 * directions and must never touch anything else on the product.
 */
describe('product placement', () => {
  it('offers exactly the two rooms, main floor first', () => {
    expect(PLACEMENTS.map((p) => p.value)).toEqual(['main-floor', 'basement'])
    expect(PLACEMENTS.map((p) => p.label)).toEqual(['Main floor', 'Basement'])
  })

  it('reads the flag back as a placement', () => {
    expect(placementOf({ isBasement: false })).toBe('main-floor')
    expect(placementOf({ isBasement: true })).toBe('basement')
  })

  it('a new product starts on the main floor', () => {
    expect(placementOf(blankProduct('p1'))).toBe('main-floor')
  })

  it('moving to the Basement sets only the flag', () => {
    const before = blankProduct('p1')
    const after = withPlacement(before, 'basement')

    expect(after.isBasement).toBe(true)
    expect({ ...after, isBasement: before.isBasement }).toEqual(before)
    // Pure: the original is untouched.
    expect(before.isBasement).toBe(false)
  })

  it('moving back to the main floor clears the flag', () => {
    const basement = { ...blankProduct('p1'), isBasement: true }
    expect(withPlacement(basement, 'main-floor').isBasement).toBe(false)
  })

  it('round-trips through the select value', () => {
    for (const { value } of PLACEMENTS) {
      expect(placementOf(withPlacement(blankProduct('p1'), value))).toBe(value)
    }
  })
})
