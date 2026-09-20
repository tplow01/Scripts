import * as Phaser from "phaser";
import { bakeAllTextures } from "@/game/art/registry";
import { bootImages } from "@/game/bootImages";

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
    // Every image the world needs, from the single shared list (see
    // game/bootImages.ts) — the start screen warms the same URLs.
    for (const { key, url } of bootImages()) this.load.image(key, url);
  }

  create() {
    bakeAllTextures(this);
    this.scene.start("world");
  }
}
