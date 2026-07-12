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

  create() {
    bakeAllTextures(this);
    this.scene.start("world");
  }
}
