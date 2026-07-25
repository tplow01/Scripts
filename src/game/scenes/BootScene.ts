import * as Phaser from "phaser";
import { bakeAllTextures } from "@/game/art/registry";

/**
 * Most production art is baked from the original SCR!PTS 32px source
 * definitions. Scribbs (the player character) is the deliberate exception:
 * its sprites are loaded from authored PNGs in /assets/scribbs so the
 * player art can be updated without touching procedural pixel-art code.
 */

export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload() {
    // Native 96px floor asset is a nearest-neighbour reduction of the canonical
    // 480px (exact 5×) master. No runtime resampling or procedural approximation.
    this.load.image("emblem", "/assets/logo-floor-96.png");

    // Scribbs walk-cycle art: 4 directions x 3 authored frames (left foot /
    // both feet / right foot), 64px PNGs. Left and right are distinct art —
    // no flip-mirroring.
    const directions = ["down", "up", "left", "right"] as const;
    const feet = ["left", "both", "right"] as const;
    for (const dir of directions) {
      for (const foot of feet) {
        this.load.image(`scribbs-${dir}-${foot}`, `/assets/scribbs/scribbs-${dir}-${foot}.png`);
      }
    }
  }

  create() {
    bakeAllTextures(this);
    this.scene.start("world");
  }
}
