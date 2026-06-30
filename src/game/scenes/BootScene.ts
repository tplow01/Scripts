import * as Phaser from "phaser";
import { bakeAllTextures } from "@/game/art/registry";

/**
 * Scribbs character frames come from the supplied GBA sprite sheet (sliced to
 * public/assets/scribbs/). They're loaded here under the scene's frame keys;
 * everything else (floor, walls, props) is hand-baked in the registry. When
 * `bakeAllTextures` runs it skips any key already loaded, so the real Scribbs
 * art wins while the rest stays code-authored FireRed pixel art.
 */
const SCRIBBS_FRAMES = [
  "scribbs-down-a",
  "scribbs-down-b",
  "scribbs-up-a",
  "scribbs-up-b",
  "scribbs-side-a",
  "scribbs-side-b",
];

export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload() {
    for (const key of SCRIBBS_FRAMES) {
      this.load.image(key, `/assets/scribbs/${key}.png`);
    }
    // SCR!PTS floor logo — the real brand lockup as a smooth decal.
    this.load.image("emblem", "/assets/logo.png");
  }

  create() {
    // Logo stays smooth (linear) over the pixel floor; everything else is nearest.
    this.textures.get("emblem").setFilter(Phaser.Textures.FilterMode.LINEAR);
    bakeAllTextures(this);
    this.scene.start("world");
  }
}
