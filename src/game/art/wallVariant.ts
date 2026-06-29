import type { Room } from "@/game/world/types";

/**
 * Picks which wall art a wall tile should render, so the room reads with FireRed
 * 3/4-view depth — including the irregular L-shape and any interior walls. The
 * choice is by floor-adjacency, not just board position, so a carved corner or
 * alcove still caps correctly. World data stays a plain "wall"; this is a pure,
 * render-time visual decision.
 *
 * - Floor directly below  → the player sees this wall's face: capped top wall.
 * - Floor directly above  → a wall whose top meets the floor above it.
 * - Floor to either side   → a plain shaded side face (trimmed).
 * - No floor neighbour     → a fully-enclosed fill (dark, no trim) — interior
 *                            walls and the carved void, so they don't show
 *                            stray trim stripes.
 */
export type WallVariant = "wall-top" | "wall-side" | "wall-bottom" | "wall-fill";

function isFloor(room: Room, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= room.width || y >= room.height) return false;
  return room.tiles[y][x] === "floor";
}

export function wallVariant(room: Room, x: number, y: number): WallVariant {
  if (isFloor(room, x, y + 1)) return "wall-top"; // capped wall facing the player
  if (isFloor(room, x, y - 1)) return "wall-bottom"; // wall meeting floor above it
  if (isFloor(room, x - 1, y) || isFloor(room, x + 1, y)) return "wall-side";
  return "wall-fill"; // fully enclosed (interior / void) — plain dark
}
