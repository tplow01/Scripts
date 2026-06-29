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

  // floor (warm light-oak planks)
  "0": "#A8895C", // plank seam (dark)
  "2": "#DAC59E", // plank top highlight
  "8": "#CDB488", // plank body
  "9": "#B89A6C", // plank bottom shade
  a: "#C2A878", // grain fleck
  F: "#E4D2AE", // emblem light inlay

  // plants
  l: "#8FBF6B", // leaf light
  m: "#5E9A48", // leaf mid
  k: "#3E6E33", // leaf dark
  w: "#B5683C", // terracotta pot
  V: "#8B4E2C", // pot shade
  // window glass
  I: "#BFE3E8", // sky glass
  Y: "#9CCBD4", // glass low

  // wall (charcoal + pink trim, cap/face)
  A: "#3E3648", // cap highlight (lit top edge)
  Q: "#1A1722", // cap top surface (dark)
  W: "#2B2730", // face mid
  D: "#221E29", // face shade
  K: "#14111A", // baseboard / void (darkest)
  P: "#FF8AC7", // brand pink (trim, headphones, garment, poster)
  p: "#D43E86", // pink shade

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
 * Warm light-oak plank floor (FireRed-interior idiom). Two horizontal planks per
 * tile: a dark seam, a lit top edge under it, a shaded bottom edge, plank body
 * between, with deterministic grain flecks. Tiles seamlessly into long boards.
 */
function buildFloor(): string[] {
  const rows: string[] = [];
  for (let y = 0; y < TILE; y++) {
    let row = "";
    const r = y % 8; // 8px plank height → 2 planks per 16px tile
    for (let x = 0; x < TILE; x++) {
      if (r === 0) row += "0"; // seam between planks
      else if (r === 1) row += "2"; // lit top of plank
      else if (r === 7) row += "9"; // shaded bottom of plank
      else if ((x * 7 + y * 13) % 23 === 0) row += "a"; // grain fleck
      else row += "8"; // plank body
    }
    rows.push(row);
  }
  return rows;
}

/**
 * Faint floor emblem — concentric rings + a centre band, the SCR!PTS take on
 * FireRed's Poké Ball floor inlay. Authored large (6×6 tiles = 96px) and drawn
 * under everything; transparent except the subtly-lighter inlay pixels.
 */
function buildEmblem(): string[] {
  const N = 96;
  const c = (N - 1) / 2;
  const rows: string[] = [];
  for (let y = 0; y < N; y++) {
    let row = "";
    for (let x = 0; x < N; x++) {
      const d = Math.hypot(x - c, y - c);
      const onOuter = d > 42 && d < 45;
      const onInner = d > 26 && d < 29;
      const onBand = Math.abs(y - c) < 1.5 && d < 45;
      row += onOuter || onInner || onBand ? "F" : ".";
    }
    rows.push(row);
  }
  return rows;
}

/** Build a wall tile from a per-row character map (row index → fill char). */
function buildWallRows(rowChar: (y: number) => string): string[] {
  const rows: string[] = [];
  for (let y = 0; y < TILE; y++) rows.push(rowChar(y).repeat(TILE));
  return rows;
}

// Top wall: lit cap, dark cap surface, shadow line, pink trim, face, baseboard.
const wallTopRows = buildWallRows((y) => {
  if (y === 0) return "A";
  if (y <= 2) return "Q";
  if (y === 3) return "K";
  if (y === 4) return "P";
  if (y === 5) return "p";
  if (y <= 13) return "W";
  if (y === 14) return "D";
  return "K";
});

// Side wall: small top highlight, trim, face, baseboard (no deep cap).
const wallSideRows = buildWallRows((y) => {
  if (y === 0) return "A";
  if (y === 1) return "P";
  if (y === 2) return "p";
  if (y <= 13) return "W";
  if (y === 14) return "D";
  return "K";
});

// Fully-enclosed wall (interior / void): plain dark, no trim, faint top edge.
const wallFillRows = buildWallRows((y) => (y === 0 ? "D" : "W"));

// Bottom wall: meets the floor at its TOP edge, face below.
const wallBottomRows = buildWallRows((y) => {
  if (y === 0) return "K";
  if (y === 1) return "A";
  if (y === 2) return "P";
  if (y === 3) return "p";
  if (y <= 14) return "W";
  return "D";
});

export const floorArt: PixelArt = { rows: buildFloor(), palette: PAL };
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
export const checkoutArt: PixelArt = {
  palette: PAL,
  outline: "#14121A",
  rows: [
    "................",
    ".....rrrrrr.....",
    ".....rZZZZr.....",
    ".....rqqqqr.....",
    ".....rrrrrr.....",
    "uuuuuuuuuuuuuuuu",
    "UUUUUUUUUUUUUUUU",
    "dddddddddddddddd",
    "dddRdddddddRdddd",
    "dddddddddddddddd",
    "dddddddddddddddd",
    "dddRdddddddRdddd",
    "dddddddddddddddd",
    "dddddddddddddddd",
    "RRRRRRRRRRRRRRRR",
    "................",
  ],
};

