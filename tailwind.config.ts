import type { Config } from "tailwindcss";

// Brand colours mirror src/theme/tokens.ts (the single source of truth for app + Phaser).
// Keep these two in sync — both come from BRAND.md.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0D0D0D",
        paper: "#F7F7F5",
        pink: "#FF8AC7",
        "pink-deep": "#FF4FA3",
        grey: "#6F6F73",
      },
      fontFamily: {
        game: ["Pixel Operator Bold", "monospace"],
        brand: ["Fashion Whacks", "sans-serif"],
        body: ["Inter", "Geist", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
