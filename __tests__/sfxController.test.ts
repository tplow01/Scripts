import { describe, expect, it, vi } from 'vitest'
import { attachHoverListener, attachUnlockListeners, createSFXController } from '@/lib/sfxController'
import type { CueName, PackName, PlayingSFX, UISFXPlayer } from 'uisfx'

function makePlayer() {
  const calls: { cue: CueName }[] = []
  const stop = vi.fn()

  const player: UISFXPlayer = {
    unlock: vi.fn(async () => true),
    // A fresh handle per call — loop cues (processing, connecting, ...) must
    // be tracked as distinct entries, not collapsed into one Set member.
    play: vi.fn((cue: CueName) => {
      calls.push({ cue })
      const handle: PlayingSFX = { stop, ended: Promise.resolve() }
      return handle
    }),
    preload: vi.fn(async () => {}),
    setPack: vi.fn(),
    getPack: vi.fn((): PackName => 'studio'),
    setVolume: vi.fn(),
    getVolume: vi.fn(() => 0.7),
    setEnabled: vi.fn(),
    isEnabled: vi.fn(() => true),
    stopAll: vi.fn(),
    destroy: vi.fn(async () => {}),
  }

  return { player, calls, stop }
}

describe('createSFXController — unlock gating', () => {
  it('suppresses playOutcome and playLoop before any gesture has unlocked audio', () => {
    const { player, calls } = makePlayer()
    const sfx = createSFXController(player)

    expect(sfx.isUnlocked()).toBe(false)
    expect(sfx.playOutcome('success')).toBeNull()
    expect(sfx.playLoop('processing')).toBeNull()
    expect(calls).toHaveLength(0)
  })

  it('play() unlocks immediately, since it is itself a direct-gesture call', () => {
    const { player, calls } = makePlayer()
    const sfx = createSFXController(player)

    sfx.play('add-to-cart')
    expect(sfx.isUnlocked()).toBe(true)
    expect(calls).toEqual([{ cue: 'add-to-cart' }])
  })

  it('markUnlocked() resumes the player once and is idempotent', () => {
    const { player } = makePlayer()
    const sfx = createSFXController(player)

    sfx.markUnlocked()
    sfx.markUnlocked()
    expect(player.unlock).toHaveBeenCalledTimes(1)
  })

  it('playOutcome and playLoop work once unlocked', () => {
    const { player, calls } = makePlayer()
    const sfx = createSFXController(player)

    sfx.markUnlocked()
    expect(sfx.playOutcome('purchase')).not.toBeNull()
    expect(sfx.playLoop('processing')).not.toBeNull()
    expect(calls.map((c) => c.cue)).toEqual(['purchase', 'processing'])
  })
})

describe('createSFXController — loop lifecycle', () => {
  it('retains a loop handle and reports it as active', () => {
    const { player } = makePlayer()
    const sfx = createSFXController(player)
    sfx.markUnlocked()

    sfx.playLoop('processing')
    expect(sfx.activeLoopCount()).toBe(1)
  })

  it('does not retain a handle when play() returns null (throttled/disabled)', () => {
    const player: UISFXPlayer = {
      unlock: vi.fn(async () => true),
      play: vi.fn(() => null),
      preload: vi.fn(async () => {}),
      setPack: vi.fn(),
      getPack: vi.fn((): PackName => 'studio'),
      setVolume: vi.fn(),
      getVolume: vi.fn(() => 0.7),
      setEnabled: vi.fn(),
      isEnabled: vi.fn(() => true),
      stopAll: vi.fn(),
      destroy: vi.fn(async () => {}),
    }
    const sfx = createSFXController(player)
    sfx.markUnlocked()

    expect(sfx.playLoop('loading')).toBeNull()
    expect(sfx.activeLoopCount()).toBe(0)
  })

  it('setEnabled(false) stops every retained loop, clears them, and calls stopAll', () => {
    const { player, stop } = makePlayer()
    const sfx = createSFXController(player)
    sfx.markUnlocked()

    sfx.playLoop('processing')
    sfx.playLoop('connecting')
    expect(sfx.activeLoopCount()).toBe(2)

    sfx.setEnabled(false)

    expect(stop).toHaveBeenCalledTimes(2)
    expect(sfx.activeLoopCount()).toBe(0)
    expect(player.stopAll).toHaveBeenCalledTimes(1)
    expect(player.setEnabled).toHaveBeenCalledWith(false)
  })

  it('setEnabled(true) re-enables and plays a toggle-on confirmation', () => {
    const { player, calls } = makePlayer()
    const sfx = createSFXController(player)

    sfx.setEnabled(true)

    expect(player.setEnabled).toHaveBeenCalledWith(true)
    expect(sfx.isUnlocked()).toBe(true)
    expect(calls).toEqual([{ cue: 'toggle-on' }])
  })

  it('setEnabled(false) never plays a toggle-off cue — mute is silent and immediate', () => {
    const { player, calls } = makePlayer()
    const sfx = createSFXController(player)
    sfx.markUnlocked()

    sfx.setEnabled(false)

    expect(calls).toHaveLength(0)
  })
})

