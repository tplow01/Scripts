/**
 * Who blocks whom on the grid.
 *
 * Movement is tweened over a few hundred milliseconds, but an actor's logical
 * tile only updates when the tween lands. So mid-step an actor still reports
 * the tile it is leaving, and without help nothing reports the tile it is
 * entering — which let two actors pick the same destination and land on top of
 * each other, appearing to phase through.
 *
 * The rule has to close that hole without making movement sticky. Blocking a
 * tile someone is *leaving* is the tempting shortcut and the wrong one: they
 * are on their way out, so refusing it just stalls everyone for a third of a
 * second every time an NPC walks past. Only three things actually block:
 *
 *   1. Someone is standing there.
 *   2. Someone is walking onto it — the case that caused the phasing.
 *   3. A head-on swap: they are walking onto the tile you are leaving, out of
 *      the tile you want. Allowing that would slide two actors straight
 *      through one another.
 *
 * Anything else is a pass-by, which is how it should feel.
 */

export interface TileClaim {
  tileX: number;
  tileY: number;
  /** Where a step in flight is headed; null when standing still. */
  pending: { x: number; y: number } | null;
}

/**
 * Does `other` block a step from (fromX, fromY) to (toX, toY)?
 */
export function blocks(
  other: TileClaim,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): boolean {
  const standingThere = other.tileX === toX && other.tileY === toY;

  // 1. Standing still, right where we want to go.
  if (!other.pending) return standingThere;

  // 2. Walking onto the same tile we are — the collision that caused phasing.
  if (other.pending.x === toX && other.pending.y === toY) return true;

  // 3. Head-on swap: they are leaving the tile we want, heading into the tile
  //    we are leaving. Two actors trading places pass through each other.
  if (standingThere && other.pending.x === fromX && other.pending.y === fromY) return true;

  // Otherwise they are on their way out of the tile — walk in behind them.
  return false;
}

/** Does anyone block this step? `except` skips the actor doing the asking. */
export function blockedBy(
  actors: readonly TileClaim[],
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  except?: TileClaim,
): boolean {
  return actors.some((a) => a !== except && blocks(a, fromX, fromY, toX, toY));
}

/** Is this actor standing on, or stepping onto or off, (x, y)? Used for interaction. */
export function occupies(actor: TileClaim, x: number, y: number): boolean {
  if (actor.tileX === x && actor.tileY === y) return true;
  return actor.pending !== null && actor.pending.x === x && actor.pending.y === y;
}
