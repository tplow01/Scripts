import type { Room, TileType } from "./types";
import { mural } from "@/game/art/walls";
import { entranceRug } from "@/game/art/floors";
import { checkoutCounter } from "@/game/art/checkout";
import { sofa } from "@/game/art/sofa";
import { rail } from "@/game/art/rails";
import { vinylDeck } from "@/game/art/vinylDeck";

/**
 * Shop floor (Main) — Map v3, the exact measured layout (see docs/world-layout.md).
 *
 * Interior is the player's notation: rows **a–o** (top→bottom) × columns **1–15**,
 * wrapped in a 1-tile wall border. So letter→y = (index + 1), column n → x = n.
 * Rows a–c are wall on the music side (vinyl wall + alcove pushed down one tile)
 * and col 15 is wall (right wall came in one), so play space is rows d–o × cols
 * 1–14 on the left, with the top-right cut away (cols 7–15 × rows a–h) so a
 * clean wall line sits behind the clothing rail. Rendered with the baked
 * pixel-art sprites in the art registry.
 */
const WIDTH = 17; // 15 interior cols + border
const HEIGHT = 17; // 15 interior rows (a–o) + border

/** Interior row letter → tile y (a=1 … o=15). */
const R = (letter: string) => letter.charCodeAt(0) - "a".charCodeAt(0) + 1;
/** Interior column number → tile x (1-indexed; border at x0). */
const C = (col: number) => col;

function buildTiles(width: number, height: number): TileType[][] {
  const maxY = height - 1;
  const tiles: TileType[][] = [];
  for (let y = 0; y < height; y++) {
    const row: TileType[] = [];
    for (let x = 0; x < width; x++) {
      // Top wall is 4 tiles thick on the music side (row 0 + interior a–c) —
      // the vinyl wall sits on row c and the alcove on row d. The right wall is
      // 2 tiles thick (col 16 + interior col 15).
      const border = x === 0 || y <= R("c") || x >= C(15) || y === maxY;
      // Top-right cutout: cols 7–15 × rows a–h — the vertical cut sits left of
      // the clothing rail so its back wall reads as a continuous line.
      const cutout = x >= C(7) && y <= R("h");
      row.push(border || cutout ? "wall" : "floor");
    }
    tiles.push(row);
  }
  return tiles;
}

/** Left tile of the vinyl deck; its right slice sits beside it. */
const DECK_AT = { tileX: C(3), tileY: R("d") };

/** Left end of the horizontal clothing rail; it runs right from here. */
const RAIL_H_AT = { tileX: C(8), tileY: R("i") };

/** Top-left tile of the sofa — its back; the cushion row runs beneath it. */
const SOFA_AT = { tileX: C(1), tileY: R("f") };

