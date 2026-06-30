import type { PixelArt, Palette } from "./pixelArt";

/**
 * Pixel-art definitions for the SCR!PTS world, authored at 16×16 native in a
 * FireRed idiom: per-material shading ramps (highlight → mid → shadow), a
 * consistent top-left light source, dark *desaturated* outlines on props and
 * the character, and walls drawn with a cap + face + baseboard for 3/4-view
 * depth. Palette stays on-brand (ink/paper/pink from BRAND.md).
 */

const PAL: Palette = {
  ".": null, // transparent

  // floor — pale retail tile (city shopping-centre): light neutral squares
  // with a thin grout grid + a soft sheen.
  "0": "#CFCABF", // grout seam
  "2": "#F4F2EC", // tile sheen (lit edge)
  "8": "#E9E6DF", // tile field (light)
  "9": "#DCD8CE", // tile soft shade
  a: "#E2DED3", // faint speckle
  F: "#F0EEE8", // emblem inlay (light)

  // plants
  l: "#8FBF6B", // leaf light
  m: "#5E9A48", // leaf mid
  k: "#3E6E33", // leaf dark
  w: "#B5683C", // terracotta pot
  V: "#8B4E2C", // pot shade
  // window glass
  I: "#BFE3E8", // sky glass
  Y: "#9CCBD4", // glass low

  // wall — FireRed interior: light tan face + molding (A/Q/E/f/g). W/D stay
  // dark for the carved void fill + prop shadows; K is the darkest baseboard.
  A: "#EAD9B4", // wall cap highlight (lit top edge)
  Q: "#CBAE7C", // wall molding band
  E: "#D9C49A", // wall face (light tan)
  f: "#BC9E6E", // wall face shade
  g: "#8E6E48", // wall base / molding line
  W: "#2B2730", // dark void fill (mid)
  D: "#221E29", // dark void fill (shade)
  K: "#14111A", // baseboard / void (darkest)
  P: "#FF8AC7", // brand pink — reserved for the logo accent only
  p: "#D43E86", // pink shade (logo)

  // ── Strict brand tokens (BRAND.md) — used by the clean architectural tiles
  // (floor, floor-basement, wall, stairs, doors, rug). Kept separate from the
  // warmer FireRed prop ramps above so a tile restyle never disturbs the props.
  "=": "#F7F7F5", // paper — clean surface base
  "+": "#6F6F73", // grey — structural lines / risers / frames
  "@": "#0D0D0D", // ink — outlines, nosing, baseboard
  s: "#C97FA0", // muted rose — FireRed-toned brand accent (headphones, trims)
  X: "#A75F82", // muted rose shade

  // metal (rack)
  M: "#C2C8D0", // highlight
  e: "#9AA0AA", // mid
  G: "#6E7480", // shade

  // garment charcoal
  "3": "#34303C",
  "4": "#232029",

  // wood (checkout)
  u: "#9A7A54", // top highlight
  U: "#7E5E3E", // top
  d: "#6E5238", // body
  R: "#543E2A", // shade

  // register
  r: "#2B2730", // body
  q: "#86E3C4", // screen
  Z: "#B8F0DC", // screen highlight

  // stairs
  x: "#5C5663",
  y: "#454050",
  z: "#332F3A",
  i: "#837C90", // lip highlight

  // poster
  o: "#F2ECDD", // paper
  v: "#2B2730", // ink

  // couch
  "1": "#3A3442", // body
  "5": "#514A5C", // highlight
  "6": "#262230", // shade
  // vinyl desk / speaker
  "7": "#4A4550", // turntable plate / speaker cone ring
  // cardboard box
  T: "#C8A06A",
  t: "#A67C46",
  L: "#E8D8B8", // tape highlight
  // npc skin variant
  N: "#B97A52",

  // scribbs
  O: "#14121A", // outline / eye (dark desaturated)
  H: "#2A2430", // hair
  h: "#3E3648", // hair highlight
  S: "#E8B48C", // skin
  n: "#C98F6A", // skin shade
  C: "#ECE4D3", // hoodie
  c: "#CFC4AC", // hoodie shade
  b: "#F7F1E4", // hoodie highlight
  J: "#3A4670", // jeans
  j: "#2A3354", // jeans shade
  B: "#1A1A1A", // shoes
};

const TILE = 16;

/**
 * Pale retail tile floor (city shopping-centre idiom). One light square tile per
 * 16px cell: a thin grout seam on the top + left edges (forms a clean grid when
 * tiled), a lit sheen just inside, a soft shade on the far edges, and a faint
 * speckle for life. Light + neutral so the clothes and fixtures pop.
 */
