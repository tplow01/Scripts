'use client'

import { Press_Start_2P } from 'next/font/google'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { Btn, UtilityAction } from '@/lib/controls'
import { UTILITY_LABELS } from '@/lib/controls'
import type { ShellLayout } from '@/lib/useShellLayout'
import DPad from './shell/DPad'
import RoundBtn from './shell/RoundBtn'
import SystemOverlay from './shell/SystemOverlay'
import { DmgBtn, FlatIconBtn, QuestionGlyph, SpeakerIcon } from './shell/UtilityBtn'
import { SCREEN_GLASS, SHELL_BODY, STRIP_BLACK, WORDMARK_PINK } from './shell/theme'

export type { Btn }

const pressStart = Press_Start_2P({ weight: '400', subsets: ['latin'], display: 'swap' })

/**
 * LCD with the flat SCR!PTS strip as its bottom band. `framePad` is the black
 * frame shown around the LCD (CSS padding shorthand): desktop frames every
 * edge, landscape only left/right, portrait none — the strip itself is always
 * the bottom border.
 */
function ScreenModule({ children, overlay, stripHeight = 26, framePad = '0', lcdRadius = 0, style = {} }: {
  children: ReactNode; overlay: ReactNode; stripHeight?: number; framePad?: string; lcdRadius?: number; style?: React.CSSProperties
}) {
  // Compute padding with bottom zeroed: convert shorthand to full form
  const computePadding = (pad: string) => {
    const parts = pad.split(' ')
    if (parts.length === 1) return `${parts[0]} ${parts[0]} 0`
    return `${parts[0]} ${parts[1]} 0`
  }
  const padding = computePadding(framePad)
  return (
    <div style={{ background: STRIP_BLACK, display: 'flex', flexDirection: 'column', padding, ...style }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', borderRadius: lcdRadius, background: 'linear-gradient(160deg, #E2E2DE 0%, #D6D6D2 100%)' }}>
        {children}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: SCREEN_GLASS }} />
        {overlay}
      </div>
      <div style={{ height: stripHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span className={pressStart.className} style={{
          fontSize: Math.round(stripHeight * 0.34), color: WORDMARK_PINK, letterSpacing: 5,
          textShadow: '0 0 6px rgba(255,138,199,0.35)',
        }}>
          SCR!PTS
        </span>
      </div>
    </div>
  )
}

/** Live viewport size — used to size controls proportionally to the screen. */
function useViewport(): [number, number] {
  const [size, setSize] = useState<[number, number]>(() =>
    typeof window === 'undefined' ? [390, 750] : [window.innerWidth, window.innerHeight])
  useEffect(() => {
    const update = () => setSize([window.innerWidth, window.innerHeight])
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return size
}

export default function GameBoyShell({
  screen, onPress, onRelease, layout, onInventory, muted, onToggleMute, onOverlayChange,
}: {
  screen: ReactNode
  onPress: (b: Btn) => void
  /** Fired when a held button is let go (D-pad hold-to-walk). */
  onRelease?: (b: Btn) => void
  layout: ShellLayout
  onInventory: () => void
  muted: boolean
  onToggleMute: () => void
  /** SystemOverlay open/close — the page freezes Phaser input while open. */
  onOverlayChange?: (open: boolean) => void
}) {
  const [overlayKind, setOverlayKind] = useState<'social' | 'help' | null>(null)
  const [vw, vh] = useViewport()

  const setOverlay = useCallback((k: 'social' | 'help' | null) => {
    setOverlayKind((prev) => {
      const next = prev === k ? null : k
      onOverlayChange?.(next !== null)
      return next
    })
  }, [onOverlayChange])

  const closeOverlay = useCallback(() => {
    setOverlayKind((prev) => {
      if (prev !== null) onOverlayChange?.(false)
      return null
    })
  }, [onOverlayChange])

  // Desktop keys close an open overlay (X / Escape), matching B on touch.
  useEffect(() => {
    if (!overlayKind) return
    const onKey = (e: KeyboardEvent) => {
      if (['KeyX', 'Escape'].includes(e.code)) { e.preventDefault(); closeOverlay() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [overlayKind, closeOverlay])

  // Spec: overlays close on layout change (rotation would strand a stale overlay).
  useEffect(() => { closeOverlay() }, [layout, closeOverlay])

  const press = (b: Btn) => (e: React.PointerEvent) => {
    e.preventDefault()
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* noop */ }
    if (overlayKind && (b === 'B' || b === 'A')) { closeOverlay(); return }
    onPress(b)
  }
  const release = (b: Btn) => (e: React.PointerEvent) => { e.preventDefault(); onRelease?.(b) }
  const hold = (b: Btn) => ({
    onPointerDown: press(b),
    onPointerUp: release(b),
    onPointerCancel: release(b),
  })
  const pressPlain = (b: Btn) => {
    if (overlayKind && (b === 'B' || b === 'A')) { closeOverlay(); return }
    onPress(b)
  }

  const onUtility = (a: UtilityAction) => {
    if (a === 'inventory') { closeOverlay(); onInventory(); return }
    if (a === 'mute') { onToggleMute(); return }
    setOverlay(a === 'social' ? 'social' : 'help')
  }

  const overlay = overlayKind
    ? <SystemOverlay kind={overlayKind} mobile={layout !== 'desktop'} onClose={closeOverlay} />
    : null

  const rootStyle: React.CSSProperties = {
    background: SHELL_BODY, userSelect: 'none', WebkitUserSelect: 'none',
    WebkitTouchCallout: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'none',
  }

  // ── DESKTOP: 16:9 LCD wrapped by the black strip on all four sides,
  // wordmark in the bottom band, utility row below the frame on flat pink.
  if (layout === 'desktop') {
    const stripH = 28
    const frame = 16
    const railH = 56
    // Largest 16:9 screen that fits beside slim margins and the utility rail.
    const margin = 0.025 * Math.min(vw, vh)
    const maxW = vw - 2 * margin - 2 * frame
    const maxH = vh - 2 * margin - railH - stripH - frame
    const lcdW = Math.min(maxW, maxH * (16 / 9))
    const lcdH = lcdW * (9 / 16)
    return (
      <div className="w-screen flex flex-col items-center justify-center" style={{ ...rootStyle, height: '100dvh', gap: 6 }}>
        <div style={{
          background: STRIP_BLACK, borderRadius: 10, padding: `${frame}px ${frame}px 0`,
          boxShadow: '0 10px 26px rgba(0,0,0,0.35)',
        }}>
          <div style={{ width: lcdW, height: lcdH, position: 'relative', overflow: 'hidden', borderRadius: 4, background: 'linear-gradient(160deg, #E2E2DE 0%, #D6D6D2 100%)' }}>
            {screen}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: SCREEN_GLASS }} />
            {overlay}
          </div>
          <div style={{ height: stripH, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className={pressStart.className} style={{
              fontSize: Math.round(stripH * 0.34), color: WORDMARK_PINK, letterSpacing: 5,
              textShadow: '0 0 6px rgba(255,138,199,0.35)',
            }}>
              SCR!PTS
            </span>
          </div>
        </div>
        <div style={{ height: railH, display: 'flex', alignItems: 'center', gap: 26 }}>
          <DmgBtn label={UTILITY_LABELS.social} pillWidth={40} onPress={() => onUtility('social')} />
          <DmgBtn label={UTILITY_LABELS.inventory} pillWidth={40} onPress={() => onUtility('inventory')} />
          <FlatIconBtn ariaLabel={muted ? 'Unmute' : 'Mute'} onPress={() => onUtility('mute')}>
            <SpeakerIcon size={19} muted={muted} />
          </FlatIconBtn>
          <FlatIconBtn ariaLabel="Help" onPress={() => onUtility('help')}>
            <QuestionGlyph size={18} />
          </FlatIconBtn>
        </div>
      </div>
    )
  }

  // ── LANDSCAPE: LCD centre with strip below; controls ride high on flat pink
  // flanks, each flank's utility stack beneath its cluster.
  if (layout === 'landscape') {
    const dpadSize = Math.max(96, Math.min(0.20 * vh, 0.115 * vw))
    const absSize = Math.max(56, Math.min(0.13 * vh, 0.075 * vw))
    // Flank must contain the clamped D-pad / A-B cluster — on small viewports
    // the clamp floors win over 13vw, so the flank grows to avoid clipping.
    const flankW = Math.max(0.13 * vw, dpadSize + 12, absSize * 2.1 + 12)
    return (
      <div style={{ ...rootStyle, position: 'relative', height: '100dvh' }}>
        <div style={{ position: 'absolute', left: flankW, right: flankW, top: 0, bottom: 0 }}>
          <ScreenModule overlay={overlay} stripHeight={22} framePad="0 14px" style={{ width: '100%', height: '100%' }}>{screen}</ScreenModule>
        </div>
        {/* Left flank: D-pad high, SOCIALS + speaker below it */}
        <div style={{
          position: 'absolute', left: 0, width: flankW, top: 0, bottom: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          paddingTop: 'max(6vh, env(safe-area-inset-top))', paddingLeft: 'env(safe-area-inset-left)',
          paddingBottom: 'calc(6px + env(safe-area-inset-bottom))',
        }}>
          <div style={{ flexBasis: '18%' }} />
          <DPad size={dpadSize} hold={hold} />
          <div style={{ flex: 1 }} />
          <DmgBtn label={UTILITY_LABELS.social} pillWidth={40} onPress={() => onUtility('social')} />
          <FlatIconBtn ariaLabel={muted ? 'Unmute' : 'Mute'} onPress={() => onUtility('mute')}>
            <SpeakerIcon size={18} muted={muted} />
          </FlatIconBtn>
        </div>
        {/* Right flank: A/B high, INVENTORY + ? below */}
        <div style={{
          position: 'absolute', right: 0, width: flankW, top: 0, bottom: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          paddingTop: 'max(6vh, env(safe-area-inset-top))', paddingRight: 'env(safe-area-inset-right)',
          paddingBottom: 'calc(6px + env(safe-area-inset-bottom))',
        }}>
          <div style={{ flexBasis: '18%' }} />
          <div style={{ position: 'relative', width: absSize * 2.1, height: absSize * 1.8, touchAction: 'none' }}>
            <div style={{ position: 'absolute', top: 0, right: 0 }}><RoundBtn label="A" onPress={pressPlain} size={absSize} /></div>
            <div style={{ position: 'absolute', bottom: 0, left: 0 }}><RoundBtn label="B" onPress={pressPlain} size={absSize} /></div>
          </div>
          <div style={{ flex: 1 }} />
          <DmgBtn label={UTILITY_LABELS.inventory} pillWidth={40} onPress={() => onUtility('inventory')} />
          <FlatIconBtn ariaLabel="Help" onPress={() => onUtility('help')}>
            <QuestionGlyph size={17} />
          </FlatIconBtn>
        </div>
      </div>
    )
  }

  // ── PORTRAIT: full-bleed LCD top 50%, flat pink deck below.
  const portraitDpadSize = Math.min(0.36 * vw, 150)
  const portraitAbsSize = Math.min(0.22 * vw, 96)
  const dmgPillWidth = Math.max(38, Math.min(0.12 * vw, 48))
  return (
    <div className="w-screen flex flex-col" style={{ ...rootStyle, height: '100dvh' }}>
      <div style={{ height: '50%', overflow: 'hidden' }}>
        <ScreenModule overlay={overlay} stripHeight={24} style={{ width: '100%', height: '100%' }}>{screen}</ScreenModule>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        {/* Control clusters */}
        <div style={{ position: 'absolute', left: '7%', top: '10%' }}>
          <DPad size={portraitDpadSize} hold={hold} />
        </div>
        <div style={{
          position: 'absolute', right: '6%', top: '12%',
          width: portraitAbsSize * 2.1, height: portraitAbsSize * 1.8, touchAction: 'none',
        }}>
          <div style={{ position: 'absolute', top: 0, right: 0 }}><RoundBtn label="A" onPress={pressPlain} size={portraitAbsSize} /></div>
          <div style={{ position: 'absolute', bottom: 0, left: 0 }}><RoundBtn label="B" onPress={pressPlain} size={portraitAbsSize} /></div>
        </div>
        {/* SOCIALS + INVENTORY centred in the space below the clusters */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: '62%',
          display: 'flex', justifyContent: 'center', gap: 20,
        }}>
          <DmgBtn label={UTILITY_LABELS.social} pillWidth={dmgPillWidth} onPress={() => onUtility('social')} />
          <DmgBtn label={UTILITY_LABELS.inventory} pillWidth={dmgPillWidth} onPress={() => onUtility('inventory')} />
        </div>
        {/* Flat icons in the bottom corners */}
        <div style={{ position: 'absolute', left: 'calc(10px + env(safe-area-inset-left))', bottom: 'calc(6px + env(safe-area-inset-bottom))' }}>
          <FlatIconBtn ariaLabel={muted ? 'Unmute' : 'Mute'} onPress={() => onUtility('mute')}>
            <SpeakerIcon size={20} muted={muted} />
          </FlatIconBtn>
        </div>
        <div style={{ position: 'absolute', right: 'calc(10px + env(safe-area-inset-right))', bottom: 'calc(6px + env(safe-area-inset-bottom))' }}>
          <FlatIconBtn ariaLabel="Help" onPress={() => onUtility('help')}>
            <QuestionGlyph size={19} />
          </FlatIconBtn>
        </div>
      </div>
    </div>
  )
}
