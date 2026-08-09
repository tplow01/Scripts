import type { Palette, PixelArt } from "./pixelArt";

/**
 * SCR!PTS high-resolution pixel art — props and architecture.
 *
 * The launch prototype used 16px GBA-sized drawings. This module establishes
 * the production art bar at 32px per tile for the shop's floors, walls, rails,
 * fixtures and furniture.
 *
 * Characters are NOT here: the cast is hand-drawn and loaded from authored
 * PNGs (see `art/characters.ts` and `scripts/import-sprites.py`).
 */

const P: Palette = {
  ".": null,
  k: "#0D0D0D",
  K: "#211B29",
  d: "#332A3C",
  h: "#554A65",
  H: "#827593",
  w: "#F7F7F5",
  W: "#E8E4DE",
  g: "#BEB9B2",
  G: "#6F6F73",
  p: "#FF8AC7",
  P: "#FF4FA3",
  q: "#FFB9DC",
  s: "#F2B88F",
  S: "#D88C67",
  n: "#9B5D43",
  b: "#6DB1DC",
  B: "#345E89",
  m: "#668A60",
  M: "#38563D",
  c: "#C99663",
  C: "#775038",
  y: "#E4BE63",
  Y: "#9D7133",
  r: "#8D354F",
  R: "#552334",
  t: "#D6D1C8",
  T: "#A7A2A0",
  x: "#18171B",
  z: "#28272D",
  e: "#EEEAE3",
  u: "#DDD7CD",
  v: "#C9C2B7",
  a: "#252329",
  A: "#17161B",
};

type Grid = string[][];

const grid = (w: number, h: number, fill = "."): Grid =>
  Array.from({ length: h }, () => Array(w).fill(fill));
const put = (g: Grid, x: number, y: number, ch: string) => {
  if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = ch;
};
const rect = (g: Grid, x: number, y: number, w: number, h: number, ch: string) => {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) put(g, xx, yy, ch);
};
const ellipse = (g: Grid, cx: number, cy: number, rx: number, ry: number, ch: string) => {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      if (((x - cx) ** 2) / (rx ** 2) + ((y - cy) ** 2) / (ry ** 2) <= 1) put(g, x, y, ch);
    }
  }
};
const rows = (g: Grid): string[] => g.map((r) => r.join(""));

/**
 * One floor tile: a single flat brand colour, edge to edge.
 *
 * Deliberately unpatterned — no seam, bevel or grain. The shop floor is brand
 * paper and the basement floor is brand ink, so the rooms read as clean fields
 * that the props, rugs and floor logo sit on top of.
 */
function buildFloorPanel(field: string): PixelArt {
  return { rows: rows(grid(32, 32, field)), palette: P };
}

function buildWall(kind: "top" | "side" | "bottom" | "fill"): PixelArt {
  const g = grid(32, 32, kind === "fill" ? "k" : "W");
  if (kind === "fill") return { rows: rows(g), palette: P };
  if (kind !== "side") {
    rect(g, 0, 0, 32, 3, "k"); rect(g, 0, 3, 32, 3, "w"); rect(g, 0, 6, 32, 1, "v");
    rect(g, 0, 25, 32, 2, "p"); rect(g, 0, 27, 32, 2, "G"); rect(g, 0, 29, 32, 3, "k");
  }
  for (const x of [0, 16, 31]) rect(g, x, kind === "side" ? 0 : 7, 1, kind === "side" ? 32 : 18, "T");
  if (kind === "top") rect(g, 0, 16, 32, 1, "t");
  return { rows: rows(g), palette: P };
}

// Straight brand tokens: paper (#F7F7F5) upstairs, ink (#0D0D0D) downstairs.
export const hiresFloorArt = buildFloorPanel("w");
export const hiresBasementFloorArt = buildFloorPanel("k");
export const hiresWallTopArt = buildWall("top");
export const hiresWallSideArt = buildWall("side");
export const hiresWallBottomArt = buildWall("bottom");
export const hiresWallFillArt = buildWall("fill");

