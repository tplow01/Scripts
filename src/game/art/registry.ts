import * as Phaser from "phaser";
import { bakePixelArt, bakeShadow } from "./pixelArt";
import { isCharacterFrame } from "./characters";
import { isMuralTile } from "./walls";
import { isFloorArt } from "./floors";
import { isCheckoutTile } from "./checkout";
import { isSofaTile } from "./sofa";
import { isRailTile } from "./rails";
import { isAuthoredProp } from "./props";
import { isDeckTile } from "./vinylDeck";
import {
  hiresWallTopArt,
  hiresWallSideArt,
  hiresWallBottomArt,
  hiresWallFillArt,
  hiresRackArt,
  hiresRailH3Art,
  hiresRailV3Art,
  hiresCratesArt,
  hiresBookcaseArt,
  hiresPosterArt,
  hiresDisplayTableArt,
  hiresMannequinArt,
  hiresWindowArt,
  hiresPlantArt,
  hiresExtVoidArt,
  HIRES_NATIVE_SIZE,
} from "./hiresArt";
import { emblemArt } from "./sprites";

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
  "wall-top",
  "wall-side",
  "wall-bottom",
  "wall-fill",
  "rack",
  "rack-h3",
  "rack-v3",
  "poster",
  "displayTable",
  "mannequin",
  "crates",
  "bookcase",
  "emblem",
  "window",
  "plant",
  "ext-void",
] as const;

/** Reusable soft contact-shadow texture key. */
export const SHADOW_KEY = "shadow";

export function bakeAllTextures(scene: Phaser.Scene): void {
  bakePixelArt(scene, "wall-top", hiresWallTopArt);
  bakePixelArt(scene, "wall-side", hiresWallSideArt);
  bakePixelArt(scene, "wall-bottom", hiresWallBottomArt);
  bakePixelArt(scene, "wall-fill", hiresWallFillArt);
  bakePixelArt(scene, "rack", hiresRackArt);
  bakePixelArt(scene, "rack-h3", hiresRailH3Art);
  bakePixelArt(scene, "rack-v3", hiresRailV3Art);
  bakePixelArt(scene, "poster", hiresPosterArt);
  bakePixelArt(scene, "displayTable", hiresDisplayTableArt);
  bakePixelArt(scene, "mannequin", hiresMannequinArt);
  bakePixelArt(scene, "crates", hiresCratesArt);
  bakePixelArt(scene, "bookcase", hiresBookcaseArt);
  // Brand invariant: use the exact pre-overhaul comet + scr!pts wordmark.
  bakePixelArt(scene, "emblem", emblemArt);
  bakePixelArt(scene, "window", hiresWindowArt);
  bakePixelArt(scene, "plant", hiresPlantArt);
  bakePixelArt(scene, "ext-void", hiresExtVoidArt);
  bakeShadow(scene, SHADOW_KEY, 16, 8, 0.32);
  // The cast (see art/characters.ts) is loaded from authored PNGs in
  // BootScene.preload rather than baked procedurally — nothing to do here.
}

/** Resolve a world artKey (or wall-variant key) to its loaded texture key. */
export function resolveTextureKey(artKey: string): string {
  if ((TEXTURE_KEYS as readonly string[]).includes(artKey)) return artKey;
  // Character frames ("heath-right-both") are loaded, not baked, and are
  // enumerated by art/characters.ts rather than listed here.
  if (isCharacterFrame(artKey)) return artKey;
  // Wall murals ("vinyl-wall-3") are likewise authored PNGs, enumerated by
  // art/walls.ts.
  if (isMuralTile(artKey)) return artKey;
  // The floors and the entrance rug are authored PNGs too (art/floors.ts).
  if (isFloorArt(artKey)) return artKey;
  // The checkout counter is six authored slices too (art/checkout.ts).
  if (isCheckoutTile(artKey)) return artKey;
  // The sofa is five authored slices too (art/sofa.ts).
  if (isSofaTile(artKey)) return artKey;
  // The shop's two clothing rails are authored slices too (art/rails.ts).
  if (isRailTile(artKey)) return artKey;
  // One-tile hand-drawn props (art/props.ts).
  if (isAuthoredProp(artKey)) return artKey;
  // The vinyl deck is two authored slices (art/vinylDeck.ts).
  if (isDeckTile(artKey)) return artKey;
  throw new Error(`Unknown art key: "${artKey}". Add it to the art registry.`);
}

/** Native pixel size every art piece is authored at (square tiles). */
export const ART_NATIVE_SIZE = HIRES_NATIVE_SIZE;
