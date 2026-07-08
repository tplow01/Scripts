import type { Room, TileType } from "./types";
import { MAT_OVERHANG_PX } from "@/game/art/sprites";

/**
 * Shop floor (Main) — Map v3, the exact measured layout (see docs/world-layout.md).
 *
 * Interior is the player's notation: rows **a–o** (top→bottom) × columns **1–15**,
 * wrapped in a 1-tile wall border. So letter→y = (index + 1), column n → x = n.
 * Row a is now wall too (the top came down one tile), so play space is rows b–o;
 * the top-right is cut away (cols 8–15 × rows a–g) → an L-shaped floor.
 * Rendered with the baked pixel-art sprites in the art registry.
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
      // Top wall is 2 tiles thick (row 0 + interior row a) — the play space
      // starts at row b, per the "top of map comes down one tile" layout note.
      const border = x === 0 || y <= R("a") || x === maxX || y === maxY;
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
    // Basement entrance — SECRET stairs (top, b7). Hidden behind record crates
    // until the vinyl deck is played; revealed → stepped onto → fade to Basement.
    { id: "stairs", type: "stairs", tileX: C(7), tileY: R("b"), artKey: "stairs", solid: false,
      revealedBy: "basement-entrance", target: { roomId: "basement" }, transition: "fade" },

    // Music alcove (row b): vinyl deck (2 wide) — the reveal switch. Speakers are decorations.
    { id: "vinyl", type: "vinylDesk", tileX: C(3), tileY: R("b"), artKey: "vinylDesk", wTiles: 2, solid: true },

    // Checkout — single L footprint (2×5): top bar k1–k2 + right column k2–o2;
    // the bottom-left 1×4 cutout is a hole (walkable, transparent art).
    { id: "checkout", type: "checkout", tileX: C(1), tileY: R("k"), artKey: "checkout", wTiles: 2, hTiles: 5, solid: true,
      holes: [{ dx: 0, dy: 1 }, { dx: 0, dy: 2 }, { dx: 0, dy: 3 }, { dx: 0, dy: 4 }] },

    // Cashier — Heath himself, standing in the checkout gap behind the counter
    // (l1), facing his checkout. He also stars in the first-entry intro walk.
    { id: "cashier", type: "npc", tileX: C(1), tileY: R("l"), artKey: "cashier", solid: true, flip: true },

    // Clothing rails: horizontal h8–14, vertical h15–n15.
    { id: "rail-h", type: "rack", tileX: C(8), tileY: R("h"), artKey: "rack-h7", wTiles: 7, solid: true },
    { id: "rail-v", type: "rack", tileX: C(15), tileY: R("h"), artKey: "rack-v7", hTiles: 7, solid: true },

    // Shoppers populating the floor (each speaks when interacted with).
    // Browsing the horizontal rail (stands just below it, i10).
    { id: "npc-rail", type: "npc", tileX: C(10), tileY: R("i"), artKey: "npcRail", solid: true },
    // Studying the vertical rail (stands to its left, k14).
    { id: "npc-gazer", type: "npc", tileX: C(14), tileY: R("k"), artKey: "npcGazer", solid: true },
    // Seated on the sofa, at the corner (e1).
    { id: "npc-sofa", type: "npc", tileX: C(1), tileY: R("e"), artKey: "npcSitter", solid: true },
    // Customer who just checked out, tucked into the checkout corner (o3) so
    // the counter approach stays clear.
    { id: "npc-checkout", type: "npc", tileX: C(3), tileY: R("o"), artKey: "npcShopper", solid: true },
  ],
  // The sofa itself — the L of cushions: vertical arm (col 1, rows c–e) + base
  // (row e, cols 1–5). You can only sit by stepping down from the top side; you
  // can't walk onto it from the back (below) or the sides. The open corner
  // (cols 2–5 × rows c–d) is just normal floor.
  seats: [
    {
      enterDir: "down",
      tiles: [
        { x: C(1), y: R("c") }, { x: C(1), y: R("d") }, { x: C(1), y: R("e") },
        { x: C(2), y: R("e") }, { x: C(3), y: R("e") }, { x: C(4), y: R("e") }, { x: C(5), y: R("e") },
      ],
    },
  ],
  decorations: [
    // Speakers flanking the vinyl deck (b2, b5).
    { tileX: C(2), tileY: R("b"), artKey: "speaker", solid: true },
    { tileX: C(5), tileY: R("b"), artKey: "speaker", solid: true },

    // Record crates concealing the secret stairs (b7). Solid + visible until the
    // "basement-entrance" flag is revealed, then they slide away.
    { tileX: C(7), tileY: R("b"), artKey: "crates", solid: true, concealing: "basement-entrance" },

    // Couch — single L footprint (5×3), arm down the left + base along the
    // bottom. Non-solid so Scribbs can step onto the cushions ("sit").
    { tileX: C(1), tileY: R("c"), artKey: "couch", wTiles: 5, hTiles: 3, solid: false },

    // SCR!PTS floor logo — 3×3 brand lockup, centred over the door (cols 7–9),
    // two tiles above it (rows j–l, with y13–14 clear before the door at o).
    { tileX: C(7), tileY: R("j"), artKey: "emblem", wTiles: 3, hTiles: 3 },

    // Entrance: a flat SCR!PTS-black wall (no doors sprite) with a pink
    // carpet marking the walk-in gap — Pokémon-style building exterior. The
    // mat's own art overhangs its tile (see MAT_OVERHANG_PX) so it bleeds a
    // few px past the floor edge onto the black exterior row below.
    { tileX: C(7), tileY: R("o"), artKey: "mat", wTiles: 3, hTiles: (16 + MAT_OVERHANG_PX) / 16 },
  ],
};

/**
 * Heath's first-entry intro walk (see WorldScene.playHeathIntro). He fades in
 * beside the counter (j1), walks along column 3 and row n, and stops one tile
 * above the door spawn (n8). Scripted walks bypass collision, so keep this in
 * sync with the fixture layout above.
 */
