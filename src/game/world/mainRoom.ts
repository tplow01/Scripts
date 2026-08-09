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
 * Rows a–b are wall too (the top came down two tiles) and so is col 15 (the
 * right wall came in one), so play space is rows c–o × cols 1–14; the
 * top-right is cut away (cols 8–15 × rows a–h) → an L-shaped floor.
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
      // Top wall is 3 tiles thick (row 0 + interior rows a–b) — the play space
      // starts at row c, the music alcove and its wall having come down a tile.
      // The right wall is 2 tiles thick (col 16 + interior col 15), so it butts
      // straight up against the vertical clothing rail at col 14 — no lane of
      // floor left stranded behind it.
      const border = x === 0 || y <= R("b") || x >= C(15) || y === maxY;
      // Top-right cutout: interior cols 8–15 × rows a–h (plus their border).
      const cutout = x >= C(8) && y <= R("h");
      row.push(border || cutout ? "wall" : "floor");
    }
    tiles.push(row);
  }
  return tiles;
}

/** Left tile of the vinyl deck; its right slice sits beside it. */
const DECK_AT = { tileX: C(3), tileY: R("c") };

/** Left end of the horizontal clothing rail; it runs right from here. */
const RAIL_H_AT = { tileX: C(8), tileY: R("i") };
/** Top of the vertical clothing rail; it runs down from here. */
const RAIL_V_AT = { tileX: C(14), tileY: R("j") };

/** Top-left tile of the sofa — its back; the cushion row runs beneath it. */
const SOFA_AT = { tileX: C(1), tileY: R("e") };

export const mainRoom: Room = {
  id: "main",
  tileSize: 32,
  width: WIDTH,
  height: HEIGHT,
  tiles: buildTiles(WIDTH, HEIGHT),
  // Spawn on the centre door (bottom). Intro walks Scribbs up one tile (o8→n8).
  spawn: { tileX: C(8), tileY: R("o") },
  interactions: [
    // Basement entrance — SECRET stairs (top, c6). Hidden behind record crates
    // until the vinyl deck is played; revealed → stepped onto → fade to Basement.
    { id: "stairs", type: "stairs", tileX: C(6), tileY: R("c"), artKey: "stairs-shop", solid: false,
      revealedBy: "basement-entrance", target: { roomId: "basement" }, transition: "fade" },

    // Music alcove (row c): vinyl deck (2 wide) — the reveal switch. Speakers
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

    // Clothing rails, 6 tiles each: horizontal i8–13, vertical j14–o14. The
    // horizontal's last slice carries the corner, so the vertical starts one
    // row below it. Art-less — their six hand-drawn slices are laid
    // as decorations (see rail() below); these entries are the collision.
    { id: "rail-h", type: "rack", tileX: RAIL_H_AT.tileX, tileY: RAIL_H_AT.tileY, wTiles: 6, solid: true },
    { id: "rail-v", type: "rack", tileX: RAIL_V_AT.tileX, tileY: RAIL_V_AT.tileY, hTiles: 6, solid: true },

    // ── The cast on the shop floor ──
    // Teo browses the vertical rail, shuffling a couple of tiles up and down
    // column 13 and turning back to face the rail at each end.
    { id: "teo", type: "npc", tileX: C(13), tileY: R("j"), artKey: "teo-right-both", solid: false,
      patrol: {
        waypoints: [
          { x: C(13), y: R("j") }, { x: C(13), y: R("k") }, { x: C(13), y: R("l") },
        ],
        restFacing: "right",
      } },

    // TP paces the open floor between the sofa and the checkout: down column 4
    // from row g (the first row clear of the sofa's seat zone) to row n, then
    // one tile west to the counter approach. Well clear of the floor logo at
    // columns 7-9. Every waypoint is orthogonally adjacent to the last — this
    // is a hand-authored route, not a pathfinder.
    { id: "tp", type: "npc", tileX: C(4), tileY: R("g"), artKey: "tp-down-both", solid: false,
      patrol: {
        waypoints: [
          { x: C(4), y: R("g") }, { x: C(4), y: R("h") },
          { x: C(4), y: R("i") }, { x: C(4), y: R("j") }, { x: C(4), y: R("k") },
          { x: C(4), y: R("l") }, { x: C(4), y: R("m") }, { x: C(4), y: R("n") },
          { x: C(3), y: R("n") },
        ],
      } },

    // Karl stands beside the couch's right edge (f6), facing out into the room.
    // The source art has no seated pose, so he stands rather than fake-sitting.
    { id: "karl", type: "npc", tileX: C(6), tileY: R("f"), artKey: "karl-down-both", solid: true },
  ],
  decorations: [
    // ── The shop's only two wall faces ──
    // Every other wall tile renders as flat exterior black (see WorldScene), so
    // the room has no vertical wall faces at all. These two horizontal murals
    // are hand-drawn trapezoids: full width at the base, chamfered at the top
    // ends where they stop.
    //
    // Vinyl wall (row b, cols 1-7) — behind the music alcove. Chamfered at both
    // ends, so it reads as a freestanding wall; col 0 is deliberately left bare
    // for its left chamfer to taper into.
    ...mural("vinyl-wall", { tileX: C(1), tileY: R("b"), tiles: 7 }),

    // Clothing wall (row h, cols 8-14) — the cutout's bottom edge, directly
    // above the horizontal rail at row i. Seven tiles: the authored slice 6 is
    // dropped so 7 and 8 shuffle left, ending the wall level with col 14. Square on the left where it meets the
    // corner, chamfered on the right at the map edge.
    ...mural("clothing-wall", { tileX: C(8), tileY: R("h"), tiles: 7 }),

    // Speakers flanking the vinyl deck (c2, c5).
    // Record crate (c1) mirroring the one at c6 about the vinyl desk, so the
    // music alcove reads symmetrically: crate, speaker, desk, speaker, crate.
    { tileX: C(1), tileY: R("c"), artKey: "vinyl-crate", solid: true },
    { tileX: C(2), tileY: R("c"), artKey: "speaker", solid: true },
    { tileX: C(5), tileY: R("c"), artKey: "speaker", solid: true },

    // Vinyl deck art — two slices, left then right (see art/vinylDeck.ts).
    ...vinylDeck(DECK_AT),

    // Record crate concealing the secret stairs (c6, snug against the right
    // speaker). Playing the vinyl slides it right to c7, parking it against
    // the wall — it stays visible and solid there.
    { tileX: C(6), tileY: R("c"), artKey: "vinyl-crate", solid: true, concealing: "basement-entrance",
      slideTo: { tileX: C(7), tileY: R("c") } },

    // Sofa — five hand-drawn slices: the back at e1, then the cushion row
    // f1–f4 left to right. Fully solid — walk around it, not onto it.
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

    // Clothing rail art — six slices each, left to right and top to bottom,
    // meeting at the top-right corner.
    ...rail("rail-h", RAIL_H_AT),
    ...rail("rail-v", RAIL_V_AT),

    // Open carton filling the corner the two rails leave open (i14) — the
    // horizontal ends at i13 and the vertical starts a row lower at j14. It
    // fills its whole tile, so the corner reads solid instead of showing a
    // bare square of floor.
    { tileX: C(14), tileY: R("i"), artKey: "box-open", solid: true },
  ],
};

/**
 * Heath's first-entry intro walk (see WorldScene.playHeathIntro). He fades in
 * beside the counter (j1), walks along column 3 and row n, and stops one tile
 * above Scribbs' intro stop (m8 — Scribbs walks door o8 → n8 as Heath approaches).
 * Scripted walks bypass collision, so keep this in sync with the fixture layout.
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
