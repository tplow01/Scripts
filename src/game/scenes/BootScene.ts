import * as Phaser from "phaser";
import { bakeAllTextures } from "@/game/art/registry";
import { allCharacterFrames, characterFrame, characterFramePath } from "@/game/art/characters";
import { allMuralTiles, muralTileKey, muralTilePath } from "@/game/art/walls";
import { FLOOR_IDS, allRugTiles, floorPath, rugTileKey, rugTilePath } from "@/game/art/floors";
import { allCheckoutTiles, checkoutTileKey, checkoutTilePath } from "@/game/art/checkout";
import { allSofaTiles, sofaTileKey, sofaTilePath } from "@/game/art/sofa";
import { allRailTiles, railTileKey, railTilePath } from "@/game/art/rails";
import { PROP_IDS, propPath } from "@/game/art/props";
import { allDeckTiles, deckTileKey, deckTilePath } from "@/game/art/vinylDeck";

/**
 * Props and architecture are baked from the original SCR!PTS 32px source
 * definitions. The cast is the deliberate exception: every character's frames
 * are loaded from authored PNGs under /assets, so character art can be
 * redrawn and re-imported (scripts/import-sprites.py) without touching
 * procedural pixel-art code.
 */

export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload() {
    // Native 96px floor asset is a nearest-neighbour reduction of the canonical
    // 480px (exact 5×) master. No runtime resampling or procedural approximation.
    this.load.image("emblem", "/assets/logo-floor-96.png");

    // The cast: 5 characters x 4 facings x 3 walk frames (left foot / neutral /
    // right foot), 64px PNGs. Left and right are distinct art — no flip-mirroring.
    for (const { id, facing, foot } of allCharacterFrames()) {
      this.load.image(characterFrame(id, facing, foot), characterFramePath(id, facing, foot));
    }

    // The shop's wall murals: two hand-drawn walls, 8 stitched 64px tiles each
    // (scripts/import-walls.py). Authored PNGs for the same reason the cast is —
    // so the walls can be redrawn without touching procedural art code.
    for (const { id, index } of allMuralTiles()) {
      this.load.image(muralTileKey(id, index), muralTilePath(id, index));
    }

    // The two floors and the 3-tile entrance rug — hand-drawn on the same 32px
    // grid as everything else, imported by scripts/import-fixtures.py. Authored
    // PNGs for the same reason the cast and walls are.
    for (const id of FLOOR_IDS) {
      this.load.image(id, floorPath(id));
    }
    for (const index of allRugTiles()) {
      this.load.image(rugTileKey(index), rugTilePath(index));
    }

    // The checkout counter: 6 hand-drawn slices laid into its L footprint
    // (see art/checkout.ts).
    for (const index of allCheckoutTiles()) {
      this.load.image(checkoutTileKey(index), checkoutTilePath(index));
    }

    // The sofa: 5 hand-drawn slices, back on top of the cushion row
    // (see art/sofa.ts).
    for (const index of allSofaTiles()) {
      this.load.image(sofaTileKey(index), sofaTilePath(index));
    }

    // The two clothing rails: 6 hand-drawn slices each (see art/rails.ts).
    for (const { id, index } of allRailTiles()) {
      this.load.image(railTileKey(id, index), railTilePath(id, index));
    }

    // Hand-drawn one-tile props (the Basement's box — see art/props.ts).
    for (const id of PROP_IDS) {
      this.load.image(id, propPath(id));
    }

    // The vinyl deck's two slices (see art/vinylDeck.ts).
    for (const index of allDeckTiles()) {
      this.load.image(deckTileKey(index), deckTilePath(index));
    }
  }

  create() {
    bakeAllTextures(this);
    this.scene.start("world");
  }
}
