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
  artKey?: string;
  /** Mirror the art horizontally (e.g. an NPC facing the other way). */
  flip?: boolean;
  /**
   * Secret/flag gating (optional). A prop with `revealedBy` is inactive — not
   * drawn, not solid, not interactive — until that flag is in the revealed set
   * (a hidden entrance). A prop with `concealing` is active ONLY until that flag
   * is set, then it disappears (a cover that slides away on reveal).
   */
  revealedBy?: string;
  concealing?: string;
  /**
   * Where a `concealing` prop parks after its flag reveals. With `slideTo` the
   * prop STAYS in the world post-reveal (drawn + solid at the new tile) instead
   * of despawning — e.g. the record crate sliding off the secret stairs.
   */
  slideTo?: { tileX: number; tileY: number };
}

/** Whether a flag-gated prop is currently present in the world. */
export function propActive(p: Placed, revealed: Set<string>): boolean {
  if (p.revealedBy && !revealed.has(p.revealedBy)) return false;
  if (p.concealing && !p.slideTo && revealed.has(p.concealing)) return false;
  return true;
}

/**
 * A patrolling NPC's route. The actor walks the waypoints in order, then back,
 * for ever. Consecutive waypoints must be orthogonally adjacent — this is a
 * hand-authored route, not a pathfinder.
 *
 * A patrolling NPC is NOT part of the static blocked set (its authored tile is
 * only a starting point); the scene tracks its live tile instead.
 */
export interface Patrol {
  waypoints: Array<{ x: number; y: number }>;
  /** ms per tile. Defaults to the shared walk pace. */
  stepMs?: number;
  /** ms spent standing still at each end of the route. */
  pauseMs?: number;
  /** Facing held while paused (e.g. turning to face the rail). */
  restFacing?: "up" | "down" | "left" | "right";
}

export interface Interaction extends Placed {
  /**
   * Omitted on an interaction that exists purely for collision and its
   * behaviour, whose art is supplied by separate decorations (the checkout
   * counter — see art/checkout.ts).
   */
  artKey?: string;
  /** Stable unique id within the room. */
  id: string;
  type: InteractionType;
  /** Present on an `npc` that walks a route instead of standing still. */
  patrol?: Patrol;
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
export interface Decoration extends Placed {
  /** Decorations exist to be seen, so their art key is never optional. */
  artKey: string;
}

/**
 * A group of walkable tiles (e.g. sofa cushions) that may only be ENTERED from
 * one side. `enterDir` is the movement direction required to step in from
 * outside the zone; moving between tiles already inside the zone is unrestricted.
 */
export interface SeatZone {
  tiles: Array<{ x: number; y: number }>;
  enterDir: "up" | "down" | "left" | "right";
  /**
   * Allow moving between tiles inside this zone. Default (absent/false) is the
   * planted behaviour: sitting down commits you, and the only move is back out
   * the way you came. The couch arm sets this so you can shuffle along it.
   */
  internalMoves?: boolean;
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
  /**
   * Multiply-tint applied to every character in the room. The ambient overlay
   * sits below the player, so without this he reads as lit while the room
   * around him is in shadow. Tinting rather than raising the overlay keeps him
   * readable — under the overlay he would darken exactly as much as the floor.
   */
  characterTint?: number;
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
    const slid = p.concealing && p.slideTo && revealed.has(p.concealing)
      ? { ...p, tileX: p.slideTo.tileX, tileY: p.slideTo.tileY }
      : p;
    const holes = new Set((slid.holes ?? []).map((h) => `${slid.tileX + h.dx},${slid.tileY + h.dy}`));
    for (const t of footprint(slid)) {
      const key = `${t.x},${t.y}`;
      if (!holes.has(key)) blocked.add(key);
    }
  };
  room.interactions.forEach(add);
  (room.decorations ?? []).forEach(add);
  return blocked;
}
