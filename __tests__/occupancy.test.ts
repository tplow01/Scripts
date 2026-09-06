import { describe, it, expect } from 'vitest'

import { blockedBy, blocks, occupies, type TileClaim } from '@/game/world/occupancy'

const standing = (x: number, y: number): TileClaim => ({ tileX: x, tileY: y, pending: null })
const walking = (from: [number, number], to: [number, number]): TileClaim => ({
  tileX: from[0],
  tileY: from[1],
  pending: { x: to[0], y: to[1] },
})

describe('blocks — what stops a step', () => {
  it('someone standing on the target blocks it', () => {
    expect(blocks(standing(6, 5), 5, 5, 6, 5)).toBe(true)
  })

  it('someone walking ONTO the target blocks it — the phasing bug', () => {
    // NPC at (7,5) is mid-step onto (6,5); we also want (6,5).
    // Before any of this both would have landed on (6,5) and overlapped.
    expect(blocks(walking([7, 5], [6, 5]), 5, 5, 6, 5)).toBe(true)
  })

  it('a head-on swap blocks — two actors trading places would slide through', () => {
    // They are on the tile we want, walking into the tile we are leaving.
    expect(blocks(walking([6, 5], [5, 5]), 5, 5, 6, 5)).toBe(true)
  })
})

describe('blocks — what should NOT stop a step', () => {
  it('lets us follow someone out of the tile they are leaving', () => {
    // They are walking (6,5) -> (7,5). We want (6,5). They are on their way out,
    // and not into our tile, so this is a pass-by — blocking it is what made
    // movement feel sticky.
    expect(blocks(walking([6, 5], [7, 5]), 5, 5, 6, 5)).toBe(false)
  })

  it('lets us cross behind someone walking perpendicular', () => {
    expect(blocks(walking([6, 5], [6, 4]), 5, 5, 6, 5)).toBe(false)
  })

  it('ignores actors nowhere near the step', () => {
    expect(blocks(standing(9, 9), 5, 5, 6, 5)).toBe(false)
    expect(blocks(walking([1, 1], [2, 1]), 5, 5, 6, 5)).toBe(false)
  })
})

describe('blockedBy', () => {
  it('blocks if any single actor does', () => {
    const crowd = [standing(9, 9), walking([7, 5], [6, 5])]
    expect(blockedBy(crowd, 5, 5, 6, 5)).toBe(true)
  })

  it('allows when every actor is clear', () => {
    const crowd = [standing(9, 9), walking([6, 5], [7, 5])]
    expect(blockedBy(crowd, 5, 5, 6, 5)).toBe(false)
  })

  it('never blocks on the asking actor’s own claim', () => {
    const self = walking([5, 5], [6, 5])
    expect(blockedBy([self], 5, 5, 6, 5, self)).toBe(false)
  })
})

describe('occupies — used for talking, not walking', () => {
  it('matches the tile being left and the tile being entered', () => {
    const a = walking([5, 5], [6, 5])
    expect(occupies(a, 5, 5)).toBe(true)
    expect(occupies(a, 6, 5)).toBe(true)
    expect(occupies(a, 7, 5)).toBe(false)
  })
})
