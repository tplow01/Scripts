import { describe, expect, it } from "vitest";
import {
  HIRES_NATIVE_SIZE,
  hiresFloorArt,
  hiresRailH7Art,
} from "@/game/art/hiresArt";

// Characters are no longer procedural — they're authored PNGs, covered by
// characters.test.ts. This file guards the props and architecture only.
describe("32px production art", () => {
  it("authors tiles at the locked native resolution", () => {
    expect(hiresFloorArt.rows).toHaveLength(HIRES_NATIVE_SIZE);
    expect(hiresFloorArt.rows.every((row) => row.length === HIRES_NATIVE_SIZE)).toBe(true);
  });

  it("keeps multi-tile racks native-resolution across their footprint", () => {
    expect(hiresRailH7Art.rows).toHaveLength(HIRES_NATIVE_SIZE);
    expect(hiresRailH7Art.rows.every((row) => row.length === HIRES_NATIVE_SIZE * 7)).toBe(true);
  });
});
