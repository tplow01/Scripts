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

  // ── FireRed wall/floor ramp (Track A) + rail blue ──
  "!": "#F5F3EE", // wall face / floor alt quad — close to SCR!PTS paper white
  ",": "#EDEBE4", // wall cap seam / floor grout — barely-there line
  ";": "#E3E0D7", // floor quad shade pixel
  ":": "#B9B9BC", // wall grooves / molding
  "#": "#8C8C90", // wall lower band
  "'": "#4A4A4F", // wall base shadow
  "<": "#5FA7D6", // rail blue
  "]": "#161616", // basement floor alt quad (ink checker partner)
  "[": "#1E1E1E", // basement floor grout
  "}": "#101010", // basement floor quad shade pixel

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

  // ── FireRed character refresh (Heath/Teo/Thomas/Karl/Gomes) + exterior ──
  "*": "#F5CBA3", // skin highlight (3-tone skin: * highlight, S mid, n shade)
  "%": "#8A5A34", // light-brown hair (Heath's curls)
  "&": "#6B4226", // light-brown hair shade
  "~": "#D8B36A", // sandy-blond hair (Thomas)
  "^": "#B08A45", // sandy-blond shade
  "?": "#D9A94A", // gold (door handles, lamp)
  "/": "#A87B2C", // gold shade
  "(": "#FFB3DA", // pink highlight (logo 3-tone: ( highlight, P mid, p shade)
  "$": "#FF4FA3", // brand secondary pink — entrance carpet fill

  // ── Anime hair refresh — deeper shade + sheen so each ramp reads 3-tone ──
  "-": "#1B1624", // ink hair deep shade (under-layer)
  "_": "#6A6280", // ink hair sheen (anime highlight streak)
  ")": "#A5794A", // light-brown hair highlight (Heath's curls)
  ">": "#EFD695", // sandy-blond highlight (Thomas)
};

const TILE = 16;

/**
 * Warm 2-tone checker floor (FireRed interior idiom): each 16px tile is a 2×2
 * checker of 8px quads with a thin grout grid and a single shade pixel per
 * quad. Light + neutral so the clothes and fixtures pop.
 */
