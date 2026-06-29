import * as Phaser from "phaser";
import { bakeAllTextures } from "@/game/art/registry";

/**
 * Boot scene. Bakes every pixel-art texture from the registry (floor, walls,
 * props, decorations, character frames) into the texture cache, then hands off
 * to the world. Baking here means the world scene only ever references texture
 * keys — never raw pixel data.
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
