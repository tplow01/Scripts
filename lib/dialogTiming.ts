/** Base delay between revealed characters (ms). */
export const TYPE_BASE_MS = 18;
/** Delay while the confirm button is held — a flat skim through the line (ms). */
export const TYPE_FF_MS = 4;
/** Extra beat after sentence-ending punctuation so lines breathe (ms). */
export const PUNCT_PAUSE_MS = 90;

const PAUSE_CHARS = new Set([".", "!", "?", "…"]);

/**
 * Delay before revealing the next character.
 *
 * @param prev  the character just revealed ("" before the first character)
 * @param next  the character about to be revealed ("" at end of the string)
 * @param held  whether the confirm button is currently held (fast-forward)
 *
 * Held wins outright. Otherwise a sentence-ending mark earns a pause, unless the
 * next character is also one (so "..." and "?!" don't stack pauses mid-run).
 */
export function nextDelay(prev: string, next: string, held: boolean): number {
  if (held) return TYPE_FF_MS;
  if (PAUSE_CHARS.has(prev) && !PAUSE_CHARS.has(next)) {
    return TYPE_BASE_MS + PUNCT_PAUSE_MS;
  }
  return TYPE_BASE_MS;
}
