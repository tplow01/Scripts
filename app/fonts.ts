import localFont from "next/font/local";

/**
 * Pixel Operator — the game-world text face per BRAND.md. Bold (700) is the
 * brand call for dialogue, menus, and names; 400 is kept available for future
 * call-sites. Shared here so other shell components can adopt it without
 * re-wiring the font.
 */
export const pixelOperator = localFont({
  src: [
    { path: "./fonts/PixelOperator.ttf", weight: "400", style: "normal" },
    { path: "./fonts/PixelOperator-Bold.ttf", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-pixel-operator",
});
