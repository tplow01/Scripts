import * as Phaser from "phaser";
import { bakeAllTextures } from "@/game/art/registry";

/**
 * Production art is baked from the original SCR!PTS 32px source definitions.
 * Keeping boot deterministic means no externally supplied game sprite is able
 * to silently override the house style or its licensing provenance.
 */

export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload() {
    // Native 96px floor asset is a nearest-neighbour reduction of the canonical
    // 480px (exact 5×) master. No runtime resampling or procedural approximation.
    this.load.image("emblem", "/assets/logo-floor-96.png");
  }

  create() {
    bakeAllTextures(this);
    this.scene.start("world");
  }
}