function buildFloor(): string[] {
  const rows: string[] = [];
  for (let y = 0; y < TILE; y++) {
    let row = "";
    for (let x = 0; x < TILE; x++) {
      // Clean concrete: paper field with a single, low-contrast grey corner
      // mark at the top-left. A 2px L-tick only — when tiled it forms a quiet,
      // even grid of marks that reads as a surface, never as a pattern.
      const cornerMark = (x === 0 && y <= 1) || (y === 0 && x <= 1);
      row += cornerMark ? "+" : "=";
    }
    rows.push(row);
  }
  return rows;
}

/**
 * Basement floor — the inverse of the shop floor. Near-black ink field with a
 * single grey grid line along the top + left edge, so tiling lays down a subtle
 * underground grid. No pink here; warmth arrives only through the props.
 */
function buildFloorBasement(): string[] {
  const rows: string[] = [];
  for (let y = 0; y < TILE; y++) {
    let row = "";
    for (let x = 0; x < TILE; x++) {
      row += x === 0 || y === 0 ? "+" : "@"; // grey grid line on ink
    }
    rows.push(row);
  }
  return rows;
}

/**
 * SCR!PTS floor logo — the brand lockup as a pixel inlay (square 5×5 = 80×80):
 * the lowercase wordmark `scr!pts` (the `!` is a 4-point star) under a pink comet
 * arcing from the upper-right. Drawn flat under everything as a tasteful decal.
 */
function buildEmblem(): string[] {
  const N = 80;
  const g: string[][] = Array.from({ length: N }, () => Array(N).fill("."));

  // ── Pink comet: big star (upper-right) → small star (mid-left), tapering streak.
  const bx = 60, by = 12, sx = 18, sy = 44;
  const star = (cx: number, cy: number, r: number, core: string, edge: string) => {
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const dx = x - cx, dy = y - cy;
        const spike = (Math.abs(dx) <= 1 && Math.abs(dy) <= r * 1.5) ||
          (Math.abs(dy) <= 1 && Math.abs(dx) <= r * 1.5);
        const body = Math.abs(dx) + Math.abs(dy) <= r;
        if (body) g[y][x] = core;
        else if (spike) g[y][x] = g[y][x] === core ? core : edge;
      }
  };
  // tapering streak (thick at the big star, thin toward the small one)
  const len = Math.hypot(bx - sx, by - sy);
  for (let t = 0; t <= 1; t += 1 / (len * 2)) {
    const cx = bx + (sx - bx) * t;
    const cy = by + (sy - by) * t;
    const th = 4 * (1 - t) + 0.6; // thickness ramp
    for (let y = -5; y <= 5; y++)
      for (let x = -5; x <= 5; x++) {
        if (Math.hypot(x, y) <= th) {
          const px = Math.round(cx + x), py = Math.round(cy + y);
          if (px >= 0 && px < N && py >= 0 && py < N) g[py][px] = Math.hypot(x, y) > th - 1 ? "p" : "P";
        }
      }
  }
  star(sx, sy, 4, "P", "p");
  star(bx, by, 8, "P", "p");

  // ── Wordmark `scr!pts` (ink). Simple blocky lowercase, 7w × 9h glyphs.
  const X = "K";
  const G: Record<string, string[]> = {
    s: [".#####.", "#.....#", "#......", ".#####.", "......#", "#.....#", ".#####.", ".......", "......."],
    c: [".#####.", "#.....#", "#......", "#......", "#......", "#.....#", ".#####.", ".......", "......."],
    r: ["#.####.", "##....#", "#......", "#......", "#......", "#......", "#......", ".......", "......."],
    "!": ["...#...", "..###..", ".#####.", "###.###", ".#####.", "..###..", "...#...", ".......", "......."],
    p: ["######.", "#.....#", "#.....#", "######.", "#......", "#......", "#......", ".......", "......."],
    t: ["..#....", "..#....", "#####..", "..#....", "..#....", "..#..#.", "...##..", ".......", "......."],
  };
  const word = ["s", "c", "r", "!", "p", "t", "s"];
  let cx = 11;
  const y0 = 52;
  for (const ch of word) {
    const glyph = G[ch];
    for (let gy = 0; gy < glyph.length; gy++)
      for (let gx = 0; gx < glyph[gy].length; gx++)
        if (glyph[gy][gx] === "#" && y0 + gy < N && cx + gx < N) g[y0 + gy][cx + gx] = X;
    cx += glyph[0].length + 1;
  }

  return g.map((r) => r.join(""));
}

