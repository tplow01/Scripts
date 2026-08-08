import { describe, it, expect } from "vitest";
import { mainRoom } from "@/game/world/mainRoom";
import { isWalkableIn as isWalkable, canStep, isWalkableIn } from "@/game/world/rooms";
import { footprint, buildBlockedSet, propActive } from "@/game/world/types";

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

  it("has a three-tile-thick top wall (play space starts at row c)", () => {
    for (let x = 0; x < mainRoom.width; x++) {
      expect(mainRoom.tiles[1][x]).toBe("wall"); // interior row a
      expect(mainRoom.tiles[2][x]).toBe("wall"); // interior row b, the vinyl wall
    }
    expect(mainRoom.tiles[3][1]).toBe("floor"); // row c, col 1 is play space
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

  it("hides the secret stairs behind the crates until revealed", () => {
    const stairs = mainRoom.interactions.find((i) => i.type === "stairs")!;
    // Concealed by default: the record crates cover the entrance tile.
    expect(isWalkable(mainRoom, stairs.tileX, stairs.tileY)).toBe(false);
    // Once the entrance flag is revealed, the cover lifts and the tile opens.
    const revealed = buildBlockedSet(mainRoom, new Set(["basement-entrance"]));
    expect(revealed.has(`${stairs.tileX},${stairs.tileY}`)).toBe(false);
  });

  it("keeps the record crate in the world after the reveal, parked right of the stairs", () => {
    // Both alcove crates share one art key now, so find the concealing one.
    const crate = (mainRoom.decorations ?? []).find((d) => d.concealing)!;
    expect(crate.tileX).toBe(6); // beside the right speaker (c5)
    expect(crate.slideTo).toEqual({ tileX: 7, tileY: 3 }); // against the wall (c8+ is wall)
    const revealed = new Set(["basement-entrance"]);
    // Still active (slid, not despawned)…
    expect(propActive(crate, revealed)).toBe(true);
    // …and blocks its NEW tile, while the stairs tile (c6) is walkable.
    const blocked = buildBlockedSet(mainRoom, revealed);
    expect(blocked.has("7,3")).toBe(true);
    expect(blocked.has("6,3")).toBe(false);
  });

  it("stairs sit under the crate at c6", () => {
    const stairs = mainRoom.interactions.find((i) => i.type === "stairs")!;
    expect(stairs.tileX).toBe(6);
    expect(stairs.tileY).toBe(3);
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

describe('music alcove symmetry', () => {
  it('mirrors the record crate with a bookcase about the vinyl desk', () => {
    const at = (x: number, y: number) =>
      (mainRoom.decorations ?? []).find((d) => d.tileX === x && d.tileY === y)
    // Row c: crate(1) speaker(2) desk(3-4) speaker(5) crate(6) — a matched pair.
    expect(at(1, 3)?.artKey).toBe('vinyl-crate')
    expect(at(2, 3)?.artKey).toBe('speaker')
    expect(at(5, 3)?.artKey).toBe('speaker')
    expect(at(6, 3)?.artKey).toBe('vinyl-crate')
  })

  it('makes both alcove crates solid', () => {
    const crates = (mainRoom.decorations ?? []).filter((d) => d.artKey === 'vinyl-crate')
    expect(crates).toHaveLength(2)
    expect(crates.every((c) => c.solid)).toBe(true)
  })
})

describe('sofa reachability', () => {
  it('lets the player reach every seat tile from outside the zone', () => {
    for (const zone of mainRoom.seats ?? []) {
      const key = (t: { x: number; y: number }) => `${t.x},${t.y}`
      const inZone = (x: number, y: number) => zone.tiles.some((s) => s.x === x && s.y === y)

      // Seeds: seat tiles you can step onto directly from outside the zone.
      const seeds = zone.tiles.filter((t) =>
        [[0, -1], [0, 1], [-1, 0], [1, 0]].some(([dx, dy]) => {
          const f = { x: t.x - dx, y: t.y - dy }
          return !inZone(f.x, f.y) &&
            isWalkableIn(mainRoom, f.x, f.y) &&
            canStep(mainRoom, f.x, f.y, t.x, t.y)
        }))
      expect(seeds.length, `seat zone entered by "${zone.enterDir}" has no entrance`).toBeGreaterThan(0)

      // Spread inward only where the zone permits shuffling between its tiles.
      const reached = new Set(seeds.map(key))
      if (zone.internalMoves) {
        for (let grew = true; grew;) {
          grew = false
          for (const t of zone.tiles) {
            if (reached.has(key(t))) continue
            const adjacent = zone.tiles.some((s) =>
              reached.has(key(s)) && Math.abs(s.x - t.x) + Math.abs(s.y - t.y) === 1)
            if (adjacent) { reached.add(key(t)); grew = true }
          }
        }
      }

      for (const t of zone.tiles) {
        expect(reached.has(key(t)), `seat ${key(t)} is unreachable`).toBe(true)
      }
    }
  })
})
