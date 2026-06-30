import type { Room } from "./types";
import { buildBlockedSet } from "./types";
import { gameSession } from "@/lib/gameSession";
import { mainRoom } from "./mainRoom";
import { basementRoom } from "./basement";

/** Room registry — maps a room id to its world data. */
export const rooms: Record<string, Room> = {
  main: mainRoom,
  basement: basementRoom,
};

/** The room the player starts in. */
export const startRoomId = "main";

/** Resolve a room id to its data. Throws on unknown ids (fail loud in dev). */
export function getRoom(id: string): Room {
  const room = rooms[id];
  if (!room) {
    throw new Error(`Unknown room id: "${id}". Add it to the room registry.`);
  }
  return room;
}

// Solid-fixture blocked sets, cached per room. Reveal-aware: built from the
// current `gameSession.revealed` flags, so concealed/secret props block until
// they're revealed. Call `invalidateBlocked` after a reveal to rebuild.
const blockedByRoom = new Map<string, Set<string>>();
function blockedFor(room: Room): Set<string> {
  let set = blockedByRoom.get(room.id);
  if (!set) {
    set = buildBlockedSet(room, gameSession.revealed);
    blockedByRoom.set(room.id, set);
  }
  return set;
}

/** Drop the cached blocked set(s) so walkability recomputes with current flags. */
export function invalidateBlocked(roomId?: string): void {
  if (roomId) blockedByRoom.delete(roomId);
  else blockedByRoom.clear();
}

/** True when (tileX, tileY) is in bounds, floor, and not blocked by a fixture. */
export function isWalkableIn(room: Room, tileX: number, tileY: number): boolean {
  if (tileX < 0 || tileY < 0 || tileX >= room.width || tileY >= room.height) {
    return false;
  }
  if (room.tiles[tileY][tileX] !== "floor") return false;
  return !blockedFor(room).has(`${tileX},${tileY}`);
}

/**
 * True when the player may move from (fromX,fromY) to (toX,toY): walkable AND,
 * for seat zones, only entered from the allowed side. Movement within a zone is
 * unrestricted. Use this for player movement instead of `isWalkableIn` alone.
 */
export function canStep(room: Room, fromX: number, fromY: number, toX: number, toY: number): boolean {
  if (!isWalkableIn(room, toX, toY)) return false;
  const dx = toX - fromX;
  const dy = toY - fromY;
  const dir = dx === 1 ? "right" : dx === -1 ? "left" : dy === 1 ? "down" : dy === -1 ? "up" : null;
  for (const zone of room.seats ?? []) {
    const inZone = (x: number, y: number) => zone.tiles.some((t) => t.x === x && t.y === y);
    if (inZone(toX, toY) && !inZone(fromX, fromY) && dir !== zone.enterDir) {
      return false;
    }
  }
  return true;
}
