import type { Decoration } from "@/game/world/types";

/**
 * The floors and the entrance rug — the ONLY place that knows which authored
 * floor art exists and where it loads from.
 *
 * Like the cast and the wall murals, these are hand-drawn PNGs (see
 * `scripts/import-fixtures.py`) rather than procedural pixel art, so the floors
 * can be redrawn and re-imported without touching art code.
 */

export type FloorId = "shop-floor" | "basement-floor";

export const FLOOR_IDS = ["shop-floor", "basement-floor"] as const;

/** Where BootScene loads a floor from. The id doubles as its texture key. */
export const floorPath = (id: FloorId): string => `/assets/floors/${id}.png`;

/**
 * The entrance rug: one continuous 3-tile run laid left → right across the
 * walk-in gap. Sequential segments, not variants — the centre slice only reads
 * between the two ends.
 */
export const RUG_SLICES = 3;

/** Texture key for one rug slice — also the world-data `artKey`. 1-indexed. */
export const rugTileKey = (index: number): string => `entrance-rug-${index}`;

/** Where BootScene loads that slice from. */
export const rugTilePath = (index: number): string => `/assets/rug/${rugTileKey(index)}.png`;

/** Every rug slice, in draw order. */
export const allRugTiles = (): number[] =>
  Array.from({ length: RUG_SLICES }, (_, i) => i + 1);

const FLOOR_KEYS = new Set<string>(FLOOR_IDS);
const RUG_KEYS = new Set(allRugTiles().map(rugTileKey));

/** True when a texture key names a floor or a rug slice. */
export const isFloorArt = (key: string): boolean =>
  FLOOR_KEYS.has(key) || RUG_KEYS.has(key);

/** True when a texture key names a rug slice (it lies flat on the floor). */
export const isRugTile = (key: string): boolean => RUG_KEYS.has(key);

/**
 * Expand the rug into its per-tile decorations, laid left to right from the
 * anchor — one readable line in `mainRoom.ts` instead of three near-identical
 * entries.
 */
export function entranceRug(at: { tileX: number; tileY: number }): Decoration[] {
  return allRugTiles().map((index) => ({
    tileX: at.tileX + index - 1,
    tileY: at.tileY,
    artKey: rugTileKey(index),
  }));
}
