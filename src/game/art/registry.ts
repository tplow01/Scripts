import { colorsNum } from "@/theme/tokens";

/**
 * Art registry — the ONLY place that maps a world `artKey` to something drawable.
 *
 * v0 uses coloured-rectangle placeholders so we can prove the pipeline with zero
 * asset files. Upgrading to real pixel art later means changing descriptors here
 * (e.g. to `{ kind: 'sprite', sheet, frame }`) — world data never changes.
 */

export interface RectArt {
  kind: "rect";
  color: number;
  width: number;
  height: number;
}

export type ArtDescriptor = RectArt;

const TILE = 32;

const registry: Record<string, ArtDescriptor> = {
  scribbs: { kind: "rect", color: colorsNum.pink, width: TILE - 8, height: TILE - 8 },
  floor: { kind: "rect", color: colorsNum.ink, width: TILE, height: TILE },
  wall: { kind: "rect", color: colorsNum.grey, width: TILE, height: TILE },
  rack: { kind: "rect", color: colorsNum.paper, width: TILE - 6, height: TILE - 6 },
  checkout: { kind: "rect", color: colorsNum.pinkDeep, width: TILE - 4, height: TILE - 4 },
  stairs: { kind: "rect", color: colorsNum.pink, width: TILE - 6, height: TILE - 6 },
};

/** Resolve an art key to a descriptor. Throws on unknown keys (fail loud in dev). */
export function resolveArt(key: string): ArtDescriptor {
  const art = registry[key];
  if (!art) {
    throw new Error(`Unknown art key: "${key}". Add it to the art registry.`);
  }
  return art;
}
