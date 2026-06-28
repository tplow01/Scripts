import { describe, it, expect } from "vitest";
import { colors, colorsNum, fonts } from "@/theme/tokens";

describe("brand tokens", () => {
  it("exposes the exact BRAND.md hex colours", () => {
    expect(colors.ink).toBe("#0D0D0D");
    expect(colors.paper).toBe("#F7F7F5");
    expect(colors.pink).toBe("#FF8AC7");
    expect(colors.pinkDeep).toBe("#FF4FA3");
    expect(colors.grey).toBe("#6F6F73");
  });

  it("derives Phaser numeric colours from the hex values", () => {
    expect(colorsNum.pink).toBe(0xff8ac7);
    expect(colorsNum.ink).toBe(0x0d0d0d);
  });

  it("names the three brand font roles", () => {
    expect(fonts.game).toContain("Pixel Operator");
    expect(fonts.brand).toContain("Fashion Whacks");
    expect(fonts.body).toContain("Inter");
  });
});
