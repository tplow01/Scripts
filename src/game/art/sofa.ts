import type { Decoration } from "@/game/world/types";

/**
 * The sofa — the ONLY place that knows how its hand-drawn slices lay out.
 *
 * Four authored 64px tiles laid left to right in a single row: slice 1 the
 * left arm, 2 and 3 the middle cushions, 4 the right arm.
 *
 *     1 2 3 4
 *
 * Sequential segments, not variants — 3 only reads between 2 and 4. Every
 * slice is solid; walk around the sofa, not onto it.
 */

export const SOFA_SLICES = 4;

/** Texture key for one slice — also the world-data `artKey`. 1-indexed. */
export const sofaTileKey = (index: number): string => `sofa-${index}`;

/** Where BootScene loads that slice from. */
export const sofaTilePath = (index: number): string => `/assets/sofa/${sofaTileKey(index)}.png`;

/** Every slice, in draw order. */
export const allSofaTiles = (): number[] =>
  Array.from({ length: SOFA_SLICES }, (_, i) => i + 1);

/** Offset of each slice from the sofa's left tile, in slice order. */
const SLICE_OFFSETS: Array<{ dx: number; dy: number }> = [
  { dx: 0, dy: 0 },
  { dx: 1, dy: 0 },
  { dx: 2, dy: 0 },
  { dx: 3, dy: 0 },
];

const TILE_KEYS = new Set(allSofaTiles().map(sofaTileKey));

/** True when a texture key names a sofa slice. */
export const isSofaTile = (key: string): boolean => TILE_KEYS.has(key);

/** The sofa's tiles, given its anchor — the seat zone in the room. */
export function sofaCushions(at: { tileX: number; tileY: number }): Array<{ x: number; y: number }> {
  return SLICE_OFFSETS.map((off) => ({
    x: at.tileX + off.dx,
    y: at.tileY + off.dy,
  }));
}

/**
 * Expand the sofa into its per-tile decorations, anchored at the left tile.
 * Every slice blocks movement.
 */
export function sofa(at: { tileX: number; tileY: number }): Decoration[] {
  return SLICE_OFFSETS.map((off, i) => ({
    tileX: at.tileX + off.dx,
    tileY: at.tileY + off.dy,
    artKey: sofaTileKey(i + 1),
    solid: true,
  }));
}