function buildRack(tiles: number, vertical = false): PixelArt {
  const w = vertical ? 32 : tiles * 32;
  const h = vertical ? tiles * 32 : 32;
  const g = grid(w, h);
  if (!vertical) {
    rect(g, 2, 4, w - 4, 2, "T"); rect(g, 3, 5, w - 6, 1, "w");
    rect(g, 3, 5, 2, 23, "G"); rect(g, w - 5, 5, 2, 23, "G");
    for (let x = 8, i = 0; x < w - 10; x += 13, i++) {
      rect(g, x, 7, 8, 2, "T");
      const top = ["m", "w", "k", "w"][i % 4];
      const shade = top === "m" ? "M" : top === "k" ? "d" : "W";
      rect(g, x + 1, 9, 7, 14, top); rect(g, x + 1, 20, 7, 3, shade);
      rect(g, x - 1, 10, 2, 8, shade); rect(g, x + 8, 10, 2, 8, shade);
      put(g, x + 4, 13, i % 2 ? "p" : "P");
    }
    rect(g, 1, 27, 7, 3, "k"); rect(g, w - 8, 27, 7, 3, "k");
  } else {
    rect(g, 14, 2, 3, h - 4, "T"); rect(g, 17, 2, 1, h - 4, "w");
    for (let y = 8, i = 0; y < h - 12; y += 14, i++) {
      rect(g, 7, y, 18, 3, "G"); rect(g, 9, y + 3, 14, 8, i % 2 ? "p" : "d");
      rect(g, 11, y + 5, 10, 2, i % 2 ? "q" : "H");
    }
  }
  return { rows: rows(g), palette: P, outline: "#100E14" };
}

export const hiresRackArt = buildRack(1);
export const hiresRailH7Art = buildRack(7);
export const hiresRailV7Art = buildRack(7, true);
export const hiresRailH3Art = buildRack(3);
export const hiresRailV3Art = buildRack(3, true);

function fixture(w: number, h: number, draw: (g: Grid) => void): PixelArt {
  const g = grid(w, h);
  draw(g);
  return { rows: rows(g), palette: P, outline: "#100E14" };
}

export const hiresSpeakerArt = fixture(32, 32, (g) => {
  rect(g, 5, 2, 22, 27, "k"); rect(g, 7, 4, 18, 23, "d"); rect(g, 8, 5, 16, 2, "H");
  ellipse(g, 16, 12, 6, 6, "G"); ellipse(g, 16, 12, 4, 4, "z"); ellipse(g, 16, 12, 1, 1, "p");
  ellipse(g, 16, 22, 4, 4, "G"); ellipse(g, 16, 22, 2, 2, "a"); put(g, 8, 27, "p");
});

export const hiresBoxArt = fixture(32, 32, (g) => {
  rect(g, 4, 7, 24, 21, "c"); rect(g, 4, 7, 24, 3, "y"); rect(g, 25, 10, 3, 18, "C");
  rect(g, 14, 7, 5, 21, "u"); rect(g, 15, 8, 2, 19, "w");
  rect(g, 7, 14, 6, 5, "w"); rect(g, 8, 15, 4, 1, "k"); rect(g, 8, 17, 3, 1, "G");
});

export const hiresStairsArt = fixture(32, 32, (g) => {
  rect(g, 2, 1, 28, 30, "k"); rect(g, 5, 3, 22, 26, "A");
  for (let i = 0; i < 6; i++) {
    const y = 4 + i * 4;
    rect(g, 6 + i, y, 20 - i * 2, 3, i < 2 ? "d" : i < 4 ? "z" : "x");
    rect(g, 6 + i, y + 3, 20 - i * 2, 1, i === 5 ? "p" : "G");
  }
  rect(g, 2, 1, 3, 30, "G"); rect(g, 27, 1, 3, 30, "G");
});

export const hiresVinylDeskArt = fixture(64, 32, (g) => {
  rect(g, 2, 7, 60, 22, "C"); rect(g, 2, 7, 60, 5, "c"); rect(g, 4, 12, 56, 3, "Y");
  for (const cx of [17, 47]) {
    ellipse(g, cx, 9, 9, 7, "k"); ellipse(g, cx, 9, 6, 5, "d"); ellipse(g, cx, 9, 2, 2, "p");
    rect(g, cx + 6, 4, 1, 7, "w");
  }
  rect(g, 28, 8, 8, 11, "k");
  for (const x of [8, 20, 31, 43, 55]) { rect(g, x, 19, 2, 2, "p"); rect(g, x, 23, 4, 1, "y"); }
  rect(g, 2, 28, 60, 2, "k");
});

