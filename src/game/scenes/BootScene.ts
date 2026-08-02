import * as Phaser from "phaser";
import { bakeAllTextures } from "@/game/art/registry";
import { allCharacterFrames, characterFrame, characterFramePath } from "@/game/art/characters";

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
  }

  create() {
    bakeAllTextures(this);
    this.scene.start("world");
  }
}
