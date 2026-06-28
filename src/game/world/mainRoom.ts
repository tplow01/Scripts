import type { Room, TileType } from "./types";

const WIDTH = 12;
const HEIGHT = 9;

/** Build a floor-filled grid with a one-tile wall border. */
function buildTiles(width: number, height: number): TileType[][] {
  const tiles: TileType[][] = [];
  for (let y = 0; y < height; y++) {
    const row: TileType[] = [];
    for (let x = 0; x < width; x++) {
      const isBorder = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      row.push(isBorder ? "wall" : "floor");
    }
    tiles.push(row);
  }
  return tiles;
}

/**
 * v0 placeholder of the Main store room (see docs/world-map-notes.md "Map v2").
 * Checkout sits bottom-left, a clothing rack on the right, basement stairs up top.
 * Layout is intentionally rough — the point is to exercise the world/art split.
 */
export const mainRoom: Room = {
  id: "main",
  tileSize: 32,
  width: WIDTH,
  height: HEIGHT,
  tiles: buildTiles(WIDTH, HEIGHT),
  spawn: { tileX: 6, tileY: 7 },
  interactions: [
    { id: "checkout", type: "checkout", tileX: 1, tileY: 7, artKey: "checkout" },
    { id: "rack-1", type: "rack", tileX: 10, tileY: 3, artKey: "rack" },
    { id: "stairs", type: "stairs", tileX: 6, tileY: 1, artKey: "stairs" },
  ],
};

/** True when (tileX, tileY) is in bounds and standable. */
export function isWalkable(room: Room, tileX: number, tileY: number): boolean {
  if (tileX < 0 || tileY < 0 || tileX >= room.width || tileY >= room.height) {
    return false;
  }
  return room.tiles[tileY][tileX] === "floor";
}