describe('attachUnlockListeners — pointer/keyboard dedup and cleanup', () => {
  it('unlocks on the first pointerdown and ignores a following keydown', () => {
    const target = document.createElement('div')
    const { player } = makePlayer()
    const sfx = createSFXController(player)
    attachUnlockListeners(target, sfx)

    target.dispatchEvent(new Event('pointerdown'))
    target.dispatchEvent(new Event('keydown'))

    expect(sfx.isUnlocked()).toBe(true)
    expect(player.unlock).toHaveBeenCalledTimes(1)
  })

  it('unlocks on keydown alone when pointerdown never fires', () => {
    const target = document.createElement('div')
    const { player } = makePlayer()
    const sfx = createSFXController(player)
    attachUnlockListeners(target, sfx)

    target.dispatchEvent(new Event('keydown'))

    expect(sfx.isUnlocked()).toBe(true)
    expect(player.unlock).toHaveBeenCalledTimes(1)
  })

  it('does not attach listeners at all when already unlocked', () => {
    const target = document.createElement('div')
    const addSpy = vi.spyOn(target, 'addEventListener')
    const { player } = makePlayer()
    const sfx = createSFXController(player)
    sfx.markUnlocked()

    attachUnlockListeners(target, sfx)

    expect(addSpy).not.toHaveBeenCalled()
  })

  it('cleanup removes both listeners so a later event no longer unlocks', () => {
    const target = document.createElement('div')
    const { player } = makePlayer()
    const sfx = createSFXController(player)
    const cleanup = attachUnlockListeners(target, sfx)

    cleanup()
    target.dispatchEvent(new Event('pointerdown'))

    // The controller itself was never told to unlock — the listener that
    // would have called markUnlocked() was removed before the event fired.
    expect(sfx.isUnlocked()).toBe(false)
    expect(player.unlock).not.toHaveBeenCalled()
  })
})

describe('attachHoverListener — button hover delegation', () => {
  // jsdom has no PointerEvent constructor — MouseEvent supports the same
  // `relatedTarget` option, so a plain property assignment stands in for
  // `pointerType` (the real DOM never needs this trick).
  function pointerOver(opts: { target: Element; relatedTarget?: Node | null; pointerType?: string }) {
    const e = new MouseEvent('pointerover', { bubbles: true, relatedTarget: opts.relatedTarget ?? null })
    Object.defineProperty(e, 'pointerType', { value: opts.pointerType ?? 'mouse' })
    opts.target.dispatchEvent(e)
  }

  it('plays hover once when the mouse enters a button from outside it', () => {
    const target = document.createElement('div')
    const button = document.createElement('button')
    target.appendChild(button)
    const { player, calls } = makePlayer()
    const sfx = createSFXController(player)
    sfx.markUnlocked()
    attachHoverListener(target, sfx)

    pointerOver({ target: button, relatedTarget: target })

    expect(calls).toEqual([{ cue: 'hover' }])
  })

  it('does not re-fire when the pointer moves between a button and its own child', () => {
    const target = document.createElement('div')
    const button = document.createElement('button')
    const icon = document.createElement('span')
    button.appendChild(icon)
    target.appendChild(button)
    const { player, calls } = makePlayer()
    const sfx = createSFXController(player)
    sfx.markUnlocked()
    attachHoverListener(target, sfx)

    pointerOver({ target: button, relatedTarget: target }) // enters the button
    pointerOver({ target: icon, relatedTarget: button }) // moves onto its own child

    expect(calls).toEqual([{ cue: 'hover' }])
  })

  it('ignores touch/pen pointer types', () => {
    const target = document.createElement('div')
    const button = document.createElement('button')
    target.appendChild(button)
    const { player, calls } = makePlayer()
    const sfx = createSFXController(player)
    sfx.markUnlocked()
    attachHoverListener(target, sfx)

    pointerOver({ target: button, relatedTarget: target, pointerType: 'touch' })

    expect(calls).toHaveLength(0)
  })

  it('ignores disabled buttons', () => {
    const target = document.createElement('div')
    const button = document.createElement('button')
    button.disabled = true
    target.appendChild(button)
    const { player, calls } = makePlayer()
    const sfx = createSFXController(player)
    sfx.markUnlocked()
    attachHoverListener(target, sfx)

    pointerOver({ target: button, relatedTarget: target })

    expect(calls).toHaveLength(0)
  })

  it('stays silent until a real gesture has unlocked audio', () => {
    const target = document.createElement('div')
    const button = document.createElement('button')
    target.appendChild(button)
    const { player, calls } = makePlayer()
    const sfx = createSFXController(player)
    attachHoverListener(target, sfx)

    pointerOver({ target: button, relatedTarget: target })

    expect(calls).toHaveLength(0)
  })

  it('cleanup stops future hover events from playing anything', () => {
    const target = document.createElement('div')
    const button = document.createElement('button')
    target.appendChild(button)
    const { player, calls } = makePlayer()
    const sfx = createSFXController(player)
    sfx.markUnlocked()
    const cleanup = attachHoverListener(target, sfx)

    cleanup()
    pointerOver({ target: button, relatedTarget: target })

    expect(calls).toHaveLength(0)
  })
})
