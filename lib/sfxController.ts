import type { CueName, PlayOptions, PlayingSFX, UISFXPlayer } from 'uisfx'

export interface SFXController {
  /** Direct-gesture one-shot. Always attempts to play and marks audio unlocked. */
  play: (cue: CueName, options?: PlayOptions) => PlayingSFX | null
  /** Post-await outcome. No-ops until a real gesture has unlocked audio. */
  playOutcome: (cue: CueName, options?: PlayOptions) => PlayingSFX | null
  /** Retained loop cue. No-ops until unlocked; tracks the handle for a global stop. */
  playLoop: (cue: CueName, options?: PlayOptions) => PlayingSFX | null
  /** Resume the underlying AudioContext from a trusted gesture, once. */
  markUnlocked: () => void
  isUnlocked: () => boolean
  /** Stops every retained loop before disabling, so mute is immediate. */
  setEnabled: (value: boolean) => void
  activeLoopCount: () => number
}

/**
 * Pure lifecycle wrapper around a uisfx UISFXPlayer: gates async/background
 * cues on a real user gesture, and tracks loop handles so a mute can kill
 * every active loop at once. Kept free of React so it can be unit tested
 * directly against a mocked player.
 */
export function createSFXController(player: UISFXPlayer): SFXController {
  let unlocked = false
  const loops = new Set<PlayingSFX>()

  function markUnlocked() {
    if (unlocked) return
    unlocked = true
    void player.unlock()
  }

  function play(cue: CueName, options?: PlayOptions) {
    // A direct-gesture call is itself a trusted user action.
    unlocked = true
    return player.play(cue, options)
  }

  function playOutcome(cue: CueName, options?: PlayOptions) {
    if (!unlocked) return null
    return player.play(cue, options)
  }

  function playLoop(cue: CueName, options?: PlayOptions) {
    if (!unlocked) return null
    const handle = player.play(cue, options)
    if (handle) {
      loops.add(handle)
      handle.ended.finally(() => loops.delete(handle)).catch(() => {})
    }
    return handle
  }

  function setEnabled(value: boolean) {
    if (!value) {
      // Mute must be immediate: kill every retained loop before disabling.
      for (const handle of loops) handle.stop()
      loops.clear()
      player.stopAll()
      player.setEnabled(false)
      return
    }
    player.setEnabled(true)
    unlocked = true
    player.play('toggle-on')
  }

  return {
    play,
    playOutcome,
    playLoop,
    markUnlocked,
    isUnlocked: () => unlocked,
    setEnabled,
    activeLoopCount: () => loops.size,
  }
}

/**
 * Wires the "first trusted pointer or keyboard gesture unlocks audio" rule
 * onto a real event target. Pure DOM wiring (no React) so pointer/keyboard
 * dedup and listener cleanup are unit-testable directly.
 *
 * Returns a cleanup function that removes both listeners — safe to call
 * unconditionally (including from a React effect's own cleanup, or twice
 * under Strict Mode's mount/cleanup/mount cycle).
 */
export function attachUnlockListeners(
  target: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>,
  controller: Pick<SFXController, 'isUnlocked' | 'markUnlocked'>
): () => void {
  function unlock() {
    if (controller.isUnlocked()) return
    controller.markUnlocked()
    target.removeEventListener('pointerdown', unlock)
    target.removeEventListener('keydown', unlock)
  }

  if (!controller.isUnlocked()) {
    target.addEventListener('pointerdown', unlock)
    target.addEventListener('keydown', unlock)
  }

  return () => {
    target.removeEventListener('pointerdown', unlock)
    target.removeEventListener('keydown', unlock)
  }
}

/**
 * Delegated "hover a button, hear the hover cue" wiring — one listener
 * covers every `<button>` on the page instead of wiring `onPointerEnter` by
 * hand into dozens of components, so the behaviour stays uniform by
 * construction rather than by remembering to add it everywhere.
 *
 * Fine-pointer only (mirrors uisfx's own "touch skips hover" convention),
 * fires once per genuine enter (uses `relatedTarget` to ignore moves between
 * a button's own child elements, e.g. crossing an inner `<svg>`), skips
 * disabled buttons, and is gated on `playOutcome` — hover is never itself
 * the gesture that unlocks audio, since a bare hover isn't a reliable
 * trusted-activation signal for browser autoplay policy.
 */
export function attachHoverListener(
  target: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>,
  controller: Pick<SFXController, 'playOutcome'>
): () => void {
  function onPointerOver(event: Event) {
    const e = event as PointerEvent
    if (e.pointerType !== 'mouse') return
    if (!(e.target instanceof Element)) return
    const btn = e.target.closest('button:not(:disabled)')
    if (!btn) return
    const related = e.relatedTarget
    if (related instanceof Node && btn.contains(related)) return
    controller.playOutcome('hover')
  }

  target.addEventListener('pointerover', onPointerOver, true)
  return () => target.removeEventListener('pointerover', onPointerOver, true)
}