export const HEATH_INTRO_PATH: Array<{ x: number; y: number }> = [
  { x: C(1), y: R("j") },
  { x: C(2), y: R("j") },
  { x: C(3), y: R("j") },
  { x: C(3), y: R("k") },
  { x: C(3), y: R("l") },
  { x: C(3), y: R("m") },
  { x: C(3), y: R("n") },
  { x: C(4), y: R("n") },
  { x: C(5), y: R("n") },
  { x: C(6), y: R("n") },
  { x: C(7), y: R("n") },
  { x: C(8), y: R("n") },
];

/** Where Heath stands as the static cashier prop — checkout-summon walks start here. */
export const HEATH_HOME: { x: number; y: number } = { x: C(1), y: R("l") };

/** The walkable hole rows behind the counter (col 1, rows l–o) — Heath never leaves col 1. */
const HEATH_COUNTER_MIN_ROW = R("l");
const HEATH_COUNTER_MAX_ROW = R("o");

/**
 * Path for Heath to slide along behind the counter (staying on column 1, like
 * a real checkout clerk) to line up with whichever row the player is facing
 * from. Clamped to the walkable hole rows — see WorldScene.playHeathCheckout.
 */
export function heathPathAlongCounter(targetY: number): Array<{ x: number; y: number }> {
  const y = Math.max(HEATH_COUNTER_MIN_ROW, Math.min(HEATH_COUNTER_MAX_ROW, targetY));
  const pts: Array<{ x: number; y: number }> = [];
  if (y === HEATH_HOME.y) return pts;
  const step = y > HEATH_HOME.y ? 1 : -1;
  for (let row = HEATH_HOME.y + step; step > 0 ? row <= y : row >= y; row += step) {
    pts.push({ x: HEATH_HOME.x, y: row });
  }
  return pts;
}
