import type { Decoration } from "@/game/world/types";

/**
 * The sofa — the ONLY place that knows how its hand-drawn slices lay out.
 *
 * Five authored 64px tiles (see `scripts/import-fixtures.py`), laid in the
 * order they were drawn: slice 1 top-left (the upright back), then 2–5 left to
 * right along the seat row beneath it. Slice 2 carries the left arm and leg,
 * slice 5 the right arm and leg; 3 and 4 are the middle cushions.
 *
 *     1 . . .
 *     2 3 4 5
 *
 * Sequential segments, not variants — 3 only reads between 2 and 4.
 *
 * Every slice is solid — the sofa is furniture you walk around, not onto.
 */

export const SOFA_SLICES = 5;

/** Texture key for one slice — also the world-data `artKey`. 1-indexed. */
export const sofaTileKey = (index: number): string => `sofa-${index}`;

/** Where BootScene loads that slice from. */
export const sofaTilePath = (index: number): string => `/assets/sofa/${sofaTileKey(index)}.png`;

/** Every slice, in draw order. */
export const allSofaTiles = (): number[] =>
  Array.from({ length: SOFA_SLICES }, (_, i) => i + 1);

/** Offset of each slice from the sofa's top-left tile, in slice order. */
const SLICE_OFFSETS: Array<{ dx: number; dy: number }> = [
  { dx: 0, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 1, dy: 1 },
  { dx: 2, dy: 1 },
  { dx: 3, dy: 1 },
];

const TILE_KEYS = new Set(allSofaTiles().map(sofaTileKey));

/** True when a texture key names a sofa slice. */
export const isSofaTile = (key: string): boolean => TILE_KEYS.has(key);

/** The sofa's four cushion tiles, given its anchor — the seat zone in the room. */
export function sofaCushions(at: { tileX: number; tileY: number }): Array<{ x: number; y: number }> {
  return SLICE_OFFSETS.slice(1).map((off) => ({
    x: at.tileX + off.dx,
    y: at.tileY + off.dy,
  }));
}

/**
 * Expand the sofa into its per-tile decorations, anchored at the back's tile.
 * All five slices block movement.
 */
export function sofa(at: { tileX: number; tileY: number }): Decoration[] {
  return SLICE_OFFSETS.map((off, i) => ({
    tileX: at.tileX + off.dx,
    tileY: at.tileY + off.dy,
    artKey: sofaTileKey(i + 1),
    solid: true,
  }));
}
