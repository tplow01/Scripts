import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  CHARACTER_IDS,
  allCharacterFrames,
  characterFrame,
  characterFramePath,
  isCharacterFrame,
  parseCharacterFrame,
} from "@/game/art/characters";
import { resolveTextureKey } from "@/game/art/registry";
import { mainRoom } from "@/game/world/mainRoom";
import { basementRoom } from "@/game/world/basement";
import { isWalkableIn } from "@/game/world/rooms";
import type { Room } from "@/game/world/types";

const PUBLIC = join(process.cwd(), "public");
const CANVAS = 64;

/** Width/height straight out of a PNG's IHDR chunk. */
function pngSize(file: string): { width: number; height: number } {
  const buf = readFileSync(file);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe("the cast", () => {
  it("ships all 12 frames for all five characters", () => {
    const frames = [...allCharacterFrames()];
    expect(frames).toHaveLength(CHARACTER_IDS.length * 12);
    for (const { id, facing, foot } of frames) {
      const file = join(PUBLIC, characterFramePath(id, facing, foot));
      expect(existsSync(file), `missing ${file}`).toBe(true);
      expect(pngSize(file)).toEqual({ width: CANVAS, height: CANVAS });
    }
  });

  it("recognises character frames and rejects prop keys", () => {
    expect(isCharacterFrame(characterFrame("heath", "right", "both"))).toBe(true);
    expect(isCharacterFrame("couch")).toBe(false);
    expect(parseCharacterFrame("teo-left-right")).toEqual({
      id: "teo",
      facing: "left",
      foot: "right",
    });
    expect(parseCharacterFrame("teo-sideways-both")).toBeNull();
  });

  it("resolves every character artKey used by the world", () => {
    for (const room of [mainRoom, basementRoom]) {
      for (const it of room.interactions) {
        expect(() => resolveTextureKey(it.artKey)).not.toThrow();
      }
    }
  });
});

describe("patrolling NPCs", () => {
  const patrols = mainRoom.interactions.filter((i) => i.patrol);

  it("puts Teo and TP on routes and leaves the rest standing", () => {
    expect(patrols.map((p) => p.id).sort()).toEqual(["teo", "tp"]);
  });

  it("authors every route as a chain of orthogonally adjacent tiles", () => {
    for (const npc of patrols) {
      const pts = npc.patrol!.waypoints;
      expect(pts.length).toBeGreaterThan(1);
      for (let i = 1; i < pts.length; i++) {
        const d = Math.abs(pts[i].x - pts[i - 1].x) + Math.abs(pts[i].y - pts[i - 1].y);
        expect(d, `${npc.id} waypoint ${i} is not adjacent to ${i - 1}`).toBe(1);
      }
    }
  });

  it("routes only over walkable floor", () => {
    for (const npc of patrols) {
      for (const p of npc.patrol!.waypoints) {
        expect(isWalkableIn(mainRoom as Room, p.x, p.y), `${npc.id} @ ${p.x},${p.y}`).toBe(true);
      }
    }
  });

  it("keeps patrollers out of the static blocked set", () => {
    // Their authored tile is a spawn point, not a permanent obstacle — the
    // scene tracks their live position instead (see WorldScene.npcCanEnter).
    for (const npc of patrols) expect(npc.solid).toBeFalsy();
  });

  it("never routes a patroller through a seat zone", () => {
    const seatTiles = new Set(
      (mainRoom.seats ?? []).flatMap((z) => z.tiles.map((t) => `${t.x},${t.y}`)),
    );
    for (const npc of patrols) {
      for (const p of npc.patrol!.waypoints) {
        expect(seatTiles.has(`${p.x},${p.y}`), `${npc.id} would sit down at ${p.x},${p.y}`).toBe(false);
      }
    }
  });

  it('keeps every route clear of the floor logo', () => {
    // The SCR!PTS floor mark occupies columns 7-9, rows k-m (11-13).
    for (const npc of patrols) {
      for (const p of npc.patrol!.waypoints) {
        const onLogo = p.x >= 7 && p.x <= 9 && p.y >= 11 && p.y <= 13
        expect(onLogo, `${npc.id} crosses the logo at ${p.x},${p.y}`).toBe(false)
      }
    }
  });

  it('keeps TP between the sofa and the checkout', () => {
    const tp = patrols.find((p) => p.id === 'tp')!
    for (const p of tp.patrol!.waypoints) {
      expect(p.x).toBeLessThanOrEqual(4)
      expect(p.y).toBeGreaterThanOrEqual(6)
    }
  });
});
