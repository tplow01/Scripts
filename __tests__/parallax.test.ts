import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  MIRROR_PERIOD,
  PARALLAX_BANDS,
  PARALLAX_TILES,
  bandTileCount,
  bandTileWidth,
  maxCoveredAspect,
  type ParallaxBand,
} from '@/lib/parallax'

const BANDS = Object.values(PARALLAX_BANDS) as ParallaxBand[]

/** Width/height straight out of a PNG's IHDR chunk (bytes 16..24). */
function pngSize(publicPath: string): { width: number; height: number } {
  const buf = readFileSync(join(process.cwd(), 'public', publicPath.replace(/^\//, '')))
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

describe('parallax band descriptors', () => {
  // The component lays each band out from these numbers instead of measuring
  // the decoded bitmap, so a re-export at a different size would skew the band
  // (and, for the mirrored wrap, desync the loop) with nothing else to catch it.
  it.each(BANDS)('$src matches the art on disk', (band) => {
    expect(pngSize(band.src)).toEqual({ width: band.width, height: band.height })
  })

  it('is authored much wider than tall, so one copy overhangs the frame', () => {
    for (const band of BANDS) expect(band.width / band.height).toBeGreaterThan(3)
  })
})

describe('bandTileWidth', () => {
  it('maps the art\'s full height onto the frame and keeps its aspect', () => {
    const band = { width: 6400, height: 1872 }
    expect(bandTileWidth(1872, band)).toBeCloseTo(6400)
    expect(bandTileWidth(936, band)).toBeCloseTo(3200)
    expect(bandTileWidth(400, band)).toBeCloseTo(400 * (6400 / 1872))
  })

  it('returns 0 rather than NaN/Infinity for a frame that has not been laid out', () => {
    expect(bandTileWidth(0, { width: 6400, height: 1872 })).toBe(0)
    expect(bandTileWidth(-10, { width: 6400, height: 1872 })).toBe(0)
    expect(bandTileWidth(400, { width: 6400, height: 0 })).toBe(0)
  })
})

describe('bandTileCount', () => {
  it('leaves MIRROR_PERIOD copies of slack for the loop to slide into', () => {
    // Frame exactly one copy wide: 1 to show + 2 to slide through = 3, evened to 4.
    expect(bandTileCount(1000, 1000)).toBe(4)
    // Frame three copies wide: 3 + 2 = 5, evened to 6.
    expect(bandTileCount(3000, 1000)).toBe(6)
  })

  it('always returns an even count, so the mirror pattern survives the wrap', () => {
    for (let frame = 1; frame <= 4000; frame += 7) {
      expect(bandTileCount(frame, 640) % 2).toBe(0)
    }
  })

  it('falls back to the rendered count when the frame has no size yet', () => {
    expect(bandTileCount(0, 1000)).toBe(PARALLAX_TILES)
    expect(bandTileCount(1000, 0)).toBe(PARALLAX_TILES)
  })
})

describe('coverage: no gap can open up behind the frame', () => {
  // Sweep every frame the three GameBoyShell layouts can plausibly produce —
  // a portrait phone LCD (tall and narrow) through a wide desktop LCD — plus
  // absurd extremes, and assert the strip still reaches past the frame's right
  // edge at the far end of the slide.
  const FRAMES: Array<[number, number]> = []
  for (const w of [200, 320, 375, 414, 700, 1024, 1280, 1920, 2560, 3840]) {
    for (const h of [80, 120, 180, 300, 400, 540, 825, 1200, 1600]) FRAMES.push([w, h])
  }

  it.each(BANDS)('$src stays behind the frame for a whole loop', (band) => {
    for (const [w, h] of FRAMES) {
      const tile = bandTileWidth(h, band)
      const count = bandTileCount(w, tile)
      // At the end of the slide the visible window is [MIRROR_PERIOD·tile, +w].
      expect(count * tile).toBeGreaterThanOrEqual(MIRROR_PERIOD * tile + w)
    }
  })

  it('the fixed PARALLAX_TILES covers every aspect the shell can build', () => {
    // The widest LCD GameBoyShell lays out is the 16:9 desktop screen; the
    // landscape and portrait shells are both squarer than that.
    const widestShellAspect = 16 / 9
    for (const band of BANDS) {
      expect(maxCoveredAspect(band, PARALLAX_TILES)).toBeGreaterThan(widestShellAspect)
      // ...with a lot of room to spare, so an odd window or a future shell
      // tweak can't quietly walk off the end of the strip.
      expect(maxCoveredAspect(band, PARALLAX_TILES)).toBeGreaterThan(6)
    }
  })

  it('PARALLAX_TILES is what bandTileCount asks for at real LCD sizes', () => {
    for (const band of BANDS) {
      for (const [w, h] of [
        [375, 382], // portrait phone LCD
        [688, 348], // landscape phone LCD
        [1225, 825], // desktop 16:9 LCD
        [2276, 1280], // large desktop 16:9 LCD
      ] as Array<[number, number]>) {
        expect(bandTileCount(w, bandTileWidth(h, band))).toBe(PARALLAX_TILES)
      }
    }
  })
})
