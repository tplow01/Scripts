/**
 * In-memory game session — deliberately NOT persisted.
 *
 * It lives only in the page's JS runtime, so it survives client-side route
 * changes (game → /inventory → back) but is wiped by a full page reload. That
 * gives us exactly the behaviour we want:
 *   • exit inventory/basement  → resume at the exact tile we left from
 *   • hard refresh             → fresh start screen (PRESS START)
 */
export type Facing = "down" | "up" | "side";

export interface GamePos {
  roomId: string;
  tileX: number;
  tileY: number;
  facing: Facing;
  flip: boolean;
}

export const gameSession: {
  playing: boolean;
  pos: GamePos | null;
  /**
   * One-shot world flags that have been triggered this session (e.g. a revealed
   * secret entrance). In-memory like the rest of this object — a hard refresh
   * resets them, re-hiding any secrets.
   */
  revealed: Set<string>;
} = {
  playing: false,
  pos: null,
  revealed: new Set<string>(),
};
