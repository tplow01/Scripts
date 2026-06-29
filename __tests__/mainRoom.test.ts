import { describe, it, expect } from "vitest";
import { mainRoom, isWalkable } from "@/game/world/mainRoom";
import { footprint } from "@/game/world/types";

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

  it("makes every interaction reachable (on, or adjacent to, a walkable tile)", () => {
    const neighbours = [
      [0, 0],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (const it of mainRoom.interactions) {
      const reachable = footprint(it).some((t) =>
        neighbours.some(([dx, dy]) => isWalkable(mainRoom, t.x + dx, t.y + dy)),
      );
      expect(reachable, `${it.id} should be reachable`).toBe(true);
    }
  });

  it("blocks movement onto a solid fixture but leaves the tile as floor", () => {
    const rack = mainRoom.interactions.find((i) => i.id === "rail-h")!;
    expect(mainRoom.tiles[rack.tileY][rack.tileX]).toBe("floor");
    expect(isWalkable(mainRoom, rack.tileX, rack.tileY)).toBe(false);
  });

  it("lets the player step onto the (non-solid) stairs", () => {
    const stairs = mainRoom.interactions.find((i) => i.type === "stairs")!;
    expect(isWalkable(mainRoom, stairs.tileX, stairs.tileY)).toBe(true);
  });

  it("includes the core shop interaction types", () => {
    const types = new Set(mainRoom.interactions.map((i) => i.type));
    for (const t of ["rack", "checkout", "stairs", "vinylDesk"]) {
      expect(types.has(t as never)).toBe(true);
    }
  });

  it("treats out-of-bounds, wall, and the carved void as not walkable", () => {
    expect(isWalkable(mainRoom, -1, 0)).toBe(false);
    expect(isWalkable(mainRoom, 0, 0)).toBe(false); // corner wall
    expect(isWalkable(mainRoom, 10, 2)).toBe(false); // top-right cutout
  });
});
