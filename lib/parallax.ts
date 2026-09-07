/**
 * Geometry for the title screen's scrolling pixel-art bands.
 *
 * The bands used to be sized by the browser from the PNGs themselves — two
 * `<img height:100% width:auto>` copies inside a `width: max-content` track,
 * slid by `translateX(-50%)`. That made the band's width a *measurement of the
 * decoded bitmap* rather than a layout decision, which broke in three ways the
 * player sees as "the background didn't render":
 *
 *  1. Before the PNG decodes (and forever, if the request fails) an image with
 *     `width: auto` has no intrinsic ratio to derive a width from, so each copy
 *     is 0px wide and the whole band paints nothing — while the scroll
 *     animation is already running against that wrong width.
 *  2. Two copies only cover the frame while `frameHeight × artRatio ≥
 *     frameWidth`. On a short, wide LCD the track is simply narrower than the
 *     frame and the right-hand side of the picture is missing.
 *  3. The track grew with the screen (two copies is ~6.8 × the LCD height),
 *     so on large displays the animated compositing layer got very wide.
 *
 * So the numbers live here instead, derived from each band's authored size, and
 * the component lays the band out from them with `aspect-ratio` — geometry that
 * is correct at first paint and stays correct whether or not the bitmap ever
 * arrives.
 */

/** One scrolling band: its art, that art's authored size, and its drift speed. */
export type ParallaxBand = {
  src: string
  /** Authored pixel width of the PNG. */
  width: number
  /** Authored pixel height of the PNG. */
  height: number
  /** One full loop of the band — farther bands drift slower. */
  duration: string
}

/**
 * The title screen's bands, back to front. Sizes are the authored PNG
 * dimensions; `__tests__/parallax.test.ts` checks them against the files on
 * disk, because a re-export at a different size would silently skew the band.
 */
export const PARALLAX_BANDS = {
  clouds: { src: '/assets/loading/layer-clouds.png', width: 6401, height: 1866, duration: '90s' },
  buildings: { src: '/assets/loading/layer-buildings.png', width: 6400, height: 1872, duration: '34s' },
  road: { src: '/assets/loading/layer-road.png', width: 6400, height: 1872, duration: '13s' },
} as const satisfies Record<string, ParallaxBand>

/**
 * Copies alternate normal / mirrored, so every junction between two copies is a
 * reflection and stays continuous no matter what the art does at its edges.
 * (The bands do NOT tile with themselves — `layer-clouds.png` in particular
 * differs across its own wrap on ~10% of its rows — so butting two identical
 * copies together cut a hard vertical edge through the sky once per loop.)
 * That makes the pattern repeat every two copies, which is how far the track
 * slides before it wraps.
 */
export const MIRROR_PERIOD = 2

/** Width of one copy of a band when its full height is mapped onto `frameHeight`. */
export function bandTileWidth(frameHeight: number, band: Pick<ParallaxBand, 'width' | 'height'>): number {
  if (!(frameHeight > 0) || !(band.height > 0)) return 0
  return (frameHeight * band.width) / band.height
}

/**
 * How many copies a band's track needs to stay full for a whole loop.
 *
 * The track slides left by `MIRROR_PERIOD` copies before wrapping, so at the
 * end of the slide the visible window is `[2·tile, 2·tile + frameWidth]` — the
 * track has to reach at least that far. The count is then rounded up to an even
 * number so the normal/mirrored alternation still lines up after the wrap.
 */
export function bandTileCount(frameWidth: number, tileWidth: number): number {
  if (!(tileWidth > 0) || !(frameWidth > 0)) return PARALLAX_TILES
  const needed = MIRROR_PERIOD + Math.ceil(frameWidth / tileWidth)
  return needed % 2 === 0 ? needed : needed + 1
}

/**
 * The fixed copy count the component renders.
 *
 * Every band is wider than 3.4 × its own height, so four copies keep the frame
 * covered up to an LCD aspect ratio of `2 × 3.4 ≈ 6.8:1` (see
 * `maxCoveredAspect`). The widest thing `GameBoyShell` builds is a 16:9 desktop
 * LCD, so this has ~4× the headroom it needs and there is no reason to measure
 * the frame at runtime.
 */
export const PARALLAX_TILES = 4

/**
 * The widest frame (as `width / height`) that `tiles` copies of `band` still
 * cover for a full loop. Inverse of `bandTileCount`.
 */
export function maxCoveredAspect(band: Pick<ParallaxBand, 'width' | 'height'>, tiles: number): number {
  return (tiles - MIRROR_PERIOD) * (band.width / band.height)
}
