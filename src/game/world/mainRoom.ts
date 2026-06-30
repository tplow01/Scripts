import type { Room, TileType } from "./types";
import { buildBlockedSet } from "./types";

/**
 * Shop floor (Main) — Map v3, the exact measured layout (see docs/world-layout.md).
 *
 * Interior is the player's notation: rows **a–o** (top→bottom) × columns **1–15**,
 * wrapped in a 1-tile wall border. So letter→y = (index + 1), column n → x = n.
 * The top-right is cut away (cols 8–15 × rows a–g) → an L-shaped floor of 169
 * tiles. Rendered with the baked pixel-art sprites in the art registry.
 */
const WIDTH = 17; // 15 interior cols + border
const HEIGHT = 17; // 15 interior rows (a–o) + border

/** Interior row letter → tile y (a=1 … o=15). */
const R = (letter: string) => letter.charCodeAt(0) - "a".charCodeAt(0) + 1;
/** Interior column number → tile x (1-indexed; border at x0). */
const C = (col: number) => col;

function buildTiles(width: number, height: number): TileType[][] {
  const maxX = width - 1;
  const maxY = height - 1;
  const tiles: TileType[][] = [];
  for (let y = 0; y < height; y++) {
    const row: TileType[] = [];
    for (let x = 0; x < width; x++) {
      const border = x === 0 || y === 0 || x === maxX || y === maxY;
      // Top-right cutout: interior cols 8–15 × rows a–g (plus their border).
      const cutout = x >= C(8) && y <= R("g");
      row.push(border || cutout ? "wall" : "floor");
    }
    tiles.push(row);
  }
  return tiles;
}

export const mainRoom: Room = {
  id: "main",
  tileSize: 32,
  width: WIDTH,
  height: HEIGHT,
  tiles: buildTiles(WIDTH, HEIGHT),
  // Spawn on the centre door (bottom). WorldScene walks Scribbs up on entry.
  spawn: { tileX: C(8), tileY: R("o") },
  interactions: [
    // Basement entrance — stairs (top, a7), stepped onto → fade to Basement.
    { id: "stairs", type: "stairs", tileX: C(7), tileY: R("a"), artKey: "stairs", solid: false,
      target: { roomId: "basement" }, transition: "fade" },

    // Music alcove (row a): vinyl deck (2 wide). Speakers are decorations.
    { id: "vinyl", type: "vinylDesk", tileX: C(3), tileY: R("a"), artKey: "vinylDesk", wTiles: 2, solid: true },

    // Checkout — single L footprint (2×5): top bar k1–k2 + right column k2–o2;
    // the bottom-left 1×4 cutout is a hole (walkable, transparent art).
    { id: "checkout", type: "checkout", tileX: C(1), tileY: R("k"), artKey: "checkout", wTiles: 2, hTiles: 5, solid: true,
      holes: [{ dx: 0, dy: 1 }, { dx: 0, dy: 2 }, { dx: 0, dy: 3 }, { dx: 0, dy: 4 }] },

    // Cashier — staff standing in the checkout gap, behind the counter (l1).
    { id: "cashier", type: "npc", tileX: C(1), tileY: R("l"), artKey: "cashier", solid: true },

    // Clothing rails: horizontal h8–14, vertical h15–n15.
    { id: "rail-h", type: "rack", tileX: C(8), tileY: R("h"), artKey: "rack-h7", wTiles: 7, solid: true },
    { id: "rail-v", type: "rack", tileX: C(15), tileY: R("h"), artKey: "rack-v7", hTiles: 7, solid: true },
  ],
  decorations: [
    // Speakers flanking the vinyl deck (a2, a5).
    { tileX: C(2), tileY: R("a"), artKey: "speaker", solid: true },
    { tileX: C(5), tileY: R("a"), artKey: "speaker", solid: true },

    // Couch — single L footprint (5×3), arm down the left + base along the
    // bottom. Non-solid so Scribbs can step onto the cushions ("sit").
    { tileX: C(1), tileY: R("c"), artKey: "couch", wTiles: 5, hTiles: 3, solid: false },

    // SCR!PTS floor logo — 3×3 brand lockup, centred over the door (cols 7–9),
    // two tiles above it (rows j–l, with y13–14 clear before the door at o).
    { tileX: C(7), tileY: R("j"), artKey: "emblem", wTiles: 3, hTiles: 3 },

    // Entrance: glass doors set into the bottom wall (cols 7–9, border row),
    // with the doormat just inside it (o7–o9, walkable).
    { tileX: C(7), tileY: HEIGHT - 1, artKey: "doors", wTiles: 3 },
    { tileX: C(7), tileY: R("o"), artKey: "mat", wTiles: 3 },
  ],
};

/** Tiles blocked by solid fixtures (computed once from world data). */
const blockedTiles = buildBlockedSet(mainRoom);

/** True when (tileX, tileY) is in bounds, floor, and not blocked by a fixture. */
export function isWalkable(room: Room, tileX: number, tileY: number): boolean {
  if (tileX < 0 || tileY < 0 || tileX >= room.width || tileY >= room.height) {
    return false;
  }
  if (room.tiles[tileY][tileX] !== "floor") return false;
  if (room === mainRoom && blockedTiles.has(`${tileX},${tileY}`)) return false;
  return true;
}