/** Down stairs to the Basement — lit lips receding into the dark. */
export const stairsArt: PixelArt = {
  palette: PAL,
  rows: [
    "iiiiiiiiiiiiiiii",
    "xxxxxxxxxxxxxxxx",
    "xxxxxxxxxxxxxxxx",
    "iiiiiiiiiiiiiiii",
    "yyyyyyyyyyyyyyyy",
    "yyyyyyyyyyyyyyyy",
    "iiiiiiiiiiiiiiii",
    "zzzzzzzzzzzzzzzz",
    "zzzzzzzzzzzzzzzz",
    "KKKKKKKKKKKKKKKK",
    "KKKKKKKKKKKKKKKK",
    "KKKKKKKKKKKKKKKK",
    "KKKKKKKKKKKKKKKK",
    "KKKKKKKKKKKKKKKK",
    "KKKKKKKKKKKKKKKK",
    "KKKKKKKKKKKKKKKK",
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
    "...PhhHHHHHHP...",
    "...PHSSSSSSnP...",
    "...PHSOSSOSnP...",
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
    "...PhhHHHHHHP...",
    "...PHSSSSSSnP...",
    "...PHSOSSOSnP...",
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
    "...PhhHHHHHHP...",
    "...PHHHHHHHHP...",
    "...PHHHHHHHHP...",
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
    "...PhhHHHHHHP...",
    "...PHHHHHHHHP...",
    "...PHHHHHHHHP...",
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
    "....PhHHHHH.....",
    "....PHHSSSSn....",
    "....PHHSOSn.....",
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
    "....PhHHHHH.....",
    "....PHHSSSSn....",
    "....PHHSOSn.....",
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

/** Vinyl desk (1 tile): DJ desk with a turntable + pink knobs. */
export const vinylDeskArt: PixelArt = {
  palette: PAL,
  outline: OUT,
  rows: [
    "...77777777.....",
    "..7777777777....",
    "..77OOOOO777....",
    "..7777777777....",
    "uuuuuuuuuuuuuuuu",
    "UUUUUUUUUUUUUUUU",
    "dddddddddddddddd",
    "dddddddddddddddd",
    "ddPPddddddPPdddd",
    "dddddddddddddddd",
    "dddddddddddddddd",
    "dddddddddddddddd",
    "dddddddddddddddd",
    "RRRRRRRRRRRRRRRR",
    "................",
    "................",
  ],
};

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

/** Couch (2 tiles wide): arms, charcoal back, two cream cushions, legs. */
function buildCouch(): string[] {
  const W = 32;
  const H = 16;
  const rows: string[] = [];
  for (let y = 0; y < H; y++) {
    let row = "";
    for (let x = 0; x < W; x++) {
      let ch = ".";
      const arm = (x >= 2 && x <= 5) || (x >= 26 && x <= 29);
      const armBody = arm && y >= 3 && y <= 13;
      const back = y >= 2 && y <= 6 && x >= 2 && x <= 29;
      const seat = y >= 7 && y <= 12 && x >= 6 && x <= 25;
      const legs = y >= 13 && y <= 14 && ((x >= 4 && x <= 6) || (x >= 25 && x <= 27));
      if (back) ch = y === 2 ? "5" : "1";
      if (armBody) ch = x === 2 || x === 26 ? "5" : x === 5 || x === 29 ? "6" : "1";
      if (seat) {
        if (x === 15 || x === 16) ch = "6";
        else ch = y === 7 ? "b" : y === 12 ? "c" : "C";
      }
      if (legs) ch = "6";
      row += ch;
    }
    rows.push(row);
  }
  return rows;
}

export const couchArt: PixelArt = { rows: buildCouch(), palette: PAL, outline: OUT };

/** Rug (2×2 tiles): pink border, cream field, pink diamond motif. Non-solid. */
function buildRug(): string[] {
  const S = 32;
  const c = (S - 1) / 2;
  const rows: string[] = [];
  for (let y = 0; y < S; y++) {
    let row = "";
    for (let x = 0; x < S; x++) {
      let ch: string;
      if (x < 2 || y < 2 || x >= S - 2 || y >= S - 2) ch = "P";
      else if (x < 4 || y < 4 || x >= S - 4 || y >= S - 4) ch = "p";
      else {
        const d = Math.abs(x - c) + Math.abs(y - c);
        ch = d < 6 ? "P" : d < 9 ? "p" : "o";
      }
      row += ch;
    }
    rows.push(row);
  }
  return rows;
}

export const rugArt: PixelArt = { rows: buildRug(), palette: PAL };

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

/** Framed floor mat (2 tiles wide): pink frame, cream field, ink band. */
function buildMat(): string[] {
  const W = 32;
  const H = 16;
  const rows: string[] = [];
  for (let y = 0; y < H; y++) {
    let row = "";
    for (let x = 0; x < W; x++) {
      let ch = ".";
      if (y >= 2 && y <= 13 && x >= 2 && x <= 29) {
        const border = x < 4 || x > 27 || y < 4 || y > 11;
        if (border) ch = "P";
        else if (Math.abs(y - 8) < 1 && x > 8 && x < 23) ch = "v";
        else ch = "o";
      }
      row += ch;
    }
    rows.push(row);
  }
  return rows;
}

export const matArt: PixelArt = { rows: buildMat(), palette: PAL };
