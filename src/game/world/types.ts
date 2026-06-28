/**
 * World-data types — the *what and where*, never the *how it looks*.
 *
 * A Room is plain data: a tile grid, a spawn point, and interaction objects.
 * Art is referenced only by `artKey` (resolved separately in the art registry),
 * so graphics can be swapped without touching this layer.
 */

export type TileType = "floor" | "wall";

export type InteractionType = "rack" | "checkout" | "stairs";

export interface Interaction {
  /** Stable unique id within the room. */
  id: string;
  type: InteractionType;
  tileX: number;
  tileY: number;
  /** Key into the art registry — never an asset path. */
  artKey: string;
}

export interface Room {
  id: string;
  /** Pixel size of one tile (used by the renderer, not by world logic). */
  tileSize: number;
  width: number;
  height: number;
  /** Row-major: tiles[y][x]. */
  tiles: TileType[][];
  spawn: { tileX: number; tileY: number };
  interactions: Interaction[];
}
