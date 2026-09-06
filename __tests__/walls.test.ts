import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { resolveTextureKey } from "@/game/art/registry";
import { mainRoom } from "@/game/world/mainRoom";
import { basementRoom } from "@/game/world/basement";
import {
  MURAL_IDS,
  MURAL_SLICES,
  allMuralTiles,
  isMuralTile,
  mural,
  muralTileKey,
  muralTilePath,
} from "@/game/art/walls";

describe("mural art keys", () => {
  it("names the two shop murals and the two basement ones", () => {
    expect(MURAL_IDS).toEqual([
      "vinyl-wall",
      "shop-wall",
      "basement-back-wall",
      "basement-ledge-wall",
    ]);
  });

  it("declares the slice count each mural actually ships, matching the authored art", () => {
    expect(MURAL_SLICES["vinyl-wall"]).toBe(4);
    expect(MURAL_SLICES["shop-wall"]).toBe(3);
    expect(MURAL_SLICES["basement-back-wall"]).toBe(5);
    expect(MURAL_SLICES["basement-ledge-wall"]).toBe(6);
  });

  it("builds 1-indexed texture keys and paths", () => {
    expect(muralTileKey("vinyl-wall", 1)).toBe("vinyl-wall-1");
    expect(muralTileKey("shop-wall", 3)).toBe("shop-wall-3");
    expect(muralTileKey("vinyl-wall", 4)).toBe("vinyl-wall-4");
    expect(muralTilePath("vinyl-wall", 3)).toBe("/assets/walls/vinyl-wall-3.png");
  });

  it("enumerates every slice of every mural", () => {
    expect(allMuralTiles()).toHaveLength(4 + 3 + 5 + 6);
    expect(allMuralTiles()[0]).toEqual({ id: "vinyl-wall", index: 1 });
  });

  it("recognises mural keys and rejects other art keys", () => {
    expect(isMuralTile("vinyl-wall-4")).toBe(true);
    expect(isMuralTile("vinyl-wall-8")).toBe(false);
    expect(isMuralTile("speaker")).toBe(false);
  });
});

describe("mural() expansion", () => {
  it("lays slices left to right from the anchor tile", () => {
    const tiles = mural("basement-back-wall", { tileX: 8, tileY: 7, tiles: 5 });
    expect(tiles).toHaveLength(5);
    expect(tiles[0]).toEqual({ tileX: 8, tileY: 7, artKey: "basement-back-wall-1" });
    expect(tiles[4]).toEqual({ tileX: 12, tileY: 7, artKey: "basement-back-wall-5" });
  });

  it("never marks a mural slice solid — collision comes from the wall tile beneath", () => {
    expect(mural("vinyl-wall", { tileX: 1, tileY: 1, tiles: 4 }).every((t) => !t.solid)).toBe(true);
  });

  it("refuses a tile count the authored art cannot fill", () => {
    expect(() => mural("vinyl-wall", { tileX: 1, tileY: 1, tiles: 5 })).toThrow(
      /vinyl-wall has 4 slices/,
    );
  });

  it("can hang a custom slice order (skip middle, keep the end)", () => {
    const tiles = mural("vinyl-wall", {
      tileX: 1,
      tileY: 3,
      slices: [1, 2, 4],
    });
    expect(tiles.map((t) => t.artKey)).toEqual([
      "vinyl-wall-1",
      "vinyl-wall-2",
      "vinyl-wall-4",
    ]);
    expect(tiles.map((t) => t.tileX)).toEqual([1, 2, 3]);
  });

  it("can repeat a slice to run a plain wall across many tiles", () => {
    const tiles = mural("shop-wall", { tileX: 7, tileY: 8, slices: [2, 2, 2] });
    expect(tiles.map((t) => t.artKey)).toEqual([
      "shop-wall-2",
      "shop-wall-2",
      "shop-wall-2",
    ]);
    expect(tiles.map((t) => t.tileX)).toEqual([7, 8, 9]);
  });
});

const PUBLIC = join(process.cwd(), "public");

