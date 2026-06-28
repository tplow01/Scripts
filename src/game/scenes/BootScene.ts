import * as Phaser from "phaser";

/**
 * Boot scene. v0 has no real assets to preload (placeholder rects are drawn
 * directly), so it immediately hands off to the world. Real asset loading
 * (spritesheets, tilemaps, fonts) will live here later.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  create() {
    this.scene.start("world");
  }
}
