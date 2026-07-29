/** Material recipes for the SCR!PTS console — the ONLY place shell colours live. */

/** Molded ink plastic body. */
export const INK_BODY = 'linear-gradient(175deg, #303034 0%, #232327 45%, #17171a 100%)'

/** Soft molded creases + bottom vignette, layered over INK_BODY. */
export const INK_CREASES = `
  linear-gradient(90deg, rgba(255,255,255,0.09) 0%, transparent 6%, transparent 94%, rgba(0,0,0,0.3) 100%),
  linear-gradient(180deg, rgba(255,255,255,0.07) 0%, transparent 12%),
  radial-gradient(ellipse at 50% 120%, rgba(0,0,0,0.25), transparent 60%)
`

/** Matte rubber — B button, D-pad lobes. Light only from above. */
export const RUBBER_FACE = 'radial-gradient(circle at 36% 28%, #2e2e31 0%, #1b1b1e 55%, #101012 100%)'
export const RUBBER_SHADOW =
  '0 4px 6px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.1), inset 0 3px 4px rgba(255,255,255,0.12), inset 0 -5px 8px rgba(0,0,0,0.6)'

/** The A button — the only pink control on the console. */
export const PINK_FACE = 'radial-gradient(circle at 36% 28%, #FF9ECF 0%, #FF4FA3 60%, #E23F90 100%)'
export const PINK_SHADOW =
  '0 4px 6px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.15), inset 0 3px 4px rgba(255,255,255,0.3), inset 0 -5px 8px rgba(178,42,110,0.65)'

/** Engraved utility pill. */
export const PILL_FACE = 'radial-gradient(ellipse at 38% 25%, #454549 0%, #1a1a1d 60%, #0d0d0f 100%)'
export const PILL_SHADOW =
  '0 3px 5px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.08), inset 0 2px 3px rgba(255,255,255,0.18), inset 0 -3px 4px rgba(0,0,0,0.6)'

/** Glass sheen swept across the LCD's top corner. */
export const SCREEN_GLASS =
  'linear-gradient(115deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.05) 18%, transparent 30%)'

export const WORDMARK_PINK = '#FF8AC7'

/** Press feedback: the control sinks and its drop shadow tightens. */
export function pressedStyle(baseShadow: string): { transform: string; boxShadow: string } {
  return {
    transform: 'translateY(2px)',
    boxShadow: baseShadow.replace(/0 [34]px [56]px/, '0 1px 2px'),
  }
}
