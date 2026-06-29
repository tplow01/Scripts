import * as Phaser from "phaser";
import { getRoom, startRoomId, isWalkableIn } from "@/game/world/rooms";
import { resolveTextureKey, SHADOW_KEY } from "@/game/art/registry";
import { wallVariant } from "@/game/art/wallVariant";
import { footprint } from "@/game/world/types";
import type { Interaction, Decoration, Room } from "@/game/world/types";

type Facing = "down" | "up" | "side";

const FADE_MS = 260;
const DOOR_WALK_TILES = 3;
const STEP_MS = 130;

/**
 * Renders the current room from world data + baked pixel-art textures, drives
 * Scribbs around a tile grid with the camera following, and handles room-to-room
 * transitions (the Shop ↔ Basement staircase) via a camera fade.
 *
 * The current room is an instance field, not a module import, so the same scene
 * renders any room in the registry. Movement glides one tile per press for a
 * classic Pokémon-overworld feel; pixel data lives entirely in the art registry.
 */
export class WorldScene extends Phaser.Scene {
  private room!: Room;
  private scribbs!: Phaser.GameObjects.Image;
  private scribbsShadow!: Phaser.GameObjects.Image;
  private tileX = 0;
  private tileY = 0;
  private moving = false;
  private transitioning = false;
  private introPlayed = false;
  private facing: Facing = "down";
  private stepToggle = false;
  private lastInteractionId: string | null = null;

