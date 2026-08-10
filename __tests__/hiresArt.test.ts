import { describe, expect, it } from "vitest";
import {
  HIRES_NATIVE_SIZE,
  hiresBasementFloorArt,
  hiresExtVoidArt,
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

  it("fills the exterior void with a single solid colour", () => {
    // Outside the shop is one flat field of brand black — no speckle.
    const chars = new Set(hiresExtVoidArt.rows.join("").split(""));
    expect(chars.size).toBe(1);
    expect(hiresExtVoidArt.palette[[...chars][0]]).toBe("#16161A");
  });
});

describe("floor panels", () => {
  const panels = [
    { name: "shop", art: hiresFloorArt, colour: "#F7F7F5" },
    { name: "basement", art: hiresBasementFloorArt, colour: "#0D0D0D" },
  ];

  for (const p of panels) {
    it(`fills the ${p.name} floor with one flat brand colour`, () => {
      expect(p.art.rows).toHaveLength(HIRES_NATIVE_SIZE);
      expect(p.art.rows.every((r) => r.length === HIRES_NATIVE_SIZE)).toBe(true);
      // Exactly one colour: no seam, bevel or grain anywhere on the tile.
      const chars = new Set(p.art.rows.join("").split(""));
      expect(chars.size).toBe(1);
      expect(p.art.palette[[...chars][0]]).toBe(p.colour);
    });
  }

  it("keeps the two floors distinct", () => {
    expect(hiresFloorArt.rows.join("")).not.toBe(hiresBasementFloorArt.rows.join(""));
  });
});
