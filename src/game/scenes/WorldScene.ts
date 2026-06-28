import * as Phaser from "phaser";
import { mainRoom, isWalkable } from "@/game/world/mainRoom";
import { resolveArt } from "@/game/art/registry";

/**
 * Renders the current room from world data + the art registry, and drives
 * Scribbs around a tile grid with the camera following.
 *
 * Movement is event-driven (one step per keydown; holding a key relies on the
 * OS key-repeat firing more keydowns) — classic grid movement, and robust to
 * brief key taps. A short cooldown keeps held movement from being too fast.
 *
 * Note the separation: this scene knows tile positions and walkability (world
 * data) and pulls every visual from `resolveArt` (art registry). Swapping the
 * registry to real sprites later requires no change here beyond how a
 * descriptor is drawn.
 */
export class WorldScene extends Phaser.Scene {
  private scribbs!: Phaser.GameObjects.Rectangle;
  private tileX = mainRoom.spawn.tileX;
  private tileY = mainRoom.spawn.tileY;
  private moveLockedUntil = 0;
  private lastInteractionId: string | null = null;

  constructor() {
    super("world");
  }

  create() {
    const ts = mainRoom.tileSize;

    // Floor + walls.
    for (let y = 0; y < mainRoom.height; y++) {
      for (let x = 0; x < mainRoom.width; x++) {
        const key = mainRoom.tiles[y][x] === "wall" ? "wall" : "floor";
        const art = resolveArt(key);
        this.add.rectangle(x * ts + ts / 2, y * ts + ts / 2, art.width, art.height, art.color);
      }
    }

    // Interaction objects (rack, checkout, stairs).
    for (const it of mainRoom.interactions) {
      const art = resolveArt(it.artKey);
      this.add
        .rectangle(it.tileX * ts + ts / 2, it.tileY * ts + ts / 2, art.width, art.height, art.color)
        .setStrokeStyle(1, 0xffffff, 0.3);
    }

    // Scribbs.
    const sArt = resolveArt("scribbs");
    this.scribbs = this.add
      .rectangle(this.tileX * ts + ts / 2, this.tileY * ts + ts / 2, sArt.width, sArt.height, sArt.color)
      .setDepth(10);

    // Camera: bound to the room and follow Scribbs. For this single v0 room the
    // viewport equals the room, so the whole room stays framed; follow + bounds
    // start mattering (panning) once the map grows beyond one screen.
    this.cameras.main.setBounds(0, 0, mainRoom.width * ts, mainRoom.height * ts);
    this.cameras.main.startFollow(this.scribbs, true);

    // Input: one step per keydown (arrows + WASD). Capture arrows so the page
    // doesn't scroll.
    const kb = this.input.keyboard!;
    kb.addCapture(["UP", "DOWN", "LEFT", "RIGHT", "W", "A", "S", "D"]);
    kb.on("keydown", (event: KeyboardEvent) => this.onKey(event));
  }

  private onKey(event: KeyboardEvent) {
    let dx = 0;
    let dy = 0;
    switch (event.code) {
      case "ArrowLeft":
      case "KeyA":
        dx = -1;
        break;
      case "ArrowRight":
      case "KeyD":
        dx = 1;
        break;
      case "ArrowUp":
      case "KeyW":
        dy = -1;
        break;
      case "ArrowDown":
      case "KeyS":
        dy = 1;
        break;
      default:
        return;
    }
    this.tryMove(dx, dy);
  }

  private tryMove(dx: number, dy: number) {
    const now = this.time.now;
    if (now < this.moveLockedUntil) return;

    const nx = this.tileX + dx;
    const ny = this.tileY + dy;
    if (!isWalkable(mainRoom, nx, ny)) {
      this.moveLockedUntil = now + 100;
      return;
    }

    this.tileX = nx;
    this.tileY = ny;
    const ts = mainRoom.tileSize;
    this.scribbs.setPosition(nx * ts + ts / 2, ny * ts + ts / 2);
    this.moveLockedUntil = now + 120;

    this.checkInteraction();
  }

  /** Fire a (stub) interaction event when Scribbs steps onto an interaction tile. */
  private checkInteraction() {
    const hit = mainRoom.interactions.find(
      (i) => i.tileX === this.tileX && i.tileY === this.tileY,
    );
    if (hit) {
      if (hit.id !== this.lastInteractionId) {
        this.lastInteractionId = hit.id;
        // v0 stub. Real behaviour comes later (e.g. racks open the AWGE-style
        // shopping interface; stairs trigger the basement fade transition).
        console.log(`[SCRIPTS] interaction: ${hit.type} (${hit.id})`);
        this.game.events.emit("interaction", hit);
      }
    } else {
      this.lastInteractionId = null;
    }
  }
}
