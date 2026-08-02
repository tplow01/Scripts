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
    expect(hiresExtVoidArt.palette[[...chars][0]]).toBe("#0D0D0D");
  });
});

describe("floor panels", () => {
  const panels = [
    { name: "shop", art: hiresFloorArt, field: "#F7F7F5", mark: "#C1C0C4" },
    { name: "basement", art: hiresBasementFloorArt, field: "#0D0D0D", mark: "#6F6F73" },
  ];

  /** A panel's mark/field mask — "#" where the corner mark is, "." elsewhere. */
  const mask = (art: (typeof panels)[number]) => {
    const fieldChar = art.art.rows[15][15]; // interior is always field
    return art.art.rows.map((r) => [...r].map((c) => (c === fieldChar ? "." : "#")).join(""));
  };

  for (const p of panels) {
    it(`authors the ${p.name} panel as one tile of exactly two colours`, () => {
      expect(p.art.rows).toHaveLength(HIRES_NATIVE_SIZE);
      expect(p.art.rows.every((r) => r.length === HIRES_NATIVE_SIZE)).toBe(true);
      const chars = new Set(p.art.rows.join("").split(""));
      expect(chars.size).toBe(2);
      expect([...chars].map((c) => p.art.palette[c]).sort()).toEqual([p.field, p.mark].sort());
    });

    it(`marks every corner of the ${p.name} panel and leaves the interior flat`, () => {
      const m = mask(p);
      const last = HIRES_NATIVE_SIZE - 1;
      for (const [cx, cy] of [[0, 0], [last, 0], [0, last], [last, last]]) {
        expect(m[cy][cx], `corner ${cx},${cy} unmarked`).toBe("#");
      }
      // Nothing marked away from the edges — the panel has no interior pattern.
      for (let y = 2; y < last - 1; y++) {
        for (let x = 2; x < last - 1; x++) expect(m[y][x]).toBe(".");
      }
    });
  }

  it("gives both panels identical geometry, differing only in colour", () => {
    // Guards against an edit reshaping one floor and not the other.
    expect(mask(panels[0])).toEqual(mask(panels[1]));
    expect(hiresFloorArt.rows.join("")).not.toBe(hiresBasementFloorArt.rows.join(""));
  });
});
