import * as Phaser from "phaser";
import { colors } from "@/theme/tokens";
import { BootScene } from "./scenes/BootScene";
import { WorldScene } from "./scenes/WorldScene";

/** Phaser game config. `parent` is the DOM node the canvas mounts into. */
export function createGameConfig(
  parent: HTMLElement,
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: 480,
    height: 360,
    backgroundColor: colors.ink,
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, WorldScene],
  };
}
