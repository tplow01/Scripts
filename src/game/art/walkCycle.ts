import type { Foot } from "./characters";

/** One tile of walking, FireRed/LeafGreen pace. */
export const TILE_STEP_MS = 250;
/**
 * FireRed turn-in-place: pressing a new direction from a standstill turns the
 * character to face it for this long before the first step. Only a sustained
 * press walks.
 */
export const TURN_MS = 130;
/**
 * Fraction of a tile the stride frame holds before settling onto neutral.
 *
 * This beat is what makes a walk read as stepping. It matters most side-on:
 * the two side stride frames are near-mirror images (legs apart either way),
 * so alternating stride→stride without passing through legs-together looks
 * like a glide. Front and back survive it, but every direction uses the same
 * beat — one rule, not a per-direction special case.
 */
export const STRIDE_HOLD = 0.78;

/**
 * The walk-cycle rule, in one place, shared by the player, every NPC, and the
 * scripted walks.
 *
 * One tile is one full step: the leading stride frame, then the neutral
 * passing pose, with the leading foot alternating from tile to tile. The
 * character rests on neutral whenever it is standing still.
 */
export class WalkCycle {
  /** false → next stride is the right foot, true → the left. */
  private parity = false;
  private current: Foot = "both";

  /** Begin a tile step: the leading stride, held for STRIDE_HOLD of the tile. */
  step(): Foot {
    this.current = this.parity ? "left" : "right";
    this.parity = !this.parity;
    return this.current;
  }

  /**
   * The neutral pose — the passing beat partway through a step, and the frame
   * held at a standstill (input released, blocked, or turning in place).
   * Leaves the foot parity alone, so the next step leads with the other foot.
   */
  rest(): Foot {
    this.current = "both";
    return this.current;
  }

  /** The frame that should be on screen right now. */
  get frame(): Foot {
    return this.current;
  }
}
