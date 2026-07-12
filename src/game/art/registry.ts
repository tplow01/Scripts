import * as Phaser from "phaser";
import { bakePixelArt, bakeShadow } from "./pixelArt";
import {
  hiresCharacters,
  hiresFloorArt,
  hiresBasementFloorArt,
  hiresWallTopArt,
  hiresWallSideArt,
  hiresWallBottomArt,
  hiresWallFillArt,
  hiresRackArt,
  hiresRailH7Art,
  hiresRailV7Art,
  hiresRailH3Art,
  hiresRailV3Art,
  hiresSpeakerArt,
  hiresBoxArt,
  hiresStairsArt,
  hiresVinylDeskArt,
  hiresCratesArt,
  hiresCheckoutArt,
  hiresCouchArt,
  hiresPosterArt,
  hiresDisplayTableArt,
  hiresMannequinArt,
  hiresWindowArt,
  hiresPlantArt,
  hiresRugArt,
  hiresExtVoidArt,
  HIRES_NATIVE_SIZE,
} from "./hiresArt";
import { emblemArt, matArt } from "./sprites";

/**
 * Art registry — the ONLY place that maps a world `artKey` to a drawable.
 *
 * Every key resolves to a baked pixel-art texture (see `hiresArt.ts`). World data
 * still references art only by key, so swapping these definitions for richer art
 * (or imported sprite sheets) never touches the world or scene logic.
 * `bakeAllTextures` must run once in the Boot scene before the world renders.
 */

// Texture keys the world/scene may resolve. Wall variants are chosen at render
// time by `wallVariant()`, not stored in world data.
const TEXTURE_KEYS = [
  "floor",
  "floor-basement",
  "wall-top",
  "wall-side",
  "wall-bottom",
  "wall-fill",
  "rack",
  "rack-h7",
  "rack-v7",
  "rack-h3",
  "rack-v3",
  "checkout",
  "stairs",
  "poster",
  "displayTable",
  "vinylDesk",
  "mannequin",
  "speaker",
  "box",
  "npc",
  "npcRail",
  "npcSitter",
  "npcGazer",
  "npcShopper",
  "cashier",
  "couch",
  "crates",
  "rug",
  "emblem",
  "window",
  "plant",
  "mat",
  "ext-void",
] as const;

/** Reusable soft contact-shadow texture key. */
export const SHADOW_KEY = "shadow";

export function bakeAllTextures(scene: Phaser.Scene): void {
  bakePixelArt(scene, "floor", hiresFloorArt);
  bakePixelArt(scene, "floor-basement", hiresBasementFloorArt);
  bakePixelArt(scene, "wall-top", hiresWallTopArt);
  bakePixelArt(scene, "wall-side", hiresWallSideArt);
  bakePixelArt(scene, "wall-bottom", hiresWallBottomArt);
  bakePixelArt(scene, "wall-fill", hiresWallFillArt);
  bakePixelArt(scene, "rack", hiresRackArt);
  bakePixelArt(scene, "rack-h7", hiresRailH7Art);
  bakePixelArt(scene, "rack-v7", hiresRailV7Art);
  bakePixelArt(scene, "rack-h3", hiresRailH3Art);
  bakePixelArt(scene, "rack-v3", hiresRailV3Art);
  bakePixelArt(scene, "checkout", hiresCheckoutArt);
  bakePixelArt(scene, "stairs", hiresStairsArt);
  bakePixelArt(scene, "poster", hiresPosterArt);
  bakePixelArt(scene, "displayTable", hiresDisplayTableArt);
  bakePixelArt(scene, "vinylDesk", hiresVinylDeskArt);
  bakePixelArt(scene, "mannequin", hiresMannequinArt);
  bakePixelArt(scene, "speaker", hiresSpeakerArt);
  bakePixelArt(scene, "box", hiresBoxArt);
  bakePixelArt(scene, "npc", hiresCharacters.npc);
  bakePixelArt(scene, "npcRail", hiresCharacters.npcRail);
  bakePixelArt(scene, "npcSitter", hiresCharacters.npcSitter);
  bakePixelArt(scene, "npcGazer", hiresCharacters.npcGazer);
  bakePixelArt(scene, "npcShopper", hiresCharacters.npcShopper);
  bakePixelArt(scene, "cashier", hiresCharacters.cashier);
  bakePixelArt(scene, "cashier-walk-a", hiresCharacters["cashier-walk-a"]);
  bakePixelArt(scene, "cashier-walk-b", hiresCharacters["cashier-walk-b"]);
  bakePixelArt(scene, "couch", hiresCouchArt);
  bakePixelArt(scene, "crates", hiresCratesArt);
  bakePixelArt(scene, "rug", hiresRugArt);
  // Brand invariant: use the exact pre-overhaul comet + scr!pts wordmark.
  bakePixelArt(scene, "emblem", emblemArt);
  bakePixelArt(scene, "window", hiresWindowArt);
  bakePixelArt(scene, "plant", hiresPlantArt);
  // Entrance invariant: keep the previous plain-pink threshold; no fake mark.
  bakePixelArt(scene, "mat", matArt);
  bakePixelArt(scene, "ext-void", hiresExtVoidArt);
  bakeShadow(scene, SHADOW_KEY, 16, 8, 0.32);
  for (const [key, art] of Object.entries(hiresCharacters)) {
    if (!key.startsWith("scribbs-")) continue;
    bakePixelArt(scene, key, art);
  }
}

/** Resolve a world artKey (or wall-variant key) to its baked texture key. */
export function resolveTextureKey(artKey: string): string {
  if ((TEXTURE_KEYS as readonly string[]).includes(artKey)) return artKey;
  throw new Error(`Unknown art key: "${artKey}". Add it to the art registry.`);
}

/** Native pixel size every art piece is authored at (square tiles). */
export const ART_NATIVE_SIZE = HIRES_NATIVE_SIZE;
