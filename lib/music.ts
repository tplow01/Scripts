/**
 * Background music for the game world.
 *
 * A module-level singleton so the track survives the game remounting (the
 * inventory detour) and the vinyl's switch to grime isn't forgotten. Browsers
 * refuse audio before a user gesture, so `start` is called from the first
 * press and simply retries until playback is allowed.
 */
export type Track = 'lofi' | 'grime'

const SRC: Record<Track, string> = {
  lofi: '/audio/nujabes.mp3',
  grime: '/audio/grime.mp3',
}
const VOLUME = 0.3
const FADE_MS = 900

let audio: Partial<Record<Track, HTMLAudioElement>> = {}
let current: Track = 'lofi'
let muted = false
let active = false

function get(t: Track): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null
  if (!audio[t]) {
    const a = new Audio(SRC[t])
    a.loop = true
    a.preload = 'auto'
    a.volume = 0
    audio[t] = a
  }
  return audio[t]!
}

function fade(a: HTMLAudioElement, to: number, then?: () => void) {
  const from = a.volume
  const t0 = performance.now()
  const step = (now: number) => {
    const k = Math.min(1, (now - t0) / FADE_MS)
    a.volume = Math.max(0, Math.min(1, from + (to - from) * k))
    if (k < 1) requestAnimationFrame(step)
    else then?.()
  }
  requestAnimationFrame(step)
}

function sync() {
  ;(Object.keys(SRC) as Track[]).forEach((t) => {
    // Only build a track once it is wanted, so the grime file is never
    // downloaded by players who never touch the vinyl deck.
    if (!audio[t] && t !== current) return
    const a = get(t)
    if (!a) return
    const shouldPlay = active && !muted && t === current
    if (shouldPlay) {
      a.play().then(() => fade(a, VOLUME)).catch(() => {})
    } else if (!a.paused) {
      fade(a, 0, () => a.pause())
    }
  })
}

export const music = {
  /** Begin (or resume) playback. Safe to call repeatedly. */
  start() {
    active = true
    sync()
  },
  /** Pause everything, e.g. when leaving the game world. */
  stop() {
    active = false
    sync()
  },
  setTrack(t: Track) {
    if (current === t) return
    current = t
    sync()
  },
  setMuted(m: boolean) {
    muted = m
    sync()
  },
  get track() {
    return current
  },
}
