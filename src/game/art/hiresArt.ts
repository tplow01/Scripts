import type { Palette, PixelArt } from "./pixelArt";

/**
 * SCR!PTS high-resolution pixel art.
 *
 * The launch prototype used 16px GBA-sized drawings. This module establishes
 * the production art bar at 32px per tile and 32×48px for people. The character
 * language takes only broad inspiration from stylish monster-RPG overworld
 * silhouettes: every hairstyle, outfit, palette and frame here is original.
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
type Facing = "down" | "up" | "side";
type Hair = "star" | "curtains" | "wolf" | "curls" | "sweep" | "twists";
type Outfit = "scribbs" | "heath" | "love" | "confusion" | "okay" | "rage" | "basement";

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

function drawHair(g: Grid, style: Hair, facing: Facing) {
  const side = facing === "side";
  const back = facing === "up";
  const cx = side ? 17 : 16;
  const base = style === "curls" ? "C" : "K";
  const mid = style === "curls" ? "c" : "d";
  const hi = style === "curls" ? "y" : "H";

  ellipse(g, cx, 11, side ? 7 : 8, 8, base);
  rect(g, cx - (side ? 6 : 7), 11, side ? 12 : 14, back ? 10 : 6, base);

  if (style === "star") {
    [[7, 8], [9, 4], [12, 2], [16, 1], [20, 3], [23, 5], [25, 9]].forEach(([x, y], i) => {
      rect(g, x, y, i % 2 ? 3 : 2, 6, i < 3 ? mid : base);
    });
    rect(g, 11, 7, 3, 6, hi); rect(g, 15, 5, 2, 6, hi);
  } else if (style === "curtains") {
    rect(g, 8, 5, 7, 12, base); rect(g, 18, 5, 6, 12, base);
    rect(g, 14, 3, 5, 7, mid); rect(g, 11, 5, 3, 7, hi); rect(g, 20, 7, 2, 6, hi);
    if (!back) { rect(g, 14, 9, 2, 6, "."); rect(g, 17, 9, 2, 6, "."); }
  } else if (style === "wolf") {
    rect(g, 8, 4, 16, 10, base); rect(g, 6, 10, 5, 15, base); rect(g, 22, 10, 5, 15, base);
    rect(g, 10, 2, 4, 7, mid); rect(g, 17, 1, 4, 8, base); rect(g, 22, 5, 4, 8, mid);
    rect(g, 10, 6, 3, 11, hi); rect(g, 24, 13, 2, 8, hi);
  } else if (style === "curls") {
    [[10, 5], [14, 3], [18, 4], [22, 6], [8, 10], [24, 11], [11, 15], [21, 15]].forEach(([x, y], i) => {
      ellipse(g, x, y, 3, 3, i % 2 ? mid : base);
      put(g, x - 1, y - 1, hi);
    });
  } else if (style === "sweep") {
    rect(g, 8, 6, 17, 10, base); rect(g, 11, 3, 15, 7, mid);
    rect(g, 16, 1, 12, 5, base); rect(g, 23, 4, 6, 4, base);
    rect(g, 12, 5, 8, 2, hi); rect(g, 18, 3, 6, 2, hi);
  } else {
    // Long fashion twists: clean crown with graphic strands.
    rect(g, 9, 5, 15, 10, base); rect(g, 11, 3, 11, 5, mid);
    for (const x of [8, 11, 14, 20, 23, 26]) {
      rect(g, x, 12, 2, 14 + (x % 3), x % 4 ? base : mid);
      for (let y = 14; y < 25; y += 4) put(g, x + 1, y, hi);
    }
  }
}

function drawFace(g: Grid, facing: Facing, skin: "light" | "deep" = "light") {
  const base = skin === "deep" ? "S" : "s";
  const shade = skin === "deep" ? "n" : "S";
  if (facing === "up") {
    rect(g, 11, 10, 11, 10, shade);
    return;
  }
  if (facing === "side") {
    ellipse(g, 17, 14, 6, 7, base); rect(g, 12, 16, 4, 5, shade);
    put(g, 21, 13, "k"); put(g, 23, 16, shade);
  } else {
    ellipse(g, 16, 14, 7, 7, base); rect(g, 10, 16, 13, 5, shade);
    rect(g, 11, 13, 3, 1, "k"); rect(g, 19, 13, 3, 1, "k");
    put(g, 13, 14, "w"); put(g, 20, 14, "w");
    rect(g, 15, 18, 3, 1, "n");
  }
  rect(g, 14, 20, 5, 3, shade);
}

function outfitColors(outfit: Outfit): { top: string; shade: string; accent: string; trouser: string } {
  switch (outfit) {
    case "heath": return { top: "w", shade: "W", accent: "k", trouser: "d" };
    case "love": return { top: "m", shade: "M", accent: "p", trouser: "w" };
    case "confusion": return { top: "w", shade: "W", accent: "P", trouser: "B" };
    case "okay": return { top: "k", shade: "d", accent: "p", trouser: "w" };
    case "rage": return { top: "w", shade: "W", accent: "b", trouser: "k" };
    case "basement": return { top: "R", shade: "r", accent: "q", trouser: "k" };
    default: return { top: "w", shade: "W", accent: "p", trouser: "B" };
  }
}

function drawOutfit(g: Grid, outfit: Outfit, facing: Facing, walk: boolean) {
  const o = outfitColors(outfit);
  const side = facing === "side";
  // Oversized editorial silhouette: dropped shoulder, long hem, slim neck.
  rect(g, side ? 10 : 8, 23, side ? 15 : 17, 14, o.top);
  rect(g, side ? 10 : 8, 33, side ? 15 : 17, 4, o.shade);
  rect(g, side ? 8 : 6, 25, 3, 11, o.shade);
  rect(g, side ? 25 : 25, 25, 3, 11, o.shade);
  if (outfit === "scribbs") {
    rect(g, 8, 22, 17, 2, "q"); // headphone cord / collar flash
    rect(g, 12, 27, 9, 5, "p"); rect(g, 14, 28, 5, 3, "P");
  } else if (outfit === "heath") {
    // Tiny graphic-photo tee and chain.
    rect(g, 15, 25, 2, 5, "y"); rect(g, 13, 28, 6, 5, o.accent); put(g, 16, 29, "w");
  } else if (outfit === "love") {
    rect(g, 14, 27, 2, 2, o.accent); rect(g, 18, 27, 2, 2, o.accent); rect(g, 15, 29, 4, 3, o.accent);
  } else if (outfit === "confusion") {
    rect(g, 15, 26, 4, 2, o.accent); rect(g, 18, 28, 2, 3, o.accent); rect(g, 16, 32, 2, 2, o.accent);
  } else if (outfit === "okay") {
    rect(g, 16, 26, 2, 7, o.accent); rect(g, 13, 29, 8, 2, o.accent);
  } else if (outfit === "rage") {
    rect(g, 12, 27, 10, 2, "p"); rect(g, 14, 30, 6, 3, o.accent);
  } else {
    rect(g, 12, 26, 10, 7, "p"); rect(g, 14, 28, 6, 3, "k");
  }

  const leftOffset = walk ? -1 : 0;
  const rightOffset = walk ? 1 : 0;
  rect(g, 10 + leftOffset, 37, 6, walk ? 8 : 7, o.trouser);
  rect(g, 18 + rightOffset, 37, 6, walk ? 8 : 7, o.trouser);
  rect(g, 9 + leftOffset, walk ? 44 : 43, 7, 3, "k");
  rect(g, 18 + rightOffset, walk ? 44 : 43, 7, 3, "k");
  put(g, 10 + leftOffset, walk ? 44 : 43, "G");
  put(g, 19 + rightOffset, walk ? 44 : 43, "G");
}

function character(style: Hair, outfit: Outfit, facing: Facing, walk = false, skin: "light" | "deep" = "light"): PixelArt {
  const g = grid(32, 48);
  drawFace(g, facing, skin);
  drawHair(g, style, facing);
  // Headphones are Scribbs' signature and stay readable in every facing.
  if (outfit === "scribbs") {
    rect(g, facing === "side" ? 9 : 7, 12, 2, 8, "p");
    rect(g, facing === "side" ? 24 : 24, 12, 2, 8, "P");
    rect(g, 10, 7, 14, 2, "p");
  }
  // Heath's ribbed white beanie.
  if (outfit === "heath") {
    ellipse(g, 16, 7, 8, 5, "w"); rect(g, 8, 8, 17, 4, "W");
    for (let x = 10; x <= 22; x += 3) rect(g, x, 8, 1, 4, "g");
  }
  drawOutfit(g, outfit, facing, walk);
  return { rows: rows(g), palette: P, outline: "#100E14" };
}

export const hiresCharacters = {
  "scribbs-down-a": character("star", "scribbs", "down"),
  "scribbs-down-b": character("star", "scribbs", "down", true),
  "scribbs-up-a": character("star", "scribbs", "up"),
  "scribbs-up-b": character("star", "scribbs", "up", true),
  "scribbs-side-a": character("star", "scribbs", "side"),
  "scribbs-side-b": character("star", "scribbs", "side", true),
  cashier: character("curls", "heath", "down"),
  "cashier-walk-a": character("curls", "heath", "side"),
  "cashier-walk-b": character("curls", "heath", "side", true),
  npcRail: character("curtains", "love", "down", false, "deep"),
  npcGazer: character("sweep", "confusion", "down"),
  npcSitter: character("wolf", "okay", "down"),
  npcShopper: character("twists", "rage", "down", false, "deep"),
  npc: character("wolf", "basement", "down", false, "deep"),
} as const;

function buildFloor(dark = false): PixelArt {
  const g = grid(32, 32, dark ? "x" : "e");
  // 16px fashion-showroom slabs with a fine 1px bevel and deterministic grain.
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    if (x % 16 === 0 || y % 16 === 0) put(g, x, y, dark ? "A" : "v");
    else if (x % 16 === 1 || y % 16 === 1) put(g, x, y, dark ? "z" : "w");
    else if ((x * 13 + y * 7) % 71 === 0) put(g, x, y, dark ? "d" : "u");
  }
  return { rows: rows(g), palette: P };
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

export const hiresFloorArt = buildFloor(false);
export const hiresBasementFloorArt = buildFloor(true);
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

export const hiresExtVoidArt: PixelArt = {
  rows: Array.from({ length: 32 }, (_, y) => Array.from({ length: 32 }, (_, x) => ((x * 11 + y * 7) % 97 === 0 ? "z" : "k")).join("")),
  palette: P,
};

export const HIRES_NATIVE_SIZE = 32;
export const HIRES_CHARACTER_HEIGHT = 48;
