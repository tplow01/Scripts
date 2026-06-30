import type { Room, TileType } from "./types";

/**
 * The Basement — Map v3 (see docs/world-layout.md). Interior rows **a–f** ×
 * columns **1–11**, wrapped in a wall border. Top-left (cols 1–6 × rows a–c) is
 * cut away → floor is a bottom strip (rows d–f) opening into a right block
 * (rows a–c, cols 7–11) = 48 tiles. Darker via the `ambient` overlay; reached
 * by the Shop staircase (fade).
 */
const WIDTH = 13; // 11 interior cols + border
const HEIGHT = 8; // 6 interior rows (a–f) + border

const R = (letter: string) => letter.charCodeAt(0) - "a".charCodeAt(0) + 1;
const C = (col: number) => col;

function buildTiles(width: number, height: number): TileType[][] {
  const maxX = width - 1;
  const maxY = height - 1;
  const tiles: TileType[][] = [];
  for (let y = 0; y < height; y++) {
    const row: TileType[] = [];
    for (let x = 0; x < width; x++) {
      const border = x === 0 || y === 0 || x === maxX || y === maxY;
      // Top-left cutout: interior cols 1–6 × rows a–c.
      const cutout = x <= C(6) && y <= R("c");
      row.push(border || cutout ? "wall" : "floor");
    }
    tiles.push(row);
  }
  return tiles;
}

export const basementRoom: Room = {
  id: "basement",
  tileSize: 32,
  width: WIDTH,
  height: HEIGHT,
  tiles: buildTiles(WIDTH, HEIGHT),
  spawn: { tileX: C(2), tileY: R("e") },
  ambient: { color: 0x000000, alpha: 0.45 },
  interactions: [
    // Spawn alcove (col 1): box d1, stairs e1 → back up to the Shop, box f1.
    { id: "stairs-up", type: "stairs", tileX: C(1), tileY: R("e"), artKey: "stairs", solid: false,
      target: { roomId: "main", spawn: { tileX: 7, tileY: 2 } }, transition: "fade" },
    // Rack room (right block): three rails framing the NPC.
    { id: "rail-top", type: "rack", tileX: C(8), tileY: R("a"), artKey: "rack-h3", wTiles: 3, solid: true },
    { id: "rail-left", type: "rack", tileX: C(7), tileY: R("a"), artKey: "rack-v3", hTiles: 3, solid: true },
    { id: "rail-right", type: "rack", tileX: C(11), tileY: R("a"), artKey: "rack-v3", hTiles: 3, solid: true },
    { id: "basement-npc", type: "npc", tileX: C(9), tileY: R("b"), artKey: "npc", solid: true },
  ],
  decorations: [
    // Boxes: spawn alcove (d1, f1) + corners (f10, f11, e11).
    { tileX: C(1), tileY: R("d"), artKey: "box", solid: true },
    { tileX: C(1), tileY: R("f"), artKey: "box", solid: true },
    { tileX: C(10), tileY: R("f"), artKey: "box", solid: true },
    { tileX: C(11), tileY: R("f"), artKey: "box", solid: true },
    { tileX: C(11), tileY: R("e"), artKey: "box", solid: true },
  ],
};
