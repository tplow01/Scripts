import * as Phaser from "phaser";
import { mainRoom, isWalkable } from "@/game/world/mainRoom";
import { resolveArt } from "@/game/art/registry";

/**
 * Renders the current room from world data + the art registry, and drives
 * Scribbs around a tile grid with the camera following.
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
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<"up" | "down" | "left" | "right", Phaser.Input.Keyboard.Key>;
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

    // Camera: follow Scribbs at a moderate zoom (locked design decision).
    this.cameras.main.setBounds(0, 0, mainRoom.width * ts, mainRoom.height * ts);
    this.cameras.main.startFollow(this.scribbs, true);
    this.cameras.main.setZoom(2);

    // Input: arrow keys + WASD.
    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = {
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
  }

  update(time: number) {
    if (time < this.moveLockedUntil) return;

    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown || this.wasd.left.isDown) dx = -1;
    else if (this.cursors.right.isDown || this.wasd.right.isDown) dx = 1;
    else if (this.cursors.up.isDown || this.wasd.up.isDown) dy = -1;
    else if (this.cursors.down.isDown || this.wasd.down.isDown) dy = 1;

    if (dx === 0 && dy === 0) return;

    const nx = this.tileX + dx;
    const ny = this.tileY + dy;
    if (!isWalkable(mainRoom, nx, ny)) {
      this.moveLockedUntil = time + 120;
      return;
    }

    this.tileX = nx;
    this.tileY = ny;
    const ts = mainRoom.tileSize;
    this.scribbs.setPosition(nx * ts + ts / 2, ny * ts + ts / 2);
    this.moveLockedUntil = time + 140;

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
