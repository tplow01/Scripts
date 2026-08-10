import type { Decoration } from "@/game/world/types";

/**
 * The vinyl deck — the ONLY place that knows how its two hand-drawn slices lay
 * out. Slice 1 is the left tile, slice 2 the right; the record itself straddles
 * the seam, so they only read together and in that order.
 *
 * The deck's collision and its "play the record" behaviour stay on the
 * `vinylDesk` interaction in `mainRoom.ts`; `solid` here only drives each
 * slice's contact shadow.
 */

export const DECK_SLICES = 2;

/** Texture key for one slice — also the world-data `artKey`. 1-indexed. */
export const deckTileKey = (index: number): string => `vinyl-deck-${index}`;

/** Where BootScene loads that slice from. */
export const deckTilePath = (index: number): string => `/assets/deck/${deckTileKey(index)}.png`;

/** Both slices, in draw order. */
export const allDeckTiles = (): number[] =>
  Array.from({ length: DECK_SLICES }, (_, i) => i + 1);

const TILE_KEYS = new Set(allDeckTiles().map(deckTileKey));

/** True when a texture key names a vinyl-deck slice. */
export const isDeckTile = (key: string): boolean => TILE_KEYS.has(key);

/** Expand the deck into its two decorations, laid left to right from the anchor. */
export function vinylDeck(at: { tileX: number; tileY: number }): Decoration[] {
  return allDeckTiles().map((index) => ({
    tileX: at.tileX + index - 1,
    tileY: at.tileY,
    artKey: deckTileKey(index),
    solid: true,
  }));
}
