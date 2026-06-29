import * as Phaser from "phaser";
import { bakePixelArt, bakeShadow } from "./pixelArt";
import {
  floorArt,
  emblemArt,
  windowArt,
  plantArt,
  treeArt,
  matArt,
  wallTopArt,
  wallSideArt,
  wallBottomArt,
  wallFillArt,
  rackArt,
  checkoutArt,
  stairsArt,
  posterArt,
  displayTableArt,
  vinylDeskArt,
  mannequinArt,
  speakerArt,
  boxArt,
  npcArt,
  couchArt,
  rugArt,
  scribbsFrames,
} from "./sprites";

/**
 * Art registry — the ONLY place that maps a world `artKey` to a drawable.
 *
 * Every key resolves to a baked pixel-art texture (see `sprites.ts`). World data
 * still references art only by key, so swapping these definitions for richer art
 * (or imported sprite sheets) never touches the world or scene logic.
 * `bakeAllTextures` must run once in the Boot scene before the world renders.
 */

// Texture keys the world/scene may resolve. Wall variants are chosen at render
// time by `wallVariant()`, not stored in world data.
const TEXTURE_KEYS = [
  "floor",
  "wall-top",
  "wall-side",
  "wall-bottom",
  "wall-fill",
  "rack",
  "checkout",
  "stairs",
  "poster",
  "displayTable",
  "vinylDesk",
  "mannequin",
  "speaker",
  "box",
  "npc",
  "couch",
  "rug",
  "emblem",
  "window",
  "plant",
  "tree",
  "mat",
] as const;

/** Reusable soft contact-shadow texture key. */
export const SHADOW_KEY = "shadow";

export function bakeAllTextures(scene: Phaser.Scene): void {
  bakePixelArt(scene, "floor", floorArt);
  bakePixelArt(scene, "wall-top", wallTopArt);
  bakePixelArt(scene, "wall-side", wallSideArt);
  bakePixelArt(scene, "wall-bottom", wallBottomArt);
  bakePixelArt(scene, "wall-fill", wallFillArt);
  bakePixelArt(scene, "rack", rackArt);
  bakePixelArt(scene, "checkout", checkoutArt);
  bakePixelArt(scene, "stairs", stairsArt);
  bakePixelArt(scene, "poster", posterArt);
  bakePixelArt(scene, "displayTable", displayTableArt);
  bakePixelArt(scene, "vinylDesk", vinylDeskArt);
  bakePixelArt(scene, "mannequin", mannequinArt);
  bakePixelArt(scene, "speaker", speakerArt);
  bakePixelArt(scene, "box", boxArt);
  bakePixelArt(scene, "npc", npcArt);
  bakePixelArt(scene, "couch", couchArt);
  bakePixelArt(scene, "rug", rugArt);
  bakePixelArt(scene, "emblem", emblemArt);
  bakePixelArt(scene, "window", windowArt);
  bakePixelArt(scene, "plant", plantArt);
  bakePixelArt(scene, "tree", treeArt);
  bakePixelArt(scene, "mat", matArt);
  bakeShadow(scene, SHADOW_KEY, 16, 8, 0.32);
  for (const [key, art] of Object.entries(scribbsFrames)) {
    bakePixelArt(scene, key, art);
  }
}

/** Resolve a world artKey (or wall-variant key) to its baked texture key. */
export function resolveTextureKey(artKey: string): string {
  if ((TEXTURE_KEYS as readonly string[]).includes(artKey)) return artKey;
  throw new Error(`Unknown art key: "${artKey}". Add it to the art registry.`);
}

/** Native pixel size every art piece is authored at (square tiles). */
export const ART_NATIVE_SIZE = 16;