function buildFloor(): string[] {
  const rows: string[] = [];
  for (let y = 0; y < TILE; y++) {
    let row = "";
    for (let x = 0; x < TILE; x++) {
      // Warm 2-tone checker: each tile is a 2×2 grid of 8px quads. Quads
      // (0,0)/(1,1) use paper, (0,1)/(1,0) a warm off-white; each quad gets a
      // 1px grout line on its top + left edge and a single shade pixel at its
      // inner bottom-right corner.
      const lx = x % 8;
      const ly = y % 8;
      if (lx === 0 || ly === 0) row += ",";
      else if (lx === 7 && ly === 7) row += ";";
      else row += (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0 ? "=" : "!";
    }
    rows.push(row);
  }
  return rows;
}

/**
 * Basement floor — the same warm 2-tone checker as the shop floor (8px
 * quads, grout grid, shade pixel), just in SCR!PTS ink instead of paper —
 * the underground twin of the upstairs pattern. No pink here; warmth
 * arrives only through the props.
 */
function buildFloorBasement(): string[] {
  const rows: string[] = [];
  for (let y = 0; y < TILE; y++) {
    let row = "";
    for (let x = 0; x < TILE; x++) {
      const lx = x % 8;
      const ly = y % 8;
      if (lx === 0 || ly === 0) row += "[";
      else if (lx === 7 && ly === 7) row += "}";
      else row += (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0 ? "@" : "]";
    }
    rows.push(row);
  }
  return rows;
}

/**
 * SCR!PTS floor logo — the real brand lockup as a pixel inlay (80×80), no
 * frame or medallion: a 3-tone pink comet (big 4-point star upper-right,
 * tapering streak down-left to a small star) floats directly over the
 * floor, with the `scr!pts` wordmark centred below it — matching the actual
 * logo mark 1:1 rather than a bordered plate.
 */
function buildEmblem(): string[] {
  const N = 80;
  const g: string[][] = Array.from({ length: N }, () => Array(N).fill("."));

  // ── Comet: big star upper-right → small star lower-left, joined by a
  // tapering streak (thick at the big star, thin at the small one).
  const bx = 58, by = 14, sx = 20, sy = 46;
  const star = (cx: number, cy: number, r: number) => {
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const dx = x - cx, dy = y - cy;
        const spike = (Math.abs(dx) <= 1 && Math.abs(dy) <= r * 1.6) ||
          (Math.abs(dy) <= 1 && Math.abs(dx) <= r * 1.6);
        const body = Math.abs(dx) + Math.abs(dy) <= r;
        if (body || spike) {
          // 3-tone: highlight toward top-left, shade toward bottom-right.
          g[y][x] = dx + dy < -Math.floor(r / 2) ? "(" : dx + dy > Math.floor(r / 2) ? "p" : "P";
        }
      }
  };
  const len = Math.hypot(bx - sx, by - sy);
  for (let t = 0; t <= 1; t += 1 / (len * 2)) {
    const cx = bx + (sx - bx) * t;
    const cy = by + (sy - by) * t;
    const th = 4 * (1 - t) + 0.6;
    for (let y = -6; y <= 6; y++)
      for (let x = -6; x <= 6; x++) {
        const d = Math.hypot(x, y);
        if (d <= th) {
          const px = Math.round(cx + x), py = Math.round(cy + y);
          if (px >= 0 && px < N && py >= 0 && py < N) {
            g[py][px] = d > th - 1.2 ? "p" : y < -th / 3 ? "(" : "P";
          }
        }
      }
  }
  star(bx, by, 11);
  star(sx, sy, 5);

  // ── Wordmark `scr!pts` — bolder 8w×11h glyphs (2px strokes) so it holds at
  // floor scale. `!` is the brand 4-point star.
  const X = "K";
  const G: Record<string, string[]> = {
    s: ["..#####.", ".##...##", ".##.....", "..#####.", ".....##.", ".##...##", "..#####.", "........", "........", "........", "........"],
    c: ["..#####.", ".##...##", ".##.....", ".##.....", ".##.....", ".##...##", "..#####.", "........", "........", "........", "........"],
    r: [".##.###.", ".###..##", ".##.....", ".##.....", ".##.....", ".##.....", ".##.....", "........", "........", "........", "........"],
    "!": ["...##...", "..####..", ".######.", "###..###", ".######.", "..####..", "...##...", "........", "........", "........", "........"],
    p: [".######.", ".##...##", ".##...##", ".######.", ".##.....", ".##.....", ".##.....", "........", "........", "........", "........"],
    t: ["...##...", "...##...", ".######.", "...##...", "...##...", "...##.##", "....###.", "........", "........", "........", "........"],
  };
  const word = ["s", "c", "r", "!", "p", "t", "s"];
  let cx = 6;
  const y0 = 58;
  for (const ch of word) {
    const glyph = G[ch];
    for (let gy = 0; gy < glyph.length; gy++)
      for (let gx = 0; gx < glyph[gy].length; gx++)
        if (glyph[gy][gx] === "#" && y0 + gy < N && cx + gx < N) g[y0 + gy][cx + gx] = X;
    cx += glyph[0].length + 2;
  }

  return g.map((r) => r.join(""));
}

/** Build a wall tile from a per-row character map (row index → fill char). */
function buildWallRows(rowChar: (y: number) => string): string[] {
  const rows: string[] = [];
  for (let y = 0; y < TILE; y++) rows.push(rowChar(y).repeat(TILE));
  return rows;
}

/**
 * FireRed 3-band wall face: lit cap → warm face with vertical grooves and a
 * horizontal molding → darkening base (pink trim on the visible faces). The
 * side variant trades the ink horizon for a lit cap and keeps only the x=0
 * groove; the bottom variant is plain face (no molding row / pink trim).
 */
function buildWallFace(kind: "top" | "side" | "bottom"): string[] {
  const rows: string[] = [];
  for (let y = 0; y < TILE; y++) {
    let row = "";
    for (let x = 0; x < TILE; x++) {
      let ch: string;
      if (kind === "side") {
        // Side runs stack vertically, so no horizontal bands — a quiet face
        // with continuous vertical panel grooves that tile seamlessly.
        ch = x === 0 || x === 8 ? ":" : "!";
      } else if (y === 0) ch = "@"; // ink horizon
      else if (y <= 2) ch = "="; // lit cap
      else if (y === 3) ch = ","; // cap seam
      else if (y === 15) ch = "@"; // ink base line
      else if (y === 14) ch = "'"; // base shadow
      else if (kind === "bottom") {
        // plain face y4–13 with vertical grooves
        ch = x === 0 || x === 8 ? ":" : "!";
      } else if (y === 12) ch = "P"; // pink trim
      else if (y === 13) ch = "#"; // lower band
      else if (y === 8) ch = ":"; // horizontal molding
      else {
        // face y4–11 with vertical grooves
        ch = x === 0 || x === 8 ? ":" : "!";
      }
      row += ch;
    }
    rows.push(row);
  }
  return rows;
}

const wallTopRows = buildWallFace("top");

// Side wall: lit cap instead of the ink horizon (it's seen edge-on).
const wallSideRows = buildWallFace("side");

// Fully-enclosed wall (interior / void): solid ink so the cutout merges with
// the exterior void.
const wallFillRows = buildWallRows(() => "@");

// Bottom wall: meets the floor at its TOP edge.
const wallBottomRows = buildWallFace("bottom");

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
 * Down stairs (shop ↔ basement) — a framed dark stairwell seen top-down:
 * side rails (charcoal outer column + ink inner line), an ink lintel across
 * the top, and four treads receding upward from light paper to near-dark,
 * each topped with a 1px ink nosing. One brand-pink pixel marks the bottom
 * tread edge as the transition point.
 */
export const stairsArt: PixelArt = {
  palette: PAL,
  rows: [
    "@@@@@@@@@@@@@@@@", // ink lintel
    "@@@@@@@@@@@@@@@@",
    "'@@@@@@@@@@@@@@'", // dark headroom — the hole the stairs descend into
    "'@@@@@@@@@@@@@@'",
    "'@@@@@@@@@@@@@@'",
    "'@''''''''''''@'", // top tread — barely lit
    "'@@@@@@@@@@@@@@'", // nosing
    "'@############@'", // tread 3
    "'@''''''''''''@'", // riser shadow
    "'@@@@@@@@@@@@@@'", // nosing
    "'@;;;;;;;;;;;;@'", // tread 2
    "'@############@'",
    "'@@@@@@@@@@@@@@'", // nosing
    "'@=P==========@'", // bottom tread — lightest, pink accent at the edge
    "'@============@'",
    "'@;;;;;;;;;;;;@'",
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
    "....hh_HHHh.....",
    "...hHHHHHHHHh...",
    "..-HHhHHHHhHH-..",
    "..sHSSHSSHSSHs..",
    "..sHSSOSSOSSHs..",
    "...-nSSSSSSn-...",
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
    "....hh_HHHh.....",
    "...hHHHHHHHHh...",
    "..-HHhHHHHhHH-..",
    "..sHSSHSSHSSHs..",
    "..sHSSOSSOSSHs..",
    "...-nSSSSSSn-...",
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
    "....hh_HHHh.....",
    "...hHHHHHHHHh...",
    "..-HHhHHHHhHH-..",
    "..sHHHHHHHHHHs..",
    "..sHH-HHHH-HHs..",
    "...-HHHHHHHH-...",
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
    "....hh_HHHh.....",
    "...hHHHHHHHHh...",
    "..-HHhHHHHhHH-..",
    "..sHHHHHHHHHHs..",
    "..sHH-HHHH-HHs..",
    "...-HHHHHHHH-...",
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
    "....hh_HHHh.....",
    "..hhHHHHHHHh....",
    "...sHh_HSSSSn...",
    "...sHHHSOSSn....",
    "....-HHSSSSn....",
    ".....-HHSSn.....",
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
    "....hh_HHHh.....",
    "..hhHHHHHHHh....",
    "...sHh_HSSSSn...",
    "...sHHHSOSSn....",
    "....-HHSSSSn....",
    ".....-HHSSn.....",
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
    "...h.h_h.h_h....",
    "..HHHHHHHHHHH...",
    "..HHh_HHHH_hH-..",
    "..HHNNNNNNNNHH..",
    "..HNNONNNNONNH..",
    "...HNNNNNNNNH...",
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

/**
 * Heath (artKey "cashier") — the shop host at the till. White ribbed beanie
 * with light-brown curls peeking out, white MJ tee (tiny dark figure on the
 * chest), charcoal trousers. FireRed shading: 3-tone skin, 2-tone hair,
 * auto-outline. Faces down; flipped in world data to face the checkout.
 */
export const cashierArt: PixelArt = {
  palette: PAL,
  outline: OUT,
  rows: [
    "................",
    "....========....",
    "...==========...",
    "...=99999999=...",
    "..%)&SSSSSS&)%..",
    "..%*SSOSSOSS*%..",
    "..&nSSSSSSSSn&..",
    "....nnSSSSnn....",
    "...==========...",
    "..============..",
    "..====9KK9====..",
    "..====9KK9====..",
    "...333....333...",
    "...333....333...",
    "...BB......BB...",
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
 * The shop-floor regulars, FireRed style. Likeness = hair + the SCR!PTS tee
 * each wears (base colour + a small chest accent — all designs are sold in
 * the shop). Internal names only; no nameplates.
 */

// Teo (artKey "npcRail") — messy black hair, LOVE tee (green, pink heart).
export const npcRailArt: PixelArt = {
  palette: PAL,
  outline: OUT,
  rows: [
    "................",
    "...H.H.H.H.H....",
    "..hHHHHHHHHHH...",
    "..HHh_HHHH_hH-..",
    "..HH*SSSSSSSHH..",
    "..HSSOSSSSOSSH..",
    "....nSSSSSSn....",
    "....nnSSSSnn....",
    "...mmmmmmmmmm...",
    "..mmmmmmmmmmmm..",
    "..mmmk(PP(kmmm..",
    "..mmmmkPPkmmmm..",
    "...WWW....WWW...",
    "...WWWD..WWWD...",
    "...BBB....BBB...",
    "................",
  ],
};

// Thomas (artKey "npcGazer") — sandy curls, CONFUSION tee (white, pink ?).
export const npcGazerArt: PixelArt = {
  palette: PAL,
  outline: OUT,
  rows: [
    "................",
    "....>~^~~^~.....",
    "...~^~~>~~^~~...",
    "..^~~^~~~^~~^~..",
    "..~~*SSSSSS*~^..",
    "..~SSOSSSSOSS^..",
    "..^~nSSSSSSn~^..",
    "....nnSSSSnn....",
    "...==========...",
    "..============..",
    "..===9(PP(9===..",
    "..====9PP9====..",
    "...JJJ....JJJ...",
    "...JJJj..JJJj...",
    "...BBB....BBB...",
    "................",
  ],
};

// Karl (artKey "npcSitter") — dark hair, ARE YOU OKAY tee (black, pink cross).
// Same standing pose (he's placed on the couch cushions, reads as lounging).
export const npcSitterArt: PixelArt = {
  palette: PAL,
  outline: OUT,
  rows: [
    "................",
    "...HHH_.._HHH...",
    "..HHHHH--HHHHH..",
    "..HHhHH--HHhHH..",
    "..HHSSSSSSSSHH..",
    "..HSSOSSSSOSSH..",
    "...HnSSSSSSnH...",
    "....nnSSSSnn....",
    "...3333333333...",
    "..333333333333..",
    "..334(PPPP(433..",
    "..3334(PP(4333..",
    "...WWW....WWW...",
    "...WWWD..WWWD...",
    "...BBB....BBB...",
    "................",
  ],
};

// Gomes (artKey "npcShopper") — black spiky hair, RAGE tee (white, pink/blue).
export const npcShopperArt: PixelArt = {
  palette: PAL,
  outline: OUT,
  rows: [
    "................",
    "..H..H_H_H..H...",
    "..HHHHHHHHHHHH..",
    "..HHh_HHHH_hHH..",
    "..HH*SSSSSS*HH..",
    "..HSSOSSSSOSSH..",
    "....nSSSSSSn....",
    "....nnSSSSnn....",
    "...==========...",
    "..============..",
    "..==9(JPPJ(9==..",
    "..===9(PP(9===..",
    "...WWW....WWW...",
    "...WWWD..WWWD...",
    "...BBB....BBB...",
    "................",
  ],
};

/**
 * Record crates (1 tile) — a wooden crate of vinyl with sleeves poking out the
 * top. Conceals the secret basement stairs until the deck is played.
 */
function buildCrates(): string[] {
  const W = 16, H = 16;
  const sleeves = ["3", "C", "P", "s", "4", "C", "P", "3"]; // record spines
  const rows: string[] = [];
  for (let y = 0; y < H; y++) {
    let row = "";
    for (let x = 0; x < W; x++) {
      let ch = ".";
      const inSleeves = x >= 3 && x <= 12 && y >= 1 && y <= 3;
      const inCrate = x >= 2 && x <= 13 && y >= 4 && y <= 14;
      if (inSleeves) {
        ch = sleeves[(x - 3) % sleeves.length];
      } else if (inCrate) {
        const rim = y === 4 || y === 14 || x === 2 || x === 13;
        if (rim) ch = "d";
        else ch = (y - 5) % 3 === 0 ? "U" : "u";
      }
      row += ch;
    }
    rows.push(row);
  }
  return rows;
}
export const cratesArt: PixelArt = { rows: buildCrates(), palette: PAL, outline: OUT };

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

/**
 * Entrance carpet (default 3 tiles wide): a flat SCR!PTS-pink fill marking
 * the doorway, FireRed-style — no doors sprite, the carpet IS the entrance.
 * A single lit pixel row along the top gives it a hair of depth. The mat
 * overhangs its own tile by `MAT_OVERHANG_PX` so it can bleed slightly past
 * the floor edge onto the black exterior, like the FireRed doormat that
 * pokes just over the threshold.
 */
export const MAT_OVERHANG_PX = 5;

function buildMat(tiles = 3): string[] {
  const W = tiles * 16;
  const H = 16 + MAT_OVERHANG_PX;
  const rows: string[] = [];
  for (let y = 0; y < H; y++) {
    rows.push((y === 0 ? "(" : "$").repeat(W));
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
type RailTee = { base: string; shade: string; hi: string; graphic: string[] };
const RAIL_TEES: RailTee[] = [
  // LOVE — green body, pink heart
  { base: "m", shade: "k", hi: "m", graphic: ["(PP(", "PPPP", ".PP."] },
  // CONFUSION — white body, pink question mark (hook · gap · dot)
  { base: "=", shade: "9", hi: "=", graphic: ["PPP.", "..P.", ".P..", "....", ".P.."] },
  // ARE YOU OKAY — charcoal body (lit fold so it reads as a garment, not a
  // gap, between the white tees), pink plus
  { base: "3", shade: "4", hi: "5", graphic: [".PP.", "PPPP", ".PP."] },
  // RAGE — white body, diagonal pink-over-blue rage slash
  { base: "=", shade: "9", hi: "=", graphic: ["..PP", ".P<.", "P<..", "<..."] },
];

function buildRail(tiles: number, orient: "h" | "v"): string[] {
  const len = tiles * 16;
  const ACROSS = 16;
  const W = orient === "h" ? len : ACROSS;
  const H = orient === "h" ? ACROSS : len;
  const STEP = 8; // garment pitch — wide enough for a chest graphic
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
        const w = (a - 3) % STEP; // 0..7 across this garment
        const { base, shade, hi, graphic } = RAIL_TEES[gi % RAIL_TEES.length];
        const hem = 12; // graphic-tee silhouette
        const shoulder = 3; // garment top
        // hanger: M hook over the pole, e shoulder-bar beneath it
        if (c === 2 && (w === 3 || w === 4)) {
          ch = "M";
        } else if (c === 3 && w >= 2 && w <= 5) {
          ch = "e"; // hanger shoulder bar
        } else if (c >= shoulder && c <= hem) {
          // shoulders taper in at the very top row; body is full width
          const narrow = c === shoulder && (w === 0 || w === 7);
          if (!narrow) {
            if (w === 0) ch = shade; // seam to the left neighbour
            else if (c === hem) ch = shade; // hem shadow
            else if (w === 1 || c === shoulder) ch = hi; // lit fold / shoulder
            else ch = base;
            // chest graphic — centred on the garment
            const gh = graphic.length;
            const gy = c - (8 - Math.floor(gh / 2));
            const gx = w - 2;
            if (gy >= 0 && gy < gh && gx >= 0 && gx < graphic[gy].length && graphic[gy][gx] !== ".") {
              ch = graphic[gy][gx];
            }
          }
        }
        // price tag off the right shoulder on every 3rd garment
        if (gi % 3 === 2 && w >= 6 && w <= 7 && (c === 4 || c === 5)) {
          ch = w === 6 && c === 4 ? "v" : "o";
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

// ── Exterior void (main-room, Pokémon-style building exterior) ──────────────
/** The void beyond the shop walls: a flat SCR!PTS-black fill, no street. */
function buildExtVoid(): string[] {
  const rows: string[] = [];
  for (let y = 0; y < TILE; y++) {
    rows.push("@".repeat(TILE));
  }
  return rows;
}

export const extVoidArt: PixelArt = { rows: buildExtVoid(), palette: PAL };
