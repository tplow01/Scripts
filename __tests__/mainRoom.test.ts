import { describe, it, expect } from "vitest";
import { mainRoom, isWalkable } from "@/game/world/mainRoom";

describe("mainRoom world data", () => {
  it("has a tile grid matching its declared dimensions", () => {
    expect(mainRoom.tiles).toHaveLength(mainRoom.height);
    for (const row of mainRoom.tiles) {
      expect(row).toHaveLength(mainRoom.width);
    }
  });

  it("is walled around the entire border", () => {
    for (let x = 0; x < mainRoom.width; x++) {
      expect(mainRoom.tiles[0][x]).toBe("wall");
      expect(mainRoom.tiles[mainRoom.height - 1][x]).toBe("wall");
    }
    for (let y = 0; y < mainRoom.height; y++) {
      expect(mainRoom.tiles[y][0]).toBe("wall");
      expect(mainRoom.tiles[y][mainRoom.width - 1]).toBe("wall");
    }
  });

  it("spawns the player in bounds on a walkable tile", () => {
    const { tileX, tileY } = mainRoom.spawn;
    expect(isWalkable(mainRoom, tileX, tileY)).toBe(true);
  });

  it("places every interaction on a walkable tile", () => {
    for (const it of mainRoom.interactions) {
      expect(isWalkable(mainRoom, it.tileX, it.tileY)).toBe(true);
    }
  });

  it("has the three expected interaction types", () => {
    const types = mainRoom.interactions.map((i) => i.type).sort();
    expect(types).toEqual(["checkout", "rack", "stairs"]);
  });

  it("treats out-of-bounds and wall tiles as not walkable", () => {
    expect(isWalkable(mainRoom, -1, 0)).toBe(false);
    expect(isWalkable(mainRoom, 0, 0)).toBe(false); // corner wall
  });
});
