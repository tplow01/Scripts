/**
 * World-data types — the *what and where*, never the *how it looks*.
 *
 * A Room is plain data: a tile grid, a spawn point, interaction objects, and
 * decorations. Art is referenced only by `artKey` (resolved separately in the
 * art registry), so graphics can be swapped without touching this layer.
 */

export type TileType = "floor" | "wall";

export type InteractionType =
  | "rack"
  | "checkout"
  | "stairs"
  | "displayTable"
  | "vinylDesk"
  | "npc"
  | "poster";

/** Footprint + solidity shared by props that occupy one or more tiles. */
interface Placed {
  tileX: number;
  tileY: number;
  /** Tiles wide/tall (default 1). Art is scaled to this footprint. */
  wTiles?: number;
  hTiles?: number;
  /** When true the prop blocks movement; the player walks around it. */
  solid?: boolean;
  /**
   * Footprint tiles (relative dx,dy from the origin) that are NOT solid — the
   * transparent cutout of an L-shaped prop, so the player can walk into it.
   */
  holes?: Array<{ dx: number; dy: number }>;
  /** Key into the art registry — never an asset path. */
  artKey: string;
  /**
   * Secret/flag gating (optional). A prop with `revealedBy` is inactive — not
   * drawn, not solid, not interactive — until that flag is in the revealed set
   * (a hidden entrance). A prop with `concealing` is active ONLY until that flag
   * is set, then it disappears (a cover that slides away on reveal).
   */
  revealedBy?: string;
  concealing?: string;
}

/** Whether a flag-gated prop is currently present in the world. */
export function propActive(p: Placed, revealed: Set<string>): boolean {
  if (p.revealedBy && !revealed.has(p.revealedBy)) return false;
  if (p.concealing && revealed.has(p.concealing)) return false;
  return true;
}

export interface Interaction extends Placed {
  /** Stable unique id within the room. */
  id: string;
  type: InteractionType;
  /** Present on transitions (stairs) — stepping here moves to another room. */
  target?: { roomId: string; spawn?: { tileX: number; tileY: number } };
  /** How the transition plays. Defaults to "fade" when a target is present. */
  transition?: "instant" | "fade";
}

/**
 * Purely visual art placed on a tile (poster on a wall, rug on the floor, a
 * solid obstacle like a speaker or box). `solid` decorations block movement but
 * have no interaction.
 */
export interface Decoration extends Placed {}

/**
 * A group of walkable tiles (e.g. sofa cushions) that may only be ENTERED from
 * one side. `enterDir` is the movement direction required to step in from
 * outside the zone; moving between tiles already inside the zone is unrestricted.
 */
export interface SeatZone {
  tiles: Array<{ x: number; y: number }>;
  enterDir: "up" | "down" | "left" | "right";
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
  /** Optional decorative art (posters, rugs, solid obstacles). */
  decorations?: Decoration[];
  /** Optional darkening overlay drawn over the whole room (e.g. the Basement). */
  ambient?: { color: number; alpha: number };
  /** Tiles you can only step onto from a specific side (e.g. sofa cushions). */
  seats?: SeatZone[];
}

/** Every tile a placed prop covers, given its footprint. */
export function footprint(p: Placed): Array<{ x: number; y: number }> {
  const w = p.wTiles ?? 1;
  const h = p.hTiles ?? 1;
  const tiles: Array<{ x: number; y: number }> = [];
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      tiles.push({ x: p.tileX + dx, y: p.tileY + dy });
    }
  }
  return tiles;
}

/**
 * Set of `"x,y"` keys for tiles blocked by solid props (interactions +
 * decorations). Used alongside `isWalkable` so the player navigates around
 * fixtures like a real shop floor.
 */
export function buildBlockedSet(room: Room, revealed: Set<string> = new Set()): Set<string> {
  const blocked = new Set<string>();
  const add = (p: Placed) => {
    if (!p.solid || !propActive(p, revealed)) return;
    const holes = new Set((p.holes ?? []).map((h) => `${p.tileX + h.dx},${p.tileY + h.dy}`));
    for (const t of footprint(p)) {
      const key = `${t.x},${t.y}`;
      if (!holes.has(key)) blocked.add(key);
    }
  };
  room.interactions.forEach(add);
  (room.decorations ?? []).forEach(add);
  return blocked;
}
