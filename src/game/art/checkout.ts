import type { Decoration } from "@/game/world/types";

/**
 * The checkout counter — the ONLY place that knows how its hand-drawn slices
 * lay into the counter's L footprint.
 *
 * Six authored 64px tiles (see `scripts/import-fixtures.py`), laid in the order
 * they were drawn: slice 1 top-left, slice 2 to its right, then slices 3–6 down
 * the right-hand column. That is exactly the six SOLID cells of the counter's
 * 2×5 L — the bottom-left 1×4 cutout is Heath's lane behind the counter and
 * stays empty (see `mainRoom.ts`).
 *
 *     1 2
 *     . 3
 *     . 4
 *     . 5
 *     . 6
 *
 * The slices are sequential segments, not variants: 4 only reads between 3 and
 * 5, and the end slices carry chamfers in their alpha, so the importer must
 * never bounding-box crop them.
 */

export const COUNTER_SLICES = 6;

/** Texture key for one slice — also the world-data `artKey`. 1-indexed. */
export const checkoutTileKey = (index: number): string => `checkout-${index}`;

/** Where BootScene loads that slice from. */
export const checkoutTilePath = (index: number): string =>
  `/assets/checkout/${checkoutTileKey(index)}.png`;

/** Every slice, in draw order. */
export const allCheckoutTiles = (): number[] =>
  Array.from({ length: COUNTER_SLICES }, (_, i) => i + 1);

/** Offset of each slice from the counter's top-left tile, in slice order. */
const SLICE_OFFSETS: Array<{ dx: number; dy: number }> = [
  { dx: 0, dy: 0 },
  { dx: 1, dy: 0 },
  { dx: 1, dy: 1 },
  { dx: 1, dy: 2 },
  { dx: 1, dy: 3 },
  { dx: 1, dy: 4 },
];

const TILE_KEYS = new Set(allCheckoutTiles().map(checkoutTileKey));

/** True when a texture key names a checkout slice. */
export const isCheckoutTile = (key: string): boolean => TILE_KEYS.has(key);

/**
 * Expand the counter into its per-tile decorations, anchored at the L's
 * top-left tile. The counter's collision and its "talk to the cashier"
 * behaviour still come from the single `checkout` interaction in `mainRoom.ts`
 * — these are art only.
 */
export function checkoutCounter(at: { tileX: number; tileY: number }): Decoration[] {
  return SLICE_OFFSETS.map((off, i) => ({
    tileX: at.tileX + off.dx,
    tileY: at.tileY + off.dy,
    artKey: checkoutTileKey(i + 1),
  }));
}
