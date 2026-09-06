'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createUISFX } from 'uisfx'
import type { CueName, PackName, PlayOptions, PlayingSFX, UISFXPlayer } from 'uisfx'
import { attachHoverListener, attachUnlockListeners, createSFXController, type SFXController } from '@/lib/sfxController'

/**
 * BRAND.md draws one seam through the whole product: the game world speaks
 * plain, warm, retro-game Pokémon; the shopping interface speaks high-fashion
 * AWGE editorial. Sound follows the same seam.
 *
 * `studio` ("Tactile editing precision with warm cinematic restraint") is the
 * shop default — it matches the restrained, monochrome-plus-accent editorial
 * language far better than arcade's cheerful pixel voltage (right for the
 * Phaser world, wrong for a $44 checkout) or glass/cinematic's cold-luxury
 * and overdramatic registers.
 *
 * `arcade` ("Chunky pixels and cheerful voltage") is the game-world pack —
 * the literal, best-for-games match for the Pokémon-style overworld. The
 * game route switches to it on mount and restores `studio` on unmount, via
 * `setPack`.
 */
export const SHOP_PACK: PackName = 'studio'
export const GAME_PACK: PackName = 'arcade'
const PREFS_KEY = 'scripts:sound'

/**
 * Master switch — sound is turned off site-wide by request ("too many
 * noises"). Every cue call site, the pack choice, and the whole lifecycle
 * (unlock/loop/mute) are untouched; see docs/sound-map.md for the full cue
 * inventory this currently silences. Flip to `true` to bring it all back
 * with no other changes needed anywhere else in the app.
 */
export const SFX_LIVE = false

interface SFXContextValue {
  play: (cue: CueName, options?: PlayOptions) => PlayingSFX | null
  playOutcome: (cue: CueName, options?: PlayOptions) => PlayingSFX | null
  playLoop: (cue: CueName, options?: PlayOptions) => PlayingSFX | null
  enabled: boolean
  setEnabled: (value: boolean) => void
  volume: number
  setVolume: (value: number) => void
  setPack: (pack: PackName) => void
}

const SFXContext = createContext<SFXContextValue | null>(null)

export function SFXProvider({ children }: { children: React.ReactNode }) {
  const playerRef = useRef<UISFXPlayer | null>(null)
  const controllerRef = useRef<SFXController | null>(null)
  const [enabled, setEnabledState] = useState(true)
  const [volume, setVolumeState] = useState(0.7)

  useEffect(() => {
    if (!SFX_LIVE) return
    if (!playerRef.current) {
      const player = createUISFX({
        pack: SHOP_PACK,
        volume: 0.7,
        preferences: { key: PREFS_KEY },
      })
      // Pack is route-driven (shop vs. game), not a durable preference — the
      // persisted `preferences` key covers volume/enabled, but a stale
      // "arcade" pack (persisted from a prior game-route visit) must never
      // leak into a cold load that lands directly on a shop page.
      player.setPack(SHOP_PACK)
      playerRef.current = player
      controllerRef.current = createSFXController(player)
      setEnabledState(player.isEnabled())
      setVolumeState(player.getVolume())
    }
    // Re-attached on every effect run (including Strict Mode's extra
    // mount/cleanup pass) rather than gated behind the player-creation
    // guard above, so the listeners always end up live exactly once.
    const controller = controllerRef.current!
    const removeUnlock = attachUnlockListeners(window, controller)
    const removeHover = attachHoverListener(window, controller)
    return () => {
      removeUnlock()
      removeHover()
    }
  }, [])

  const play = useCallback<SFXContextValue['play']>(
    (cue, options) => controllerRef.current?.play(cue, options) ?? null,
    []
  )
  const playOutcome = useCallback<SFXContextValue['playOutcome']>(
    (cue, options) => controllerRef.current?.playOutcome(cue, options) ?? null,
    []
  )
  const playLoop = useCallback<SFXContextValue['playLoop']>(
    (cue, options) => controllerRef.current?.playLoop(cue, options) ?? null,
    []
  )

  const setEnabled = useCallback((value: boolean) => {
    controllerRef.current?.setEnabled(value)
    setEnabledState(value)
  }, [])

  const setVolume = useCallback((value: number) => {
    playerRef.current?.setVolume(value)
    setVolumeState(value)
  }, [])

  const setPack = useCallback((pack: PackName) => {
    playerRef.current?.setPack(pack)
  }, [])

  return (
    <SFXContext.Provider value={{ play, playOutcome, playLoop, enabled, setEnabled, volume, setVolume, setPack }}>
      {children}
    </SFXContext.Provider>
  )
}

export function useSFX() {
  const ctx = useContext(SFXContext)
  if (!ctx) throw new Error('useSFX must be used within SFXProvider')
  return ctx
}
