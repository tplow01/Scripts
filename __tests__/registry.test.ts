import { describe, it, expect } from "vitest";
import { resolveTextureKey } from "@/game/art/registry";
import { mainRoom } from "@/game/world/mainRoom";
import { wallVariant } from "@/game/art/wallVariant";

describe("art registry", () => {
  it("resolves known prop + wall-variant keys to texture keys", () => {
    expect(resolveTextureKey("rack")).toBe("rack");
    expect(resolveTextureKey("floor")).toBe("floor");
    expect(resolveTextureKey("wall-top")).toBe("wall-top");
    expect(resolveTextureKey("wall-side")).toBe("wall-side");
    expect(resolveTextureKey("wall-bottom")).toBe("wall-bottom");
  });

  it("resolves every art key referenced by the main room", () => {
    for (const it of mainRoom.interactions) {
      expect(() => resolveTextureKey(it.artKey)).not.toThrow();
    }
    for (const deco of mainRoom.decorations ?? []) {
      expect(() => resolveTextureKey(deco.artKey)).not.toThrow();
    }
  });

  it("resolves every wall-variant the room can produce", () => {
    for (let y = 0; y < mainRoom.height; y++) {
      for (let x = 0; x < mainRoom.width; x++) {
        if (mainRoom.tiles[y][x] !== "wall") continue;
        expect(() => resolveTextureKey(wallVariant(mainRoom, x, y))).not.toThrow();
      }
    }
  });

  it("throws on an unknown key", () => {
    expect(() => resolveTextureKey("does-not-exist")).toThrow();
  });
});
