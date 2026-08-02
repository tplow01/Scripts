import { describe, expect, it } from "vitest";
import {
  HIRES_NATIVE_SIZE,
  hiresExtVoidArt,
  hiresFloorArt,
  hiresRailH7Art,
  hiresStaffFloorArt,
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

  it("fills the exterior void with a single solid colour", () => {
    // Outside the shop is one flat field of brand black — no speckle.
    const chars = new Set(hiresExtVoidArt.rows.join("").split(""));
    expect(chars.size).toBe(1);
    expect(hiresExtVoidArt.palette[[...chars][0]]).toBe("#0D0D0D");
  });

  it("authors the staff floor at native resolution and darker than the shop floor", () => {
    expect(hiresStaffFloorArt.rows).toHaveLength(HIRES_NATIVE_SIZE);
    expect(hiresStaffFloorArt.rows.every((r) => r.length === HIRES_NATIVE_SIZE)).toBe(true);
    expect(hiresStaffFloorArt.rows.join("")).not.toBe(hiresFloorArt.rows.join(""));
  });
});
