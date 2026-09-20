import { describe, expect, it } from 'vitest'

import { DEFAULT_SHIP_ESTIMATE, shipLine } from '@/lib/shipEstimate'

const NOW = new Date('2026-09-20T12:00:00Z')

describe('shipLine', () => {
  it('falls back to the standing estimate for a past month', () => {
    expect(shipLine('July 2026', NOW)).toBe(DEFAULT_SHIP_ESTIMATE)
  })
  it('falls back when there is no date', () => {
    expect(shipLine('', NOW)).toBe(DEFAULT_SHIP_ESTIMATE)
    expect(shipLine(null, NOW)).toBe(DEFAULT_SHIP_ESTIMATE)
  })
  it('keeps the current and future months as written', () => {
    expect(shipLine('September 2026', NOW)).toBe('Ships: September 2026')
    expect(shipLine('November 2026', NOW)).toBe('Ships: November 2026')
  })
  it('shows custom wording as written', () => {
    expect(shipLine('Made to order', NOW)).toBe('Ships: Made to order')
  })
})
