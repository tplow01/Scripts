import type { Decoration } from "@/game/world/types";

/**
 * The shop's clothing rails — the ONLY place that knows how their hand-drawn
 * slices lay out.
 *
 * Two runs of six authored 64px tiles (see `scripts/import-fixtures.py`):
 * the horizontal rail runs slice 1 (left) → 6 (right), the vertical one slice
 * 1 (top) → 6 (bottom). They meet at the shop's top-right corner, so the
 * horizontal's last slice and the vertical's first carry the corner art —
 * those are the ends to keep if a run is ever shortened.
 *
 * Sequential segments, not variants: each slice only reads in its own position.
 */

export type RailId = "rail-h" | "rail-v";

export const RAIL_IDS = ["rail-h", "rail-v"] as const;

/** How many slices each rail ships as. */
export const RAIL_SLICES: Record<RailId, number> = {
  "rail-h": 6,
  "rail-v": 6,
};

/** Texture key for one slice — also the world-data `artKey`. 1-indexed. */
export const railTileKey = (id: RailId, index: number): string => `${id}-${index}`;

/** Where BootScene loads that slice from. */
export const railTilePath = (id: RailId, index: number): string =>
  `/assets/rails/${railTileKey(id, index)}.png`;

/** Every slice of both rails, in draw order. */
export function allRailTiles(): Array<{ id: RailId; index: number }> {
  return RAIL_IDS.flatMap((id) =>
    Array.from({ length: RAIL_SLICES[id] }, (_, i) => ({ id, index: i + 1 })),
  );
}

const TILE_KEYS = new Set(allRailTiles().map(({ id, index }) => railTileKey(id, index)));

/** True when a texture key names a rail slice. */
export const isRailTile = (key: string): boolean => TILE_KEYS.has(key);

/**
 * Expand a rail into its per-tile decorations, laid from the anchor — left to
 * right for the horizontal run, top to bottom for the vertical one.
 *
 * The rails' collision comes from their `rack` interactions in `mainRoom.ts`;
 * these are art only.
 */
export function rail(id: RailId, at: { tileX: number; tileY: number }): Decoration[] {
  return Array.from({ length: RAIL_SLICES[id] }, (_, i) => ({
    tileX: at.tileX + (id === "rail-h" ? i : 0),
    tileY: at.tileY + (id === "rail-v" ? i : 0),
    artKey: railTileKey(id, i + 1),
  }));
}
