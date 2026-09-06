import { describe, it, expect } from 'vitest'

import { anyClaims, claims, type TileClaim } from '@/game/world/occupancy'

const standing = (x: number, y: number): TileClaim => ({ tileX: x, tileY: y, pending: null })
const walking = (from: [number, number], to: [number, number]): TileClaim => ({
  tileX: from[0],
  tileY: from[1],
  pending: { x: to[0], y: to[1] },
})

describe('claims', () => {
  it('holds the tile it is standing on', () => {
    expect(claims(standing(5, 5), 5, 5)).toBe(true)
    expect(claims(standing(5, 5), 6, 5)).toBe(false)
  })

  it('holds BOTH tiles mid-step — the one being left and the one being entered', () => {
    const a = walking([5, 5], [6, 5])
    expect(claims(a, 5, 5)).toBe(true)
    expect(claims(a, 6, 5)).toBe(true)
  })

  it('releases the origin once the step lands', () => {
    const landed = standing(6, 5)
    expect(claims(landed, 5, 5)).toBe(false)
    expect(claims(landed, 6, 5)).toBe(true)
  })
})

describe('the bug this fixes', () => {
  it('refuses two actors converging on the same tile', () => {
    // The player is mid-step onto (6,5); its logical tile is still (5,5).
    const player = walking([5, 5], [6, 5])
    // An NPC at (7,5) now asks whether it may step onto (6,5).
    // Before the fix this read the player at (5,5), saw (6,5) as free, and both
    // actors landed on the same tile.
    expect(anyClaims([player], 6, 5)).toBe(true)
  })

  it('refuses a straight swap', () => {
    const player = walking([5, 5], [6, 5])
    const npc = standing(6, 5)
    expect(anyClaims([npc], 6, 5)).toBe(true)
    expect(anyClaims([player], 5, 5)).toBe(true)
  })

  it('refuses two NPCs targeting the same tile', () => {
    const a = walking([4, 5], [5, 5])
    const b = standing(6, 5)
    expect(anyClaims([a, b], 5, 5, b)).toBe(true)
  })

  it('still allows a tile nobody is on or heading to', () => {
    const a = walking([5, 5], [6, 5])
    const b = standing(9, 9)
    expect(anyClaims([a, b], 7, 5)).toBe(false)
  })

  it('ignores the asking actor’s own claim', () => {
    const self = walking([5, 5], [6, 5])
    expect(anyClaims([self], 6, 5, self)).toBe(false)
  })
})