export const hiresCratesArt = fixture(32, 32, (g) => {
  rect(g, 4, 12, 24, 17, "C"); rect(g, 4, 12, 24, 3, "c"); rect(g, 6, 17, 20, 2, "Y");
  for (let x = 7, i = 0; x < 26; x += 3, i++) {
    rect(g, x, 4 + (i % 3), 2, 10 - (i % 3), ["p", "k", "m", "w"][i % 4]);
  }
  rect(g, 6, 24, 20, 2, "c");
});

/** Shelf of records/books — mirrors the crate on the far side of the alcove. */
export const hiresBookcaseArt = fixture(32, 32, (g) => {
  rect(g, 4, 2, 24, 27, "k");   // carcass silhouette
  rect(g, 6, 4, 20, 23, "C");   // back panel
  rect(g, 6, 4, 20, 2, "c");    // lit top edge
  for (let s = 0; s < 3; s++) {
    const top = 6 + s * 7;
    for (let x = 7, i = 0; x < 25; x += 3, i++) {
      rect(g, x, top + (i % 2), 2, 5 - (i % 2), ["p", "b", "m", "y", "r"][(i + s) % 5]);
    }
    rect(g, 6, top + 5, 20, 1, "c"); // shelf board under each row
  }
});

export const hiresCheckoutArt = fixture(64, 160, (g) => {
  // L-shaped luxury counter: top bar plus right column, preserving its holes.
  rect(g, 0, 0, 64, 32, "C"); rect(g, 0, 0, 64, 7, "c"); rect(g, 0, 7, 64, 2, "y");
  rect(g, 32, 32, 32, 128, "C"); rect(g, 32, 32, 7, 128, "c"); rect(g, 59, 32, 5, 128, "Y");
  for (let y = 42; y < 154; y += 20) rect(g, 40, y, 14, 2, "Y");
  // Register, card terminal and small pink till light.
  rect(g, 8, 1, 19, 14, "k"); rect(g, 11, 3, 13, 7, "b"); rect(g, 12, 4, 11, 4, "w");
  rect(g, 28, 4, 9, 13, "d"); rect(g, 30, 6, 5, 4, "p");
});

export const hiresCouchArt = fixture(160, 96, (g) => {
  // Same 5×3 L footprint: vertical left arm and horizontal lower section.
  rect(g, 0, 0, 32, 96, "d"); rect(g, 32, 64, 128, 32, "d");
  rect(g, 5, 5, 22, 86, "h"); rect(g, 32, 69, 123, 22, "h");
  for (let y = 8; y < 91; y += 20) rect(g, 7, y, 18, 2, "H");
  for (let x = 36; x < 154; x += 28) { rect(g, x, 71, 2, 18, "H"); put(g, x + 10, 80, "p"); }
  rect(g, 0, 92, 160, 4, "k"); rect(g, 156, 65, 4, 31, "k");
});

export const hiresMatArt = fixture(96, 38, (g) => {
  rect(g, 0, 0, 96, 38, "k"); rect(g, 3, 3, 90, 35, "p"); rect(g, 6, 6, 84, 29, "P");
  for (let x = 12; x < 86; x += 9) put(g, x, 9 + (x % 4), "q");
  rect(g, 27, 16, 42, 4, "w"); rect(g, 32, 22, 32, 3, "k");
});

export const hiresPosterArt = fixture(32, 32, (g) => {
  rect(g, 4, 2, 24, 28, "k"); rect(g, 6, 4, 20, 24, "w");
  rect(g, 8, 6, 16, 10, "p"); rect(g, 10, 8, 12, 6, "P");
  rect(g, 8, 19, 16, 2, "k"); rect(g, 10, 23, 12, 1, "G");
});

