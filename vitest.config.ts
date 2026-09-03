import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    include: ["__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      // Mirror tsconfig's fallback: "@/*" → ./src/* first, then repo root.
      "@/lib": fileURLToPath(new URL("./lib", import.meta.url)),
      "@/types": fileURLToPath(new URL("./types", import.meta.url)),
      "@/components": fileURLToPath(new URL("./components", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