/** Build a wall tile from a per-row character map (row index → fill char). */
function buildWallRows(rowChar: (y: number) => string): string[] {
  const rows: string[] = [];
  for (let y = 0; y < TILE; y++) rows.push(rowChar(y).repeat(TILE));
  return rows;
}

// Architectural, not decorative: paper face with a grey base band. The TOP
// variant gets a thin ink line along its very top edge so the wall reads as a
// crisp horizon against the floor.
const wallTopRows = buildWallRows((y) => {
  if (y === 0) return "@"; // thin ink top line
  if (y <= 12) return "="; // paper face
  return "+"; // grey base band (y13–15)
});

// Side wall: paper face, grey base band — no ink horizon (it's seen edge-on).
const wallSideRows = buildWallRows((y) => (y <= 12 ? "=" : "+"));

// Fully-enclosed wall (interior / void): solid ink with a faint grey top edge.
const wallFillRows = buildWallRows((y) => (y === 0 ? "+" : "@"));

// Bottom wall: meets the floor at its TOP edge; paper face above a grey base.
const wallBottomRows = buildWallRows((y) => (y <= 12 ? "=" : "+"));

export const floorArt: PixelArt = { rows: buildFloor(), palette: PAL };
export const floorBasementArt: PixelArt = { rows: buildFloorBasement(), palette: PAL };
export const emblemArt: PixelArt = { rows: buildEmblem(), palette: PAL };
export const wallTopArt: PixelArt = { rows: wallTopRows, palette: PAL };
export const wallSideArt: PixelArt = { rows: wallSideRows, palette: PAL };
export const wallBottomArt: PixelArt = { rows: wallBottomRows, palette: PAL };
export const wallFillArt: PixelArt = { rows: wallFillRows, palette: PAL };

/** Rolling clothing rail: shaded metal frame with a pink + a charcoal garment. */
export const rackArt: PixelArt = {
  palette: PAL,
  outline: "#14121A",
  rows: [
    "................",
    "..MeeeeeeeeeM...",
    "..G.........G...",
    "..G.MMM.MMM.G...",
    "..G.PPP.333.G...",
    "..G.PPP.333.G...",
    "..G.PpP.343.G...",
    "..G.Ppp.444.G...",
    "..G.ppp.444.G...",
    "..G..p...4..G...",
    "..G.........G...",
    "..G.........G...",
    ".GGG.......GGG..",
    "................",
    "................",
    "................",
  ],
};

/** Checkout counter with a register on top (wood ramp + screen). */
/**
 * Checkout — L-shaped wooden counter at its true footprint (2×5 = 32×80 px):
 * a short top bar + a long right column, with the bottom-left 1×4 transparent
 * (the staff gap, walkable). Edges auto-shade (lit top/left, dark base/right);
 * a register with a mint screen sits on the top bar.
 */
function buildCheckout(): string[] {
  const TILE = 16;
  const W = 2 * TILE; // 32
  const H = 5 * TILE; // 80
  const isL = (x: number, y: number) =>
    x >= 0 && x < W && y >= 0 && y < H && (y < TILE || x >= TILE);
  const rows: string[] = [];
  for (let y = 0; y < H; y++) {
    let row = "";
    for (let x = 0; x < W; x++) {
      let ch = ".";
      if (isL(x, y)) {
        const top = !isL(x, y - 1);
        const left = !isL(x - 1, y);
        const bottom = !isL(x, y + 1);
        const right = !isL(x + 1, y);
        if (top || left) ch = "u"; // lit countertop edge
        else if (bottom || right) ch = "R"; // shaded base / right
        else if (!isL(x, y - 2)) ch = "U"; // band under the cap
        else ch = "d"; // wood body
        // ── Top-bar clutter: register, card terminal, folded stock, a bag.
        if (y < TILE) {
          // Register (left).
          if (x >= 3 && x <= 10 && y >= 2 && y <= 11) {
            if (y >= 3 && y <= 6 && x >= 5 && x <= 9) ch = y === 3 ? "Z" : "q";
            else ch = "r";
          }
          // Card terminal (middle) — small keypad + screen.
          if (x >= 12 && x <= 16 && y >= 5 && y <= 11) ch = y <= 6 ? "q" : "r";
          // Folded cream stock (right).
          if (x >= 18 && x <= 23 && y >= 4 && y <= 10) ch = y === 4 || y === 7 ? "c" : "C";
          // Pink shopping bag (far right) with a handle.
          if (x >= 25 && x <= 29 && y >= 5 && y <= 11) ch = y === 5 ? "p" : "P";
          if ((x === 26 || x === 28) && y === 4) ch = "P"; // bag handles
        }
        // ── Right-column front face: pink signage panel.
        if (x >= TILE && y >= 40 && y <= 54 && x >= 18 && x <= 29) {
          const panelEdge = x === 18 || x === 29 || y === 40 || y === 54;
          ch = panelEdge ? "p" : y === 47 ? "o" : "P"; // pink panel + cream stripe
        }
      }
      row += ch;
    }
    rows.push(row);
  }
  return rows;
}

