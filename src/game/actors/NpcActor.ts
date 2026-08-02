import * as Phaser from "phaser";
import { WalkCycle, TILE_STEP_MS, STRIDE_HOLD } from "@/game/art/walkCycle";
import { characterFrame, type CharacterId, type Facing } from "@/game/art/characters";
import type { Patrol } from "@/game/world/types";

/** ms per tile for NPCs — deliberately lazier than the player's walk. */
const NPC_STEP_MS = TILE_STEP_MS + 130;
const NPC_PAUSE_MS = 1400;

export interface NpcActorOptions {
  /** Interaction id — the dialogue key this NPC answers to. */
  id: string;
  character: CharacterId;
  patrol: Patrol;
  tileSize: number;
  /** Character art is drawn taller than one tile (see WorldScene). */
  heightTiles: number;
  depth: number;
  shadowKey: string;
}

/**
 * A character that walks a hand-authored route around the shop.
 *
 * Owns its own position and sprite, and shares the player's `WalkCycle`, so
 * NPCs animate on exactly the same FireRed rules — one stride held per tile,
 * neutral only when standing still.
 *
 * Blocking is cooperative: the scene supplies `canEnter`, and the actor simply
 * holds position and retries when the next tile is taken (by the player or
 * another NPC) rather than clipping through.
 */
export class NpcActor {
  readonly id: string;
  readonly character: CharacterId;
  tileX: number;
  tileY: number;
  facing: Facing;

  private readonly waypoints: Array<{ x: number; y: number }>;
  private readonly stepMs: number;
  private readonly pauseMs: number;
  private readonly restFacing?: Facing;
  private readonly cycle = new WalkCycle();
  private readonly image: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly scene: Phaser.Scene;
  private readonly tileSize: number;

  /** Index of the waypoint we're heading toward, and the direction of travel. */
  private target = 1;
  private stride = 1;
  private moving = false;
  /** Wall-clock ms before which the actor stays put (endpoint pause). */
  private holdUntil = 0;
  /** True while dialogue with this NPC is open. */
  private suspended = false;

  constructor(scene: Phaser.Scene, opts: NpcActorOptions) {
    this.scene = scene;
    this.id = opts.id;
    this.character = opts.character;
    this.tileSize = opts.tileSize;
    this.waypoints = opts.patrol.waypoints;
    this.stepMs = opts.patrol.stepMs ?? NPC_STEP_MS;
    this.pauseMs = opts.patrol.pauseMs ?? NPC_PAUSE_MS;
    this.restFacing = opts.patrol.restFacing;

    const start = this.waypoints[0];
    this.tileX = start.x;
    this.tileY = start.y;
    this.facing = this.restFacing ?? "down";

    const ts = this.tileSize;
    this.shadow = scene.add
      .image(0, 0, opts.shadowKey)
      .setDisplaySize(ts * 0.72, ts * 0.24)
      .setDepth(opts.depth - 0.5);
    this.image = scene.add
      .image(0, 0, characterFrame(this.character, this.facing, "both"))
      .setOrigin(0.5, 1)
      .setDisplaySize(ts, ts * opts.heightTiles)
      .setDepth(opts.depth);
    this.sync();
  }

  /** Everything this actor drew, so the scene can destroy it on room change. */
  get objects(): Phaser.GameObjects.GameObject[] {
    return [this.shadow, this.image];
  }

  /** Freeze the patrol while the player is talking to this NPC. */
  suspend(): void {
    this.suspended = true;
  }

  /** Resume patrolling, after a beat so they don't march off mid-goodbye. */
  resume(now: number): void {
    this.suspended = false;
    this.holdUntil = now + this.pauseMs;
  }

  /** Face the given tile (used when the player starts a conversation). */
  faceTile(x: number, y: number): void {
    const dx = x - this.tileX;
    const dy = y - this.tileY;
    if (dx === 0 && dy === 0) return;
    this.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
    this.setFrame(this.cycle.rest());
  }

  /**
   * Advance the patrol. `canEnter` reports whether a tile is free right now —
   * the scene owns that knowledge (walls, fixtures, the player, other NPCs).
   */
  update(now: number, canEnter: (x: number, y: number) => boolean): void {
    if (this.moving || this.suspended || now < this.holdUntil) return;

    const next = this.waypoints[this.target];
    if (!next) return;

    if (!canEnter(next.x, next.y)) {
      // Blocked: stand still and try again shortly rather than clipping through.
      this.setFrame(this.cycle.rest());
      this.holdUntil = now + this.stepMs;
      return;
    }

    const dx = next.x - this.tileX;
    const dy = next.y - this.tileY;
    this.facing = dx > 0 ? "right" : dx < 0 ? "left" : dy > 0 ? "down" : "up";
    this.moving = true;
    // One tile, one full step: stride, then settle onto neutral partway through.
    // The image check matters because a room change destroys the actor's sprite
    // while this timer is still pending.
    this.setFrame(this.cycle.step());
    this.scene.time.delayedCall(this.stepMs * STRIDE_HOLD, () => {
      if (this.moving && this.image.active) this.setFrame(this.cycle.rest());
    });

    const ts = this.tileSize;
    const toX = next.x * ts + ts / 2;
    const toY = (next.y + 1) * ts;
    this.scene.tweens.add({
      targets: this.shadow,
      x: toX,
      y: toY - ts * 0.08,
      duration: this.stepMs,
      ease: "Linear",
    });
    this.scene.tweens.add({
      targets: this.image,
      x: toX,
      y: toY,
      duration: this.stepMs,
      ease: "Linear",
      onComplete: () => {
        this.tileX = next.x;
        this.tileY = next.y;
        this.moving = false;
        // Time the endpoint pause from when the step LANDS, not when it began.
        this.advanceTarget(this.scene.time.now);
      },
    });
  }

  /** Step the route index on, ping-ponging (and pausing) at each end. */
  private advanceTarget(now: number): void {
    const atEnd = this.target === this.waypoints.length - 1 || this.target === 0;
    if (atEnd) {
      this.stride = this.target === 0 ? 1 : -1;
      this.holdUntil = now + this.pauseMs;
      this.setFrame(this.cycle.rest());
      if (this.restFacing) {
        this.facing = this.restFacing;
        this.setFrame(this.cycle.rest());
      }
    }
    this.target += this.stride;
  }

  private setFrame(foot: "left" | "both" | "right"): void {
    this.image.setTexture(characterFrame(this.character, this.facing, foot));
  }

  private sync(): void {
    const ts = this.tileSize;
    const x = this.tileX * ts + ts / 2;
    const y = (this.tileY + 1) * ts;
    this.image.setPosition(x, y);
    this.shadow.setPosition(x, y - ts * 0.08);
  }
}