/** Width/height straight out of a PNG's IHDR chunk. */
function pngSize(file: string): { width: number; height: number } {
  const buf = readFileSync(file);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe("mural assets", () => {
  it("has an imported 64px PNG for every declared slice", () => {
    for (const { id, index } of allMuralTiles()) {
      const file = join(PUBLIC, muralTilePath(id, index));
      expect(existsSync(file), `missing ${muralTilePath(id, index)}`).toBe(true);
      expect(pngSize(file)).toEqual({ width: 64, height: 64 });
    }
  });

  it("resolves every mural key through the art registry", () => {
    for (const { id, index } of allMuralTiles()) {
      const key = muralTileKey(id, index);
      expect(resolveTextureKey(key)).toBe(key);
    }
  });

  it("still rejects art keys that are neither prop, character, nor mural", () => {
    expect(() => resolveTextureKey("not-a-real-key")).toThrow(/Unknown art key/);
  });
});

describe("murals in the shop", () => {
  const slices = (mainRoom.decorations ?? []).filter((d) => isMuralTile(d.artKey));

  it("places every slice of both murals", () => {
    expect(slices).toHaveLength(14);
  });

  it("hangs the four vinyl panels on row c, cols 2-5 (shop-wall caps either side)", () => {
    const vinyl = slices.filter((d) => d.artKey.startsWith("vinyl-wall"));
    expect(vinyl.map((d) => d.artKey)).toEqual([
      "vinyl-wall-1",
      "vinyl-wall-2",
      "vinyl-wall-3",
      "vinyl-wall-4",
    ]);
    expect(vinyl.map((d) => d.tileX)).toEqual([2, 3, 4, 5]);
    expect(vinyl.every((d) => d.tileY === 3)).toBe(true);
  });

  it("runs plain shop wall on row c ends (c1, c6) and behind the rail (h7-14)", () => {
    const shop = slices.filter((d) => d.artKey.startsWith("shop-wall"));
    expect(shop.map((d) => `${d.artKey}@${d.tileX},${d.tileY}`)).toEqual([
      "shop-wall-1@1,3",
      "shop-wall-3@6,3",
      "shop-wall-2@7,8",
      "shop-wall-2@8,8",
      "shop-wall-2@9,8",
      "shop-wall-2@10,8",
      "shop-wall-2@11,8",
      "shop-wall-2@12,8",
      "shop-wall-2@13,8",
      "shop-wall-3@14,8",
    ]);
  });

  it("mounts every slice on a wall tile, never on floor", () => {
    for (const d of slices) {
      expect(
        mainRoom.tiles[d.tileY][d.tileX],
        `${d.artKey} at (${d.tileX},${d.tileY}) is not on a wall tile`,
      ).toBe("wall");
    }
  });

  it("never overlaps two slices on one tile", () => {
    const at = slices.map((d) => `${d.tileX},${d.tileY}`);
    expect(new Set(at).size).toBe(at.length);
  });
});

describe("murals in the basement", () => {
  const slices = (basementRoom.decorations ?? []).filter((d) => isMuralTile(d.artKey));

  it("places every slice of both walls", () => {
    expect(slices).toHaveLength(11);
  });

  it("hangs the back wall along the top border row, cols 7-11", () => {
    const back = slices.filter((d) => d.artKey.startsWith("basement-back-wall"));
    expect(back.map((d) => d.tileX)).toEqual([7, 8, 9, 10, 11]);
    expect(back.every((d) => d.tileY === 0)).toBe(true);
  });

  it("hangs the ledge wall along row c, cols 1-6", () => {
    const ledge = slices.filter((d) => d.artKey.startsWith("basement-ledge-wall"));
    expect(ledge.map((d) => d.tileX)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(ledge.every((d) => d.tileY === 3)).toBe(true);
  });

  it("mounts every slice on a wall tile, never on floor", () => {
    for (const d of slices) {
      expect(
        basementRoom.tiles[d.tileY][d.tileX],
        `${d.artKey} at (${d.tileX},${d.tileY}) is not on a wall tile`,
      ).toBe("wall");
    }
  });

  it("caps a wall face — the tile directly below each slice is floor", () => {
    for (const d of slices) {
      expect(
        basementRoom.tiles[d.tileY + 1][d.tileX],
        `${d.artKey} at (${d.tileX},${d.tileY}) has no floor below it`,
      ).toBe("floor");
    }
  });

  it("never overlaps two slices on one tile", () => {
    const at = slices.map((d) => `${d.tileX},${d.tileY}`);
    expect(new Set(at).size).toBe(at.length);
  });
});
