import * as Phaser from "phaser";
import { colors } from "@/theme/tokens";
import { mainRoom } from "@/game/world/mainRoom";
import { BootScene } from "./scenes/BootScene";
import { WorldScene } from "./scenes/WorldScene";

/**
 * Phaser game config. The internal resolution is sized to the room so the whole
 * room frames cleanly, then FIT scales it up to fill the container crisply.
 * `parent` is the DOM node the canvas mounts into.
 */
export function createGameConfig(
  parent: HTMLElement,
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: mainRoom.width * mainRoom.tileSize,
    height: mainRoom.height * mainRoom.tileSize,
    backgroundColor: colors.ink,
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, WorldScene],
  };
}
