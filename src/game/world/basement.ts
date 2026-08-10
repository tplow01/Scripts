import type { Room, TileType } from "./types";
import { mural } from "@/game/art/walls";
import { rail } from "@/game/art/rails";

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

/** Left tile of the 3-slice basement clothing rail. */
const RAIL_AT = { tileX: C(8), tileY: R("a") };

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
  // Spawn on the basement stairs — entering from the shop lands here too.
  // WorldScene then steps one tile forward (right) off the stairs.
  spawn: { tileX: C(1), tileY: R("e") },
  ambient: { color: 0x000000, alpha: 0.45 },
  characterTint: 0x8a8a96,
  interactions: [
    // Spawn alcove (col 1): box d1, stairs e1 → back up to the Shop, box f1.
    { id: "stairs-up", type: "stairs", tileX: C(1), tileY: R("e"), artKey: "stairs-basement", solid: false,
      // Return onto the shop stairs tile (d6); WorldScene steps down off them.
      target: { roomId: "main", spawn: { tileX: 6, tileY: 4 } }, transition: "fade" },
    // Rack room: 3-tile horizontal rail (art laid as decorations below).
    { id: "rail-top", type: "rack", tileX: RAIL_AT.tileX, tileY: RAIL_AT.tileY, wTiles: 3, solid: true },
    // Heath again — an independent instance, never co-visible with the one
    // behind the shop counter.
    { id: "basement-npc", type: "npc", tileX: C(9), tileY: R("b"), artKey: "heath-down-both", solid: true },
  ],
  decorations: [
    // ── The Basement's only two wall faces ──
    // Like the Shop, every wall tile renders as flat exterior black (see
    // WorldScene), so there are no vertical or bottom faces anywhere. These two
    // horizontal murals are the only walls actually drawn — the exact mirror of
    // the Shop's L, since the Basement's cutout is top-LEFT where the Shop's is
    // top-right.
    //
    // Back wall (border row 0, cols 7–11) — behind the rack room. Black void
    // sits off both ends, so it chamfers at both, like the vinyl wall.
    ...mural("basement-back-wall", { tileX: C(7), tileY: 0, tiles: 5 }),

    // Ledge wall (row c, cols 1–6) — the cutout's bottom edge, capping the
    // bottom strip. Chamfered on the left where it tapers into the void, square
    // on the right where it meets the right block's floor.
    ...mural("basement-ledge-wall", { tileX: C(1), tileY: R("c"), tiles: 6 }),

    // Three-slice clothing rail (left post · middle · right post).
    ...rail("basement-rail", RAIL_AT),

    // Boxes flanking the horizontal rail (a7 left, a11 right).
    { tileX: C(7), tileY: R("a"), artKey: "box", solid: true },
    { tileX: C(11), tileY: R("a"), artKey: "box", solid: true },

    // Boxes: spawn alcove (d1, f1) + corners (f10, f11, e11).
    { tileX: C(1), tileY: R("d"), artKey: "box", solid: true },
    { tileX: C(1), tileY: R("f"), artKey: "box", solid: true },
    { tileX: C(10), tileY: R("f"), artKey: "box", solid: true },
    { tileX: C(11), tileY: R("f"), artKey: "box", solid: true },
    { tileX: C(11), tileY: R("e"), artKey: "box", solid: true },
  ],
};