  /** Everything drawn for the current room; destroyed on each room load. */
  private roomObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super("world");
  }

  create(data?: { roomId?: string }) {
    // Scribbs + shadow persist across rooms (so camera-follow stays valid).
    this.scribbsShadow = this.add.image(0, 0, SHADOW_KEY).setDepth(9);
    this.scribbs = this.add.image(0, 0, "scribbs-down-a").setDepth(10);
    this.cameras.main.setBackgroundColor("#1C1A22");
    this.cameras.main.roundPixels = true;
    this.cameras.main.startFollow(this.scribbs, true, 0.18, 0.18);
    this.scale.on("resize", this.updateZoom, this);

    const kb = this.input.keyboard!;
    kb.addCapture(["UP", "DOWN", "LEFT", "RIGHT", "W", "A", "S", "D", "Z", "SPACE", "ENTER"]);
    kb.on("keydown", (event: KeyboardEvent) => this.onKey(event));

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", this.updateZoom, this);
    });

    const roomId = data?.roomId ?? startRoomId;
    this.loadRoom(roomId);

    // First entry into the shop: walk in through the doors before input.
    if (roomId === startRoomId && !this.introPlayed) {
      this.introPlayed = true;
      this.playDoorIntro();
    }
  }

  /** Swap to a room: clear the old art, redraw, reposition Scribbs + camera. */
  private loadRoom(roomId: string, spawnOverride?: { tileX: number; tileY: number }) {
    this.room = getRoom(roomId);
    this.roomObjects.forEach((o) => o.destroy());
    this.roomObjects = [];

    // Floor + walls (walls pick a cap/side/base variant for FireRed depth).
    for (let y = 0; y < this.room.height; y++) {
      for (let x = 0; x < this.room.width; x++) {
        const isWall = this.room.tiles[y][x] === "wall";
        const key = isWall ? wallVariant(this.room, x, y) : "floor";
        this.placeTile(resolveTextureKey(key), x, y, 0);
      }
    }

    // Decorations: flat floor art sits low, wall art mounts on the wall, solid
    // obstacles stand with a contact shadow.
    const flatFloor = new Set(["emblem", "rug", "mat"]);
    const onWall = new Set(["poster", "window"]);
    for (const deco of this.room.decorations ?? []) {
      if (deco.artKey === "emblem") this.placeProp(deco, 0.4, false);
      else if (flatFloor.has(deco.artKey)) this.placeProp(deco, 0.6, false);
      else if (onWall.has(deco.artKey)) this.placeProp(deco, 1, false);
      else this.placeProp(deco, 2, !!deco.solid);
    }

    // Interactions: stairs lie on the floor, posters mount on the wall, the rest
    // are standing fixtures with a shadow.
    for (const it of this.room.interactions) {
      if (it.type === "stairs") this.placeProp(it, 0.5, false);
      else if (it.type === "poster") this.placeProp(it, 1, false);
      else this.placeProp(it, 2, true);
    }

    // Optional ambient darkening overlay (Basement) — above props, below Scribbs.
    if (this.room.ambient) {
      const ts = this.room.tileSize;
      const overlay = this.add
        .rectangle(0, 0, this.room.width * ts, this.room.height * ts, this.room.ambient.color, this.room.ambient.alpha)
        .setOrigin(0, 0)
        .setDepth(5);
      this.roomObjects.push(overlay);
    }

    // Place Scribbs at the spawn (override wins, else the room default).
    const spawn = spawnOverride ?? this.room.spawn;
    this.tileX = spawn.tileX;
    this.tileY = spawn.tileY;
    this.syncScribbs();

    this.cameras.main.setBounds(0, 0, this.room.width * this.room.tileSize, this.room.height * this.room.tileSize);
    this.updateZoom();
    this.lastInteractionId = null;
  }

  /** Snap Scribbs + shadow to the current tile. */
  private syncScribbs() {
    const ts = this.room.tileSize;
    this.scribbs.setPosition(this.tileX * ts + ts / 2, this.tileY * ts + ts / 2).setDisplaySize(ts, ts);
    this.scribbsShadow
      .setPosition(this.tileX * ts + ts / 2, this.tileY * ts + ts / 2 + ts * 0.28)
      .setDisplaySize(ts * 0.7, ts * 0.35);
  }

  /** Place a 16px texture at a tile centre, scaled to the tile size. */
  private placeTile(textureKey: string, tileX: number, tileY: number, depth: number) {
    const ts = this.room.tileSize;
    const img = this.add
      .image(tileX * ts + ts / 2, tileY * ts + ts / 2, textureKey)
      .setDisplaySize(ts, ts)
      .setDepth(depth);
    this.roomObjects.push(img);
  }

  /** Place a prop honouring its footprint; solid props get a contact shadow. */
  private placeProp(p: Interaction | Decoration, depth: number, withShadow: boolean) {
    const ts = this.room.tileSize;
    const w = p.wTiles ?? 1;
    const h = p.hTiles ?? 1;
    const cx = p.tileX * ts + (w * ts) / 2;
    const cy = p.tileY * ts + (h * ts) / 2;
    if (withShadow) {
      const sh = this.add
        .image(cx, p.tileY * ts + h * ts - ts * 0.16, SHADOW_KEY)
        .setDisplaySize(w * ts * 0.82, ts * 0.32)
        .setDepth(1.5);
      this.roomObjects.push(sh);
    }
    const img = this.add
      .image(cx, cy, resolveTextureKey(p.artKey))
      .setDisplaySize(w * ts, h * ts)
      .setDepth(depth);
    this.roomObjects.push(img);
  }

  /** Cover the viewport with the room and keep pixels crisp (integer zoom). */
  private updateZoom = () => {
    const ts = this.room.tileSize;
    const worldW = this.room.width * ts;
    const worldH = this.room.height * ts;
    const { width, height } = this.scale.gameSize;
    const zoom = Math.max(2, Math.ceil(Math.max(width / worldW, height / worldH)));
    this.cameras.main.setZoom(zoom);
  };

  /** Auto-walk Scribbs up through the entrance doors, then unlock input. */
  private playDoorIntro() {
    this.transitioning = true;
    this.facing = "up";
    let steps = 0;
    const stepUp = () => {
      if (steps >= DOOR_WALK_TILES || !isWalkableIn(this.room, this.tileX, this.tileY - 1)) {
        this.setFrame(false);
        this.transitioning = false;
        return;
      }
      this.stepToggle = !this.stepToggle;
      this.setFrame(this.stepToggle);
      this.tileY -= 1;
      this.syncScribbs();
      steps += 1;
      this.time.delayedCall(STEP_MS, stepUp);
    };
    this.time.delayedCall(STEP_MS, stepUp);
  }

  private onKey(event: KeyboardEvent) {
    if (this.transitioning) return;
    if (event.code === "KeyZ" || event.code === "Space" || event.code === "Enter") {
      this.interactAhead();
      return;
    }
    let dx = 0;
    let dy = 0;
    let facing: Facing = this.facing;
    let flip = this.scribbs.flipX;
    switch (event.code) {
      case "ArrowLeft":
      case "KeyA":
        dx = -1;
        facing = "side";
        flip = true;
        break;
      case "ArrowRight":
      case "KeyD":
        dx = 1;
        facing = "side";
        flip = false;
        break;
      case "ArrowUp":
      case "KeyW":
        dy = -1;
        facing = "up";
        flip = false;
        break;
      case "ArrowDown":
      case "KeyS":
        dy = 1;
        facing = "down";
        flip = false;
        break;
      default:
        return;
    }
    this.facing = facing;
    this.scribbs.setFlipX(flip);
    this.tryMove(dx, dy);
  }

  private tryMove(dx: number, dy: number) {
    if (this.moving || this.transitioning) return;

    const nx = this.tileX + dx;
    const ny = this.tileY + dy;

    if (!isWalkableIn(this.room, nx, ny)) {
      this.setFrame(false); // turn-in-place
      return;
    }

    this.moving = true;
    this.stepToggle = !this.stepToggle;
    this.setFrame(this.stepToggle);

    const ts = this.room.tileSize;
    this.tweens.add({
      targets: this.scribbsShadow,
      x: nx * ts + ts / 2,
      y: ny * ts + ts / 2 + ts * 0.28,
      duration: 120,
      ease: "Linear",
    });
    this.tweens.add({
      targets: this.scribbs,
      x: nx * ts + ts / 2,
      y: ny * ts + ts / 2,
      duration: 120,
      ease: "Linear",
      onComplete: () => {
        this.tileX = nx;
        this.tileY = ny;
        this.moving = false;
        this.setFrame(false);
        this.checkInteraction();
      },
    });
  }

  /** Pick the texture for the current facing + walk phase. */
  private setFrame(stepping: boolean) {
    const phase = stepping ? "b" : "a";
    this.scribbs.setTexture(`scribbs-${this.facing}-${phase}`);
  }

  /** Step onto an interaction tile: transition (stairs) or fire a stub event. */
  private checkInteraction() {
    const hit = this.room.interactions.find((i) =>
      footprint(i).some((t) => t.x === this.tileX && t.y === this.tileY),
    );
    if (!hit) {
      this.lastInteractionId = null;
      return;
    }
    if (hit.id === this.lastInteractionId) return;
    this.lastInteractionId = hit.id;

    if (hit.target) {
      this.startTransition(hit);
      return;
    }
    this.fireInteraction(hit);
  }

  /** Z/Space/Enter: interact with the solid fixture Scribbs is facing. */
  private interactAhead() {
    if (this.moving) return;
    let dx = 0;
    let dy = 0;
    if (this.facing === "down") dy = 1;
    else if (this.facing === "up") dy = -1;
    else dx = this.scribbs.flipX ? -1 : 1;
    const fx = this.tileX + dx;
    const fy = this.tileY + dy;
    const hit = this.room.interactions.find((i) =>
      footprint(i).some((t) => t.x === fx && t.y === fy),
    );
    if (hit && !hit.target) this.fireInteraction(hit);
  }

  /** Move to another room, fading the camera (or instantly). */
  private startTransition(hit: Interaction) {
    const target = hit.target!;
    const go = () => this.loadRoom(target.roomId, target.spawn);

    if (hit.transition === "instant") {
      go();
      return;
    }
    this.transitioning = true;
    const cam = this.cameras.main;
    cam.fadeOut(FADE_MS);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      go();
      cam.fadeIn(FADE_MS);
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, () => {
        this.transitioning = false;
      });
    });
  }

  /** v0 stub — log + emit. Real behaviour (inventory/cart, NPC dialogue, music)
   * is wired in a later pass. */
  private fireInteraction(hit: Interaction) {
    console.log(`[SCRIPTS] interaction: ${hit.type} (${hit.id})`);
    this.game.events.emit("interaction", hit);
  }
}
