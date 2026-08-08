import type { Decoration } from "@/game/world/types";

/**
 * The shop's wall murals — the ONLY place that knows which walls exist and how
 * their slices are named.
 *
 * Each mural is one continuous hand-drawn wall, exported as a run of square
 * tiles that stitch left to right (see `scripts/import-walls.py`). They are
 * sequential segments, NOT interchangeable variants: slice 3 only reads
 * correctly between slice 2 and slice 4.
 *
 * The end slices carry 45° chamfers in their alpha, so each wall reads as a
 * trapezoid — full width at the base, tapering at the top ends. That taper is
 * why the importer must never bounding-box crop these.
 */

export type MuralId =
  | "vinyl-wall"
  | "clothing-wall"
  | "basement-back-wall"
  | "basement-ledge-wall";

export const MURAL_IDS = [
  "vinyl-wall",
  "clothing-wall",
  "basement-back-wall",
  "basement-ledge-wall",
] as const;

/**
 * How many slices each mural ships as.
 *
 * The vinyl and clothing walls were both authored 8 tiles wide but hang on
 * 7-tile rows, so the importer drops one middle slice from each and shuffles
 * the rest left. Both ends survive — only plain wall is lost. See
 * `scripts/import-walls.py`.
 *
 * Every other mural is drawn at exactly the length of the row it hangs on.
 */
export const MURAL_SLICES: Record<MuralId, number> = {
  "vinyl-wall": 7,
  "clothing-wall": 7,
  "basement-back-wall": 5,
  "basement-ledge-wall": 6,
};

/** Texture key for one slice — also the world-data `artKey`. 1-indexed. */
export const muralTileKey = (id: MuralId, index: number): string => `${id}-${index}`;

/** Where BootScene loads that slice from. */
export const muralTilePath = (id: MuralId, index: number): string =>
  `/assets/walls/${muralTileKey(id, index)}.png`;

/** Every slice of every mural, in draw order. */
export function allMuralTiles(): Array<{ id: MuralId; index: number }> {
  return MURAL_IDS.flatMap((id) =>
    Array.from({ length: MURAL_SLICES[id] }, (_, i) => ({ id, index: i + 1 })),
  );
}

const TILE_KEYS = new Set(allMuralTiles().map(({ id, index }) => muralTileKey(id, index)));

/** True when a texture key names a mural slice (rather than a prop or character). */
export const isMuralTile = (key: string): boolean => TILE_KEYS.has(key);

/**
 * Expand one mural into per-tile decorations, laid left to right from the
 * anchor. Sixteen hand-written 1x1 entries would drown `mainRoom.ts`; this
 * keeps a wall to a single readable line there.
 *
 * Slices are never solid: they mount on tiles that are already `wall` in the
 * room data, so collision is unchanged by hanging art on them.
 */
export function mural(
  id: MuralId,
  at: { tileX: number; tileY: number; tiles: number },
): Decoration[] {
  if (at.tiles !== MURAL_SLICES[id]) {
    throw new Error(
      `mural("${id}") asked for ${at.tiles} tiles, but ${id} has ${MURAL_SLICES[id]} slices.`,
    );
  }
  return Array.from({ length: at.tiles }, (_, i) => ({
    tileX: at.tileX + i,
    tileY: at.tileY,
    artKey: muralTileKey(id, i + 1),
  }));
}
