import { describe, it, expect } from "vitest";
import { resolveArt } from "@/game/art/registry";
import { mainRoom } from "@/game/world/mainRoom";

describe("art registry", () => {
  it("resolves a known key to a descriptor", () => {
    const art = resolveArt("scribbs");
    expect(art.kind).toBe("rect");
    expect(art.width).toBeGreaterThan(0);
    expect(art.height).toBeGreaterThan(0);
    expect(typeof art.color).toBe("number");
  });

  it("resolves every art key referenced by the main room", () => {
    for (const it of mainRoom.interactions) {
      expect(() => resolveArt(it.artKey)).not.toThrow();
    }
  });

  it("throws on an unknown key", () => {
    expect(() => resolveArt("does-not-exist")).toThrow();
  });
});
