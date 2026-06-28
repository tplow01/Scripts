/**
 * Brand tokens — the single source of truth for colours and fonts.
 * Values come straight from BRAND.md. Do not invent new ones; add here if the
 * brand bible changes. Consumed by both the web/UI layer and Phaser.
 */

export const colors = {
  ink: "#0D0D0D",
  paper: "#F7F7F5",
  pink: "#FF8AC7",
  pinkDeep: "#FF4FA3",
  grey: "#6F6F73",
} as const;

export type ColorName = keyof typeof colors;

/** Same colours as Phaser-friendly 0xRRGGBB integers (derived, never hand-typed). */
export const colorsNum = Object.fromEntries(
  Object.entries(colors).map(([name, hex]) => [name, parseInt(hex.slice(1), 16)]),
) as Record<ColorName, number>;

/** Font roles per BRAND.md, with safe fallbacks until the real font files load. */
export const fonts = {
  game: '"Pixel Operator Bold", monospace',
  brand: '"Fashion Whacks", sans-serif',
  body: '"Inter", "Geist", system-ui, sans-serif',
} as const;
