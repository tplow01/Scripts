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
      "scribbs-down-a", "scribbs-down-b", "scribbs-down-c", "scribbs-down-d",
      "scribbs-up-a", "scribbs-up-b", "scribbs-up-c", "scribbs-up-d",
      "scribbs-side-a", "scribbs-side-b", "scribbs-side-c", "scribbs-side-d",
      "cashier", "cashier-walk-a", "cashier-walk-b", "cashier-walk-c", "cashier-walk-d",
    ] as const) {
      expect(hiresCharacters[key]).toBeDefined();
    }
  });

  it("uses distinct anatomy for every movement direction and stride", () => {
    const art = (key: keyof typeof hiresCharacters) => hiresCharacters[key].rows.join("\n");
    expect(art("scribbs-down-a")).not.toBe(art("scribbs-down-b"));
    expect(art("scribbs-down-b")).not.toBe(art("scribbs-down-c"));
    expect(art("scribbs-down-c")).not.toBe(art("scribbs-down-d"));
    expect(art("scribbs-up-a")).not.toBe(art("scribbs-up-b"));
    expect(art("scribbs-up-b")).not.toBe(art("scribbs-up-c"));
    expect(art("scribbs-up-c")).not.toBe(art("scribbs-up-d"));
    expect(art("scribbs-side-a")).not.toBe(art("scribbs-side-b"));
    expect(art("scribbs-side-b")).not.toBe(art("scribbs-side-c"));
    expect(art("scribbs-side-c")).not.toBe(art("scribbs-side-d"));
    expect(art("scribbs-down-a")).not.toBe(art("scribbs-up-a"));
    expect(art("scribbs-down-a")).not.toBe(art("scribbs-side-a"));
  });

  it("keeps multi-tile racks native-resolution across their footprint", () => {
    expect(hiresRailH7Art.rows).toHaveLength(HIRES_NATIVE_SIZE);
    expect(hiresRailH7Art.rows.every((row) => row.length === HIRES_NATIVE_SIZE * 7)).toBe(true);
  });
});
