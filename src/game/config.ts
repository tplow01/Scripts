import * as Phaser from "phaser";
import { mainRoom } from "@/game/world/mainRoom";
import { BootScene } from "./scenes/BootScene";
import { WorldScene } from "./scenes/WorldScene";

/**
 * Phaser game config. The canvas fills its container (RESIZE); the world scene
 * sets an integer camera zoom that covers the viewport and follows Scribbs, so
 * the room reads like a real overworld you explore rather than a framed
 * screenshot. `parent` is the DOM node the canvas mounts into.
 */
export function createGameConfig(
  parent: HTMLElement,
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: mainRoom.width * mainRoom.tileSize,
    height: mainRoom.height * mainRoom.tileSize,
    backgroundColor: "#1C1A22",
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, WorldScene],
  };
}