export const mainRoom: Room = {
  id: "main",
  tileSize: 32,
  width: WIDTH,
  height: HEIGHT,
  tiles: buildTiles(WIDTH, HEIGHT),
  // Spawn on the centre door (bottom). Intro walks Scribbs up one tile (o8→n8).
  spawn: { tileX: C(8), tileY: R("o") },
  interactions: [
    // Basement entrance — SECRET stairs (top, d6). Hidden behind record crates
    // until the vinyl deck is played; revealed → stepped onto → fade to Basement.
    { id: "stairs", type: "stairs", tileX: C(6), tileY: R("d"), artKey: "stairs-shop", solid: false,
      revealedBy: "basement-entrance",
      target: { roomId: "basement", spawn: { tileX: 1, tileY: 5 } },
      transition: "fade" },

    // Music alcove (row d): vinyl deck (2 wide) — the reveal switch. Speakers
    // are decorations. Art-less: its two hand-drawn slices are laid as
    // decorations (see vinylDeck below); this entry is the collision + trigger.
    { id: "vinyl", type: "vinylDesk", tileX: DECK_AT.tileX, tileY: DECK_AT.tileY, wTiles: 2, solid: true },

    // Checkout — single L footprint (2×5): top bar k1–k2 + right column k2–o2;
    // the bottom-left 1×4 cutout is a hole (walkable, transparent art).
    // Art-less: the counter's six hand-drawn slices are laid as decorations
    // (see checkoutCounter below); this entry is its collision + interaction.
    { id: "checkout", type: "checkout", tileX: C(1), tileY: R("k"), wTiles: 2, hTiles: 5, solid: true,
      holes: [{ dx: 0, dy: 1 }, { dx: 0, dy: 2 }, { dx: 0, dy: 3 }, { dx: 0, dy: 4 }] },

    // Cashier — Heath himself, standing in the checkout gap behind the counter
    // (l1), facing right toward the customer side. He also stars in the
    // first-entry intro walk. Left/right are distinct art, so he faces with a
    // frame rather than a flip.
    { id: "cashier", type: "npc", tileX: C(1), tileY: R("l"), artKey: "heath-right-both", solid: true },

    // Clothing rail — horizontal only (i8–13). Art-less — slices are decorations.
    { id: "rail-h", type: "rack", tileX: RAIL_H_AT.tileX, tileY: RAIL_H_AT.tileY, wTiles: 6, solid: true },

    // ── The cast on the shop floor ──
    // Teo browses under the horizontal rail, shuffling a couple of tiles and
    // facing up toward the hangers at each pause.
    { id: "teo", type: "npc", tileX: C(10), tileY: R("j"), artKey: "teo-up-both", solid: false,
      patrol: {
        waypoints: [
          { x: C(10), y: R("j") }, { x: C(11), y: R("j") }, { x: C(12), y: R("j") },
        ],
        restFacing: "up",
      } },

    // TP paces a short stretch of column 4 between the lounge and the logo —
    // clear of sofa cushions (row g) and the floor mark (cols 7–9, rows k–m).
    { id: "tp", type: "npc", tileX: C(4), tileY: R("h"), artKey: "tp-down-both", solid: false,
      patrol: {
        waypoints: [
          { x: C(4), y: R("h") },
          { x: C(4), y: R("i") },
          { x: C(4), y: R("j") },
        ],
      } },

    // Karl walks a small loop around the lounge (open floor east of the sofa).
    { id: "karl", type: "npc", tileX: C(6), tileY: R("g"), artKey: "karl-down-both", solid: false,
      patrol: {
        waypoints: [
          { x: C(6), y: R("g") },
          { x: C(6), y: R("h") },
          { x: C(5), y: R("h") },
          { x: C(5), y: R("g") },
          { x: C(5), y: R("f") },
          { x: C(6), y: R("f") },
        ],
        restFacing: "down",
      } },
  ],
  decorations: [
    // ── The shop's only two wall faces ──
    // Every other wall tile renders as flat exterior black (see WorldScene), so
    // the room has no vertical wall faces at all. These two horizontal murals
    // are hand-drawn trapezoids: full width at the base, chamfered at the top
    // ends where they stop.
    //
    // Vinyl wall (row c, cols 1-7) — behind the music alcove. Chamfered at both
    // ends, so it reads as a freestanding wall; col 0 is deliberately left bare
    // for its left chamfer to taper into.
    ...mural("vinyl-wall", { tileX: C(1), tileY: R("c"), tiles: 7 }),

    // Clothing wall (row h, cols 8-14) — the cutout's bottom edge, directly
    // above the horizontal rail at row i. Seven tiles: the authored slice 6 is
    // dropped so 7 and 8 shuffle left, ending the wall level with col 14. Col 7
    // of the cut is flat exterior black (the vertical cut line).
    ...mural("clothing-wall", { tileX: C(8), tileY: R("h"), tiles: 7 }),

    // Speakers flanking the vinyl deck (d2, d5).
    // Record crate (d1) mirroring the one at d6 about the vinyl desk, so the
    // music alcove reads symmetrically: crate, speaker, desk, speaker, crate.
    { tileX: C(1), tileY: R("d"), artKey: "vinyl-crate", solid: true },
    { tileX: C(2), tileY: R("d"), artKey: "speaker", solid: true },
    { tileX: C(5), tileY: R("d"), artKey: "speaker", solid: true },

    // Vinyl deck art — two slices, left then right (see art/vinylDeck.ts).
    ...vinylDeck(DECK_AT),

    // Record crate concealing the secret stairs (d6). Playing the vinyl steps
    // it forward one tile (e6) then it vanishes — the cut wall at col 7 leaves
    // no room to park it sideways.
    { tileX: C(6), tileY: R("d"), artKey: "vinyl-crate", solid: true, concealing: "basement-entrance",
      slideTo: { tileX: C(6), tileY: R("e") }, vanishAfterSlide: true },

    // Sofa — five hand-drawn slices: the back at f1, then the cushion row
    // g1–g4 left to right. Fully solid — walk around it, not onto it.
    ...sofa(SOFA_AT),

    // SCR!PTS floor logo — 3×3 canonical brand lockup, centred over the door
    // (cols 7–9, rows k–m). One row lower than the prototype so the full comet
    // remains inside the short mobile camera viewport as Scribbs approaches.
    { tileX: C(7), tileY: R("k"), artKey: "emblem", wTiles: 3, hTiles: 3 },

    // Entrance: a flat SCR!PTS-black wall (no doors sprite) with the
    // hand-drawn pink rug marking the walk-in gap — Pokémon-style building
    // exterior. Three sequential slices laid left to right (see art/floors.ts).
    ...entranceRug({ tileX: C(7), tileY: R("o") }),

    // Checkout counter art — six slices filling the L's solid cells: 1 top-left
    // (k1), 2 to its right (k2), then 3–6 down column 2 to row o.
    ...checkoutCounter({ tileX: C(1), tileY: R("k") }),

    // Clothing rail art — horizontal only, six slices left to right.
    ...rail("rail-h", RAIL_H_AT),

    // Open cartons: left of the rail (i7) and the right-wall corner (i14).
    { tileX: C(7), tileY: R("i"), artKey: "box-open", solid: true },
    { tileX: C(14), tileY: R("i"), artKey: "box-open", solid: true },
  ],
};

/**
 * Heath's first-entry intro walk (see WorldScene.playHeathIntro). Direct L:
 * fade in at j1, run right along row j to j8, then down column 8 to m8 (one tile
 * above Scribbs at n8). One turn only — arrives facing down, no awkward pivots.
 * Scripted walks bypass collision, so keep this in sync with the fixture layout.
 */
export const HEATH_INTRO_PATH: Array<{ x: number; y: number }> = [
  { x: C(1), y: R("j") },
  { x: C(2), y: R("j") },
  { x: C(3), y: R("j") },
  { x: C(4), y: R("j") },
  { x: C(5), y: R("j") },
  { x: C(6), y: R("j") },
  { x: C(7), y: R("j") },
  { x: C(8), y: R("j") },
  { x: C(8), y: R("k") },
  { x: C(8), y: R("l") },
  { x: C(8), y: R("m") },
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
