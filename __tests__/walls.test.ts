import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { resolveTextureKey } from "@/game/art/registry";
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
  it("names both shop murals", () => {
    expect(MURAL_IDS).toEqual(["vinyl-wall", "clothing-wall"]);
  });

  it("declares eight slices per mural, matching the authored art", () => {
    expect(MURAL_SLICES["vinyl-wall"]).toBe(8);
    expect(MURAL_SLICES["clothing-wall"]).toBe(8);
  });

  it("builds 1-indexed texture keys and paths", () => {
    expect(muralTileKey("vinyl-wall", 1)).toBe("vinyl-wall-1");
    expect(muralTileKey("clothing-wall", 8)).toBe("clothing-wall-8");
    expect(muralTilePath("vinyl-wall", 3)).toBe("/assets/walls/vinyl-wall-3.png");
  });

  it("enumerates every slice of every mural", () => {
    expect(allMuralTiles()).toHaveLength(16);
    expect(allMuralTiles()[0]).toEqual({ id: "vinyl-wall", index: 1 });
  });

  it("recognises mural keys and rejects other art keys", () => {
    expect(isMuralTile("vinyl-wall-8")).toBe(true);
    expect(isMuralTile("vinyl-wall-9")).toBe(false);
    expect(isMuralTile("speaker")).toBe(false);
  });
});

describe("mural() expansion", () => {
  it("lays slices left to right from the anchor tile", () => {
    const tiles = mural("clothing-wall", { tileX: 8, tileY: 7, tiles: 8 });
    expect(tiles).toHaveLength(8);
    expect(tiles[0]).toEqual({ tileX: 8, tileY: 7, artKey: "clothing-wall-1" });
    expect(tiles[7]).toEqual({ tileX: 15, tileY: 7, artKey: "clothing-wall-8" });
  });

  it("never marks a mural slice solid — collision comes from the wall tile beneath", () => {
    expect(mural("vinyl-wall", { tileX: 1, tileY: 1, tiles: 8 }).every((t) => !t.solid)).toBe(true);
  });

  it("refuses a tile count the authored art cannot fill", () => {
    expect(() => mural("vinyl-wall", { tileX: 1, tileY: 1, tiles: 6 })).toThrow(
      /vinyl-wall has 8 slices/,
    );
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
