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
/**
 * Grime's intro has no beat under it. Putting the record on should feel like
 * the drop, not thirty seconds of dead air, so switching to it jumps straight
 * past the intro. Lofi has no such moment and is never seeked.
 */
const GRIME_DROP_S = 20

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

// Screen-off / app-backgrounded (phone locked, tab switched away) should mute
// the game like leaving the room would — otherwise it keeps looping unheard
// in the background until the player returns. `active` (not `muted`) tracks
// this so resuming doesn't un-mute a player who muted deliberately, and so it
// doesn't fight music.stop()/start() calls made for other reasons (inventory).
let wasActiveBeforeHidden = false
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      wasActiveBeforeHidden = active
      if (active) music.stop()
    } else if (wasActiveBeforeHidden) {
      music.start()
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
    if (t === 'grime') {
      const a = get('grime')
      if (a) a.currentTime = GRIME_DROP_S
    }
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
