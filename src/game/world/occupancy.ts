/**
 * Who claims which tile.
 *
 * Movement is tweened over a few hundred milliseconds, but an actor's logical
 * tile only updates when the tween lands. So for the whole of a step an actor
 * still reports the tile it is *leaving*, and nothing at all reports the tile it
 * is *entering*.
 *
 * That gap is what let characters walk through each other: two actors could
 * each check a destination, both find it unclaimed, and both walk onto it. They
 * end up on the same tile and appear to phase through one another. It only
 * showed up when something else was moving at the same time, because the window
 * is exactly one step long.
 *
 * The fix is to claim the destination for the duration of the step. An actor
 * mid-stride holds two tiles — the one it is leaving and the one it is entering
 * — and releases the first when it lands.
 */

export interface TileClaim {
  tileX: number;
  tileY: number;
  /** Where a step in flight is headed; null when standing still. */
  pending: { x: number; y: number } | null;
}

/** True when this actor holds (x, y) — standing on it, or walking onto it. */
export function claims(actor: TileClaim, x: number, y: number): boolean {
  if (actor.tileX === x && actor.tileY === y) return true;
  return actor.pending !== null && actor.pending.x === x && actor.pending.y === y;
}

/**
 * True when anyone in `actors` holds (x, y). `except` skips the actor doing the
 * asking, which always holds its own tile.
 */
export function anyClaims(
  actors: readonly TileClaim[],
  x: number,
  y: number,
  except?: TileClaim,
): boolean {
  return actors.some((a) => a !== except && claims(a, x, y));
}
