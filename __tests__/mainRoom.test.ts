import { describe, it, expect } from "vitest";
import { mainRoom } from "@/game/world/mainRoom";
import { isWalkableIn as isWalkable } from "@/game/world/rooms";
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

  it("has a four-tile-thick top wall (play space starts at row d)", () => {
    for (let x = 0; x < mainRoom.width; x++) {
      expect(mainRoom.tiles[1][x]).toBe("wall"); // interior row a
      expect(mainRoom.tiles[2][x]).toBe("wall"); // interior row b
      expect(mainRoom.tiles[3][x]).toBe("wall"); // interior row c, the vinyl wall
    }
    expect(mainRoom.tiles[4][1]).toBe("floor"); // row d, col 1 is play space
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
    expect(crate.tileX).toBe(6); // beside the right speaker (d5)
    expect(crate.slideTo).toEqual({ tileX: 7, tileY: 4 }); // against the wall (d8+ is wall)
    const revealed = new Set(["basement-entrance"]);
    // Still active (slid, not despawned)…
    expect(propActive(crate, revealed)).toBe(true);
    // …and blocks its NEW tile, while the stairs tile (d6) is walkable.
    const blocked = buildBlockedSet(mainRoom, revealed);
    expect(blocked.has("7,4")).toBe(true);
    expect(blocked.has("6,4")).toBe(false);
  });

  it("stairs sit under the crate at d6", () => {
    const stairs = mainRoom.interactions.find((i) => i.type === "stairs")!;
    expect(stairs.tileX).toBe(6);
    expect(stairs.tileY).toBe(4);
  });

  it("includes the core shop interaction types", () => {
    const types = new Set(mainRoom.interactions.map((i) => i.type));
    for (const t of ["rack", "checkout", "stairs", "vinylDesk"]) {
      expect(types.has(t as never)).toBe(true);
    }
  });

  it("ships only the horizontal clothing rail", () => {
    const racks = mainRoom.interactions.filter((i) => i.type === "rack");
    expect(racks.map((r) => r.id)).toEqual(["rail-h"]);
  });

  it("keeps the open carton in the clothing-rail corner", () => {
    const box = (mainRoom.decorations ?? []).find((d) => d.artKey === "box-open");
    expect(box).toMatchObject({ tileX: 14, tileY: 9, solid: true });
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
    // Row d: crate(1) speaker(2) desk(3-4) speaker(5) crate(6) — a matched pair.
    expect(at(1, 4)?.artKey).toBe('vinyl-crate')
    expect(at(2, 4)?.artKey).toBe('speaker')
    expect(at(5, 4)?.artKey).toBe('speaker')
    expect(at(6, 4)?.artKey).toBe('vinyl-crate')
  })

  it('makes both alcove crates solid', () => {
    const crates = (mainRoom.decorations ?? []).filter((d) => d.artKey === 'vinyl-crate')
    expect(crates).toHaveLength(2)
    expect(crates.every((c) => c.solid)).toBe(true)
  })
})

describe('sofa collision', () => {
  it('blocks every sofa tile — cushions are not walkable', () => {
    // Back f1 + cushions g1–g4.
    const sofaTiles = [
      { x: 1, y: 6 },
      { x: 1, y: 7 }, { x: 2, y: 7 }, { x: 3, y: 7 }, { x: 4, y: 7 },
    ]
    for (const t of sofaTiles) {
      expect(isWalkable(mainRoom, t.x, t.y), `sofa tile ${t.x},${t.y} should be solid`).toBe(false)
    }
    expect(mainRoom.seats ?? []).toHaveLength(0)
  })
})
