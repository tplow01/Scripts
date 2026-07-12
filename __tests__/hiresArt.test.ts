import { describe, expect, it } from "vitest";
import {
  HIRES_CHARACTER_HEIGHT,
  HIRES_NATIVE_SIZE,
  hiresCharacters,
  hiresFloorArt,
  hiresRailH7Art,
} from "@/game/art/hiresArt";

describe("32px production art", () => {
  it("authors tiles and characters at the locked native resolution", () => {
    expect(hiresFloorArt.rows).toHaveLength(HIRES_NATIVE_SIZE);
    expect(hiresFloorArt.rows.every((row) => row.length === HIRES_NATIVE_SIZE)).toBe(true);

    for (const art of Object.values(hiresCharacters)) {
      expect(art.rows).toHaveLength(HIRES_CHARACTER_HEIGHT);
      expect(art.rows.every((row) => row.length === HIRES_NATIVE_SIZE)).toBe(true);
    }
  });

  it("ships every directional Scribbs frame and animated Heath frame", () => {
    for (const key of [
      "scribbs-down-a", "scribbs-down-b", "scribbs-up-a", "scribbs-up-b",
      "scribbs-side-a", "scribbs-side-b", "cashier", "cashier-walk-a", "cashier-walk-b",
    ] as const) {
      expect(hiresCharacters[key]).toBeDefined();
    }
  });

  it("keeps multi-tile racks native-resolution across their footprint", () => {
    expect(hiresRailH7Art.rows).toHaveLength(HIRES_NATIVE_SIZE);
    expect(hiresRailH7Art.rows.every((row) => row.length === HIRES_NATIVE_SIZE * 7)).toBe(true);
  });
});
