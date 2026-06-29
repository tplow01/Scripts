import type { Room } from "./types";
import { buildBlockedSet } from "./types";
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

// Solid-fixture blocked sets, computed once per room.
const blockedByRoom = new Map<string, Set<string>>();
function blockedFor(room: Room): Set<string> {
  let set = blockedByRoom.get(room.id);
  if (!set) {
    set = buildBlockedSet(room);
    blockedByRoom.set(room.id, set);
  }
  return set;
}

/** True when (tileX, tileY) is in bounds, floor, and not blocked by a fixture. */
export function isWalkableIn(room: Room, tileX: number, tileY: number): boolean {
  if (tileX < 0 || tileY < 0 || tileX >= room.width || tileY >= room.height) {
    return false;
  }
  if (room.tiles[tileY][tileX] !== "floor") return false;
  return !blockedFor(room).has(`${tileX},${tileY}`);
}