export const checkoutArt: PixelArt = { rows: buildCheckout(), palette: PAL, outline: "#14121A" };

/**
 * Down stairs (shop ↔ basement) — top-down steps: paper treads, grey risers,
 * a 1px ink nosing line at each step edge. A single brand-pink pixel on the top
 * riser flags it as a transition point without shouting.
 */
export const stairsArt: PixelArt = {
  palette: PAL,
  rows: [
    "================", // tread
    "================",
    "@@@@@@@@@@@@@@@@", // ink nosing
    "+++++++P++++++++", // riser (grey) — pink accent on the top step
    "================", // tread
    "================",
    "@@@@@@@@@@@@@@@@",
    "++++++++++++++++", // riser
    "================", // tread
    "================",
    "@@@@@@@@@@@@@@@@",
    "++++++++++++++++", // riser
    "================", // tread
    "================",
    "@@@@@@@@@@@@@@@@",
    "++++++++++++++++", // riser (descends into the dark)
  ],
};

/** SCR!PTS poster — pink frame, cream paper, ink mark. Mounted on a wall. */
export const posterArt: PixelArt = {
  palette: PAL,
  rows: [
    "................",
    "................",
    "...PPPPPPPPPP...",
    "...PooooooooP...",
    "...PovvoovvoP...",
    "...PooooooooP...",
    "...PovvvvvvoP...",
    "...PooooooooP...",
    "...PoovvvvooP...",
    "...PooooooooP...",
    "...PPPPPPPPPP...",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
};

// ── Scribbs character frames ────────────────────────────────────────────────
// Down / up / side (left = right mirrored). A = stand, B = mid-step (legs only
// differ). Shaded with a top-left light; auto-outlined for a FireRed edge.

const OUTLINE = "#14121A";

const scribbsDownA: PixelArt = {
  palette: PAL,
  outline: OUTLINE,
  rows: [
    "................",
    "....hhHHHHHH....",
    "...shhHHHHHHs...",
    "...sHSSSSSSns...",
    "...sHSOSSOSns...",
    "....HSSSSSSn....",
    "....HSSSSSSn....",
    "...bCCCCCCCCc...",
    "..bCCCCCCCCCCc..",
    "..bCCCCCCCCCCc..",
    "..bCcCCCCCCcCc..",
    "..bCCCCCCCCCCc..",
    "...JJJj..JJJj...",
    "...JJJj..JJJj...",
    "...BBB...BBB....",
    "................",
  ],
};

const scribbsDownB: PixelArt = {
  palette: PAL,
  outline: OUTLINE,
  rows: [
    "................",
    "....hhHHHHHH....",
    "...shhHHHHHHs...",
    "...sHSSSSSSns...",
    "...sHSOSSOSns...",
    "....HSSSSSSn....",
    "....HSSSSSSn....",
    "...bCCCCCCCCc...",
    "..bCCCCCCCCCCc..",
    "..bCCCCCCCCCCc..",
    "..bCcCCCCCCcCc..",
    "..bCCCCCCCCCCc..",
    "...JJJj..JJJj...",
    "...BBB...JJJj...",
    ".........BBB....",
    "................",
  ],
};

const scribbsUpA: PixelArt = {
  palette: PAL,
  outline: OUTLINE,
  rows: [
    "................",
    "....hhHHHHHH....",
    "...shhHHHHHHs...",
    "...sHHHHHHHHs...",
    "...sHHHHHHHHs...",
    "....HHHHHHHH....",
    "....HHHHHHHH....",
    "...bCCCCCCCCc...",
    "..bCCCCCCCCCCc..",
    "..bCCCCCCCCCCc..",
    "..bCcCCCCCCcCc..",
    "..bCCCCCCCCCCc..",
    "...JJJj..JJJj...",
    "...JJJj..JJJj...",
    "...BBB...BBB....",
    "................",
  ],
};

const scribbsUpB: PixelArt = {
  palette: PAL,
  outline: OUTLINE,
  rows: [
    "................",
    "....hhHHHHHH....",
    "...shhHHHHHHs...",
    "...sHHHHHHHHs...",
    "...sHHHHHHHHs...",
    "....HHHHHHHH....",
    "....HHHHHHHH....",
    "...bCCCCCCCCc...",
    "..bCCCCCCCCCCc..",
    "..bCCCCCCCCCCc..",
    "..bCcCCCCCCcCc..",
    "..bCCCCCCCCCCc..",
    "...JJJj..JJJj...",
    "...JJJj..BBB....",
    "...BBB..........",
    "................",
  ],
};

const scribbsSideA: PixelArt = {
  palette: PAL,
  outline: OUTLINE,
  rows: [
    "................",
    ".....hHHHHH.....",
    "....shHHHHH.....",
    "....sHHSSSSn....",
    "....sHHSOSn.....",
    ".....HHSSSn.....",
    ".....HHSSn......",
    "....bCCCCCCc....",
    "...bCCCCCCCCc...",
    "...bCCCCCCCCc...",
    "...bCcCCCCCCc...",
    "...bCCCCCCCc....",
    "....JJJJJ......",
    "....JJJj.......",
    "....BBBB.......",
    "................",
  ],
};

const scribbsSideB: PixelArt = {
  palette: PAL,
  outline: OUTLINE,
  rows: [
    "................",
    ".....hHHHHH.....",
    "....shHHHHH.....",
    "....sHHSSSSn....",
    "....sHHSOSn.....",
    ".....HHSSSn.....",
    ".....HHSSn......",
    "....bCCCCCCc....",
    "...bCCCCCCCCc...",
    "...bCCCCCCCCc...",
    "...bCcCCCCCCc...",
    "...bCCCCCCCc....",
    "...JJJJ.JJ.....",
    "..JJj...JJj....",
    "..BBB...BBB....",
    "................",
  ],
};

export const scribbsFrames = {
  "scribbs-down-a": scribbsDownA,
  "scribbs-down-b": scribbsDownB,
  "scribbs-up-a": scribbsUpA,
  "scribbs-up-b": scribbsUpB,
  "scribbs-side-a": scribbsSideA,
  "scribbs-side-b": scribbsSideB,
} as const;

// ── Shop fixtures (from the whiteboard map legend) ──────────────────────────
const OUT = "#14121A";

/** Display table (1 tile): wooden table with folded garment stacks on top. */
export const displayTableArt: PixelArt = {
  palette: PAL,
  outline: OUT,
  rows: [
    "................",
    "....CC..PPP.....",
    "...3CC..PPP.....",
    "...3333.PPP.....",
    "uuuuuuuuuuuuuuuu",
    "UUUUUUUUUUUUUUUU",
    "dddddddddddddddd",
    "..dd......dd....",
    "..dd......dd....",
    "..dd......dd....",
    "..dd......dd....",
    "..dd......dd....",
    "..dd......dd....",
    "..RR......RR....",
    "................",
    "................",
  ],
};

/**
 * Vinyl desk — true 2×1 footprint (32×16 px): a wood DJ desk with two
 * turntables (platter + dark label) and pink knobs along the front.
 */
function buildVinyl(): string[] {
  const W = 32;
  const H = 16;
  const platters = [
    { cx: 8, cy: 4 },
    { cx: 23, cy: 4 },
  ];
  const rows: string[] = [];
  for (let y = 0; y < H; y++) {
    let row = "";
    for (let x = 0; x < W; x++) {
      let ch = ".";
      if (y <= 8) ch = y === 0 ? "u" : "U"; // desk top surface
      for (const p of platters) {
        const d = Math.hypot(x - p.cx, y - p.cy);
        if (d < 4.6) ch = d < 1.6 ? "O" : "7"; // platter + label
      }
      if (y === 9) ch = "u"; // lit front lip
      if (y >= 10 && y <= 13) {
        ch = "d";
        if (y === 11 && ((x >= 4 && x <= 5) || (x >= 15 && x <= 16) || (x >= 26 && x <= 27))) ch = "P";
      }
      if (y === 14) ch = "R";
      row += ch;
    }
    rows.push(row);
  }
  return rows;
}

export const vinylDeskArt: PixelArt = { rows: buildVinyl(), palette: PAL, outline: OUT };

/** Mannequin / dress form (1 tile) on a metal stand. */
export const mannequinArt: PixelArt = {
  palette: PAL,
  outline: OUT,
  rows: [
    ".....CCCC.......",
    "....CCCCCC......",
    "....CCCCCC......",
    "...CCCCCCCC.....",
    "...CCCCCCCC.....",
    "...CCcCCCCC.....",
    "....CCCCCC......",
    ".....CCCC.......",
    ".....cGGc.......",
    "......GG........",
    "......GG........",
    "......GG........",
    ".....GGGG.......",
    "....GGGGGG......",
    "................",
    "................",
  ],
};

/** Speaker (1 tile): dark cabinet with two cones. */
export const speakerArt: PixelArt = {
  palette: PAL,
  outline: OUT,
  rows: [
    "..666666666666..",
    "..611111111116..",
    "..617777777716..",
    "..617OOOOOO716..",
    "..617OOOOOO716..",
    "..617777777716..",
    "..611111111116..",
    "..617777777716..",
    "..617OOOOOO716..",
    "..617OOOOOO716..",
    "..617777777716..",
    "..611111111116..",
    "..666666666666..",
    "................",
    "................",
    "................",
  ],
};

/** Stock box (1 tile): taped cardboard. */
export const boxArt: PixelArt = {
  palette: PAL,
  outline: OUT,
  rows: [
    "................",
    "................",
    "...TTTTTTTTTT...",
    "...TTTTLLTTTT...",
    "...TTTTLLTTTT...",
    "...TTTTLLTTTT...",
    "...TtttLLtttT...",
    "...TttttttttT...",
    "...TttttttttT...",
    "...TttttttttT...",
    "...TttttttttT...",
    "...TttttttttT...",
    "...tttttttttt...",
    "................",
    "................",
    "................",
  ],
};

/** NPC (1 tile): pink-hoodie shopper, facing down — distinct from Scribbs. */
export const npcArt: PixelArt = {
  palette: PAL,
  outline: OUT,
  rows: [
    "................",
    "....hhHHHHHH....",
    "...HhhHHHHHHH...",
    "...HNNNNNNNNH...",
    "...HNONNNNONH...",
    "....NNNNNNNN....",
    "....NNNNNNNN....",
    "...PPPPPPPPPP...",
    "..PPPPPPPPPPPP..",
    "..PPPPPPPPPPPP..",
    "..PPpPPPPPPpPP..",
    "..PPPPPPPPPPPP..",
    "...WWWD..WWWD...",
    "...WWWD..WWWD...",
    "...BBB...BBB....",
    "................",
  ],
};

/** Cashier (1 tile): staff at the till — charcoal tee + pink apron, facing down. */
export const cashierArt: PixelArt = {
  palette: PAL,
  outline: OUT,
  rows: [
    "................",
    "....HHHHHH......",
    "...HHHHHHHH.....",
    "...HNNNNNNH.....",
    "...HNONNONH.....",
    "....NNNNNN......",
    "...33333333.....",
    "..3333333333....",
    "..33PPPPPP33....",
    "..33PppppP33....",
    "..33PPPPPP33....",
    "..33PPPPPP33....",
    "...333..333.....",
    "...333..333.....",
    "...BB....BB.....",
    "................",
  ],
};

/**
 * Couch — L-shaped sectional at its true footprint (5×3 tiles = 80×48 px). The
 * solid L runs down the left column + along the bottom row; the top-right 4×2 is
 * transparent (the open corner, walkable). Charcoal backrest on the outer left +
 * bottom edges, cream cushions facing the inner corner, tufted seams + arm caps.
 */
function buildCouch(): string[] {
  const TILE = 16;
  const W = 5 * TILE; // 80
  const H = 3 * TILE; // 48
  const inL = (x: number, y: number) => x < TILE || y >= H - TILE;
  const rows: string[] = [];
  for (let y = 0; y < H; y++) {
    let row = "";
    for (let x = 0; x < W; x++) {
      let ch = ".";
      if (inL(x, y)) {
        const leftBack = x < 4; // outer back of the vertical arm
        const bottomBack = y >= H - 4; // outer back of the base
        const topCap = y < 3 && x < TILE; // top end of the vertical arm
        const rightCap = x >= W - 3 && y >= H - TILE; // right end of the base
        if (leftBack) {
          ch = x === 0 ? "6" : x === 3 ? "5" : "1";
        } else if (bottomBack) {
          ch = y === H - 1 ? "6" : y === H - 4 ? "5" : "1";
        } else if (topCap || rightCap) {
          ch = "1";
        } else {
          // Cushion field with tufting seams (charcoal) + top highlight / bottom shade.
          const seamBase = y >= H - TILE && x % TILE === 0; // base: vertical seams
          const seamArm = x < TILE && y % TILE === 0; // arm: horizontal seams
          if (seamBase || seamArm) ch = "6";
          else {
            const t = y % TILE;
            ch = t <= 2 ? "b" : t >= TILE - 2 ? "c" : "C";
          }
        }
      }
      row += ch;
    }
    rows.push(row);
  }
  return rows;
}

export const couchArt: PixelArt = { rows: buildCouch(), palette: PAL, outline: OUT };

/**
 * Rug (2×2 tiles): solid brand-pink fill, a 1px ink border, and a single inner
 * rule (one inset ink line). Simple and warm — adds a spot of colour without
 * competing with the fixtures. Non-solid (walkable).
 */
function buildRug(): string[] {
  const S = 32;
  const INSET = 3; // where the single inner rule sits
  const rows: string[] = [];
  for (let y = 0; y < S; y++) {
    let row = "";
    for (let x = 0; x < S; x++) {
      const border = x === 0 || y === 0 || x === S - 1 || y === S - 1;
      const innerRule = x === INSET || y === INSET || x === S - 1 - INSET || y === S - 1 - INSET;
      const insideRule = x > INSET && y > INSET && x < S - 1 - INSET && y < S - 1 - INSET;
      row += border ? "@" : innerRule && !insideRule ? "@" : "P";
    }
    rows.push(row);
  }
  return rows;
}

export const rugArt: PixelArt = { rows: buildRug(), palette: PAL };

/**
 * Entrance doors (3×1 = 48×16): a glass double-door — paper glass panels in a
 * grey frame, a grey centre mullion splitting the two leaves, and a horizontal
 * push bar across each. Reads as a front door at a glance.
 */
function buildDoors(): string[] {
  const W = 48;
  const H = 16;
  const MULL = W / 2; // centre mullion (24)
  const rows: string[] = [];
  for (let y = 0; y < H; y++) {
    let row = "";
    for (let x = 0; x < W; x++) {
      const frame = x <= 1 || x >= W - 2 || y === 0; // left/right jambs + head
      const mullion = x === MULL - 1 || x === MULL; // split between the leaves
      const pushBar = y >= 9 && y <= 10 && !frame && !mullion; // grey push bars
      if (frame || mullion || pushBar) row += "+";
      else row += "="; // glass panel
    }
    rows.push(row);
  }
  return rows;
}

export const doorsArt: PixelArt = { rows: buildDoors(), palette: PAL, outline: "#0D0D0D" };

/** Window for the back wall: wood frame, sky glass, a muntin bar + greenery. */
export const windowArt: PixelArt = {
  palette: PAL,
  outline: OUT,
  rows: [
    "................",
    "..000000000000..",
    "..0IIIIIIIIII0..",
    "..0IIIIIIIIII0..",
    "..0IIIIIIIIII0..",
    "..000000000000..",
    "..0YYYYYYYYYY0..",
    "..0YYmllmYYYY0..",
    "..0YmlllllmYY0..",
    "..0YYmllmYYYY0..",
    "..000000000000..",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
};

/** Potted plant (1 tile). */
export const plantArt: PixelArt = {
  palette: PAL,
  outline: OUT,
  rows: [
    "................",
    ".....llm........",
    "....mlllm.......",
    "...mlllllm......",
    "...llllllm......",
    "...mlllllk......",
    "....mlllk.......",
    ".....mlk........",
    "......kk........",
    ".....wwww.......",
    ".....wwww.......",
    "....wwwwww......",
    "....wVVVVw......",
    "....wwwwww......",
    ".....VVVV.......",
    "................",
  ],
};

/** Leafy potted tree (1 tile, taller foliage). */
export const treeArt: PixelArt = {
  palette: PAL,
  outline: OUT,
  rows: [
    "....mlllm.......",
    "...mlllllm......",
    "..mlllllllm.....",
    "..llllllllk.....",
    "..mllllllk......",
    "..mlllllllk.....",
    "...mllllllk.....",
    "....mllllk......",
    ".....mlk........",
    "......kk........",
    "......kk........",
    ".....wwww.......",
    ".....wwww.......",
    "....wwwwww......",
    "....wVVVVw......",
    "....wwwwww......",
  ],
};

/** Framed entrance mat at its true footprint (default 3 tiles wide): pink frame,
 * cream field, ink band. */
function buildMat(tiles = 3): string[] {
  const W = tiles * 16;
  const H = 16;
  const rows: string[] = [];
  for (let y = 0; y < H; y++) {
    let row = "";
    for (let x = 0; x < W; x++) {
      let ch = ".";
      if (y >= 2 && y <= 13 && x >= 2 && x <= W - 3) {
        const border = x < 4 || x > W - 5 || y < 4 || y > 11;
        if (border) ch = "P";
        else if (Math.abs(y - 8) < 1 && x > 6 && x < W - 7) ch = "v";
        else ch = "o";
      }
      row += ch;
    }
    rows.push(row);
  }
  return rows;
}

export const matArt: PixelArt = { rows: buildMat(3), palette: PAL };

/**
 * Clothing rail at its true footprint — a metal pole on end-posts, hung with a
 * dense run of individual garments on hangers: varied silhouettes (tee / hoodie
 * / jacket), varied brand colours (pink, charcoal, cream, denim), each with a
 * highlight + shade and a seam between neighbours so the rail reads full and
 * three-dimensional. `orient` "h" runs horizontally (length × 1 tile), "v" runs
 * vertically (1 tile × length, a side-on rail receding away). Deterministic by
 * garment index so any length tiles believably.
 */
const RAIL_COLORS: Array<[string, string, string]> = [
  ["P", "p", "P"], // pink: base, shade, highlight
  ["3", "4", "5"], // charcoal
  ["C", "c", "b"], // cream
  ["J", "j", "M"], // denim
];

function buildRail(tiles: number, orient: "h" | "v"): string[] {
  const len = tiles * 16;
  const ACROSS = 16;
  const W = orient === "h" ? len : ACROSS;
  const H = orient === "h" ? ACROSS : len;
  const STEP = 6; // garment pitch (dense, touching)
  const rows: string[] = [];
  for (let y = 0; y < H; y++) {
    let row = "";
    for (let x = 0; x < W; x++) {
      const a = orient === "h" ? x : y; // along the rail
      const c = orient === "h" ? y : x; // across the rail (0 top → 15 hem)
      let ch = ".";
      const inBar = a >= 2 && a < len - 2;
      if ((a < 2 || a >= len - 2) && c >= 1 && c <= 13) {
        ch = "G"; // end posts
      } else if (c === 1 && inBar) {
        ch = "M"; // pole highlight
      } else if (c === 2 && inBar) {
        ch = "e"; // pole
      } else if (c >= 2 && a >= 3 && a < len - 3) {
        const gi = Math.floor((a - 3) / STEP);
        const w = (a - 3) % STEP; // 0..5 across this garment
        const [base, shade, hi] = RAIL_COLORS[gi % RAIL_COLORS.length];
        const shape = gi % 3; // 0 tee · 1 hoodie · 2 jacket
        const hem = shape === 2 ? 14 : shape === 1 ? 13 : 11; // jacket longest
        const shoulder = 3; // garment top
        // hanger hook over the pole
        if (c === 2 && (w === 2 || w === 3)) {
          ch = "M";
        } else if (c >= shoulder && c <= hem) {
          // shoulders taper in at the very top row; body is full width
          const narrow = c === shoulder && (w === 0 || w === 5);
          if (!narrow) {
            if (w === 0) ch = shade; // seam to the left neighbour
            else if (c === hem) ch = shade; // hem shadow
            else if (w === 1 || c === shoulder) ch = hi; // lit fold / shoulder
            else ch = base;
            // garment detailing
            if (shape === 1 && c >= 8 && c <= 10 && w >= 2 && w <= 3) ch = shade; // hoodie pocket
            if (shape === 1 && c === shoulder + 1 && w >= 2 && w <= 3) ch = shade; // hood
            if (shape === 2 && w === 3) ch = shade; // jacket centre zip
          }
        }
      }
      row += ch;
    }
    rows.push(row);
  }
  return rows;
}

export const railH7Art: PixelArt = { rows: buildRail(7, "h"), palette: PAL, outline: OUT };
export const railV7Art: PixelArt = { rows: buildRail(7, "v"), palette: PAL, outline: OUT };
export const railH3Art: PixelArt = { rows: buildRail(3, "h"), palette: PAL, outline: OUT };
export const railV3Art: PixelArt = { rows: buildRail(3, "v"), palette: PAL, outline: OUT };
