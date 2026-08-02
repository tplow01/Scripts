/** Material recipes for the SCR!PTS console — the ONLY place shell colours live. */

/** Flat shell body in the brand neutral grey. One fill, no gradients, no creases. */
export const SHELL_BODY = '#6F6F73'

/** Wordmark strip and flat printed labels/icons. */
export const STRIP_BLACK = '#0D0D0D'
export const WORDMARK_PINK = '#FF8AC7'

/** Matte rubber — A/B buttons and D-pad. Light only from above. */
export const RUBBER_FACE = 'radial-gradient(circle at 36% 28%, #2e2e31 0%, #1b1b1e 55%, #101012 100%)'
export const RUBBER_SHADOW =
  '0 4px 6px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.1), inset 0 3px 4px rgba(255,255,255,0.12), inset 0 -5px 8px rgba(0,0,0,0.6)'

/** DMG utility pill — small blank molded pill, label printed on the shell beside/below it. */
export const DMG_PILL_FACE = 'radial-gradient(ellipse at 38% 25%, #3a3a3e 0%, #141416 100%)'
export const DMG_PILL_SHADOW =
  '0 2px 3px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.08), inset 0 1px 2px rgba(255,255,255,0.15), inset 0 -2px 3px rgba(0,0,0,0.6)'

/** Glass sheen swept across the LCD's top corner. */
export const SCREEN_GLASS =
  'linear-gradient(115deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.05) 18%, transparent 30%)'

/** Press feedback: the control sinks and its drop shadow tightens. */
export function pressedStyle(baseShadow: string): { transform: string; boxShadow: string } {
  return {
    transform: 'translateY(2px)',
    boxShadow: baseShadow.replace(/0 [234]px [3456]px/, '0 1px 2px'),
  }
}