export const hiresDisplayTableArt = fixture(32, 32, (g) => {
  rect(g, 2, 11, 28, 6, "C"); rect(g, 2, 11, 28, 2, "c"); rect(g, 4, 17, 24, 3, "Y");
  rect(g, 5, 6, 10, 5, "w"); rect(g, 7, 4, 8, 3, "p");
  rect(g, 18, 7, 9, 4, "m"); rect(g, 20, 5, 7, 3, "k");
  rect(g, 5, 20, 4, 9, "C"); rect(g, 23, 20, 4, 9, "C");
});

export const hiresMannequinArt = fixture(32, 48, (g) => {
  ellipse(g, 16, 7, 4, 5, "t"); rect(g, 14, 12, 5, 3, "T");
  rect(g, 9, 15, 15, 16, "w"); rect(g, 7, 17, 3, 12, "W"); rect(g, 24, 17, 3, 12, "W");
  rect(g, 14, 20, 5, 6, "p"); rect(g, 11, 31, 5, 10, "d"); rect(g, 19, 31, 5, 10, "d");
  rect(g, 15, 40, 3, 6, "G"); rect(g, 8, 45, 18, 2, "G");
});

export const hiresWindowArt = fixture(32, 32, (g) => {
  rect(g, 2, 2, 28, 28, "k"); rect(g, 5, 5, 22, 20, "b");
  rect(g, 6, 6, 20, 7, "w"); rect(g, 15, 5, 2, 20, "k"); rect(g, 5, 14, 22, 2, "k");
  rect(g, 5, 25, 22, 3, "C"); put(g, 8, 10, "q"); put(g, 23, 18, "p");
});

export const hiresPlantArt = fixture(32, 32, (g) => {
  for (const [cx, cy, rx, ry] of [[10, 10, 6, 4], [20, 8, 7, 5], [16, 14, 8, 5], [8, 17, 5, 4], [23, 17, 5, 4]] as const) {
    ellipse(g, cx, cy, rx, ry, cy % 3 ? "m" : "M"); put(g, cx - 1, cy - 1, "y");
  }
  rect(g, 15, 14, 3, 10, "C"); rect(g, 9, 22, 15, 7, "c"); rect(g, 11, 25, 11, 5, "C");
});

export const hiresRugArt = fixture(64, 64, (g) => {
  rect(g, 1, 1, 62, 62, "k"); rect(g, 4, 4, 56, 56, "R"); rect(g, 8, 8, 48, 48, "p");
  for (let y = 12; y < 54; y += 8) for (let x = 12; x < 54; x += 8) put(g, x, y, (x + y) % 16 ? "q" : "P");
  rect(g, 26, 25, 12, 14, "k"); rect(g, 29, 22, 6, 20, "w");
});

export const hiresEmblemArt = fixture(96, 96, (g) => {
  // Pixel inlay: comet/star above a compact SCR!PTS runway bar.
  for (let i = 0; i < 40; i++) {
    const x = 18 + i; const y = 54 - Math.floor(i * 0.62);
    rect(g, x, y, Math.max(2, Math.floor(6 - i / 10)), Math.max(2, Math.floor(6 - i / 10)), i % 4 ? "p" : "q");
  }
  for (let r = 0; r < 16; r++) {
    rect(g, 65 - r, 20 + r, 2 * r + 1, 1, r < 6 ? "q" : r < 12 ? "p" : "P");
    rect(g, 65 - r, 50 - r, 2 * r + 1, 1, r < 6 ? "P" : "p");
  }
  rect(g, 12, 68, 72, 4, "k"); rect(g, 17, 76, 62, 3, "p"); rect(g, 24, 83, 48, 3, "k");
});

/**
 * Everything outside the shop: one flat field of brand black, matching the
 * camera background so the apron and the backdrop read as a single surface.
 * Deliberately unpatterned — a speckle here made the void look like terrain.
 */
export const hiresExtVoidArt: PixelArt = {
  rows: Array.from({ length: 32 }, () => "k".repeat(32)),
  // Slightly lighter than the LCD bezel (#0D0D0D) so exterior reads apart from the shell edge.
  palette: { k: "#16161A" },
};

export const HIRES_NATIVE_SIZE = 32;
