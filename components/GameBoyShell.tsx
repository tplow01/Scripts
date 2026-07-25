'use client'

import { Press_Start_2P } from 'next/font/google'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import DPad, { type Btn } from './shell/DPad'
import RoundBtn from './shell/RoundBtn'
import PillBtn from './shell/PillBtn'
import ConsoleUtilityStrip from './shell/ConsoleUtilityStrip'
import SystemOverlay from './shell/SystemOverlay'
import type { ShellLayout } from '@/lib/useShellLayout'

export type { Btn }

const pressStart = Press_Start_2P({ weight: '400', subsets: ['latin'], display: 'swap' })

const BODY = `linear-gradient(160deg, #D4D4C8 0%, #BCBCB0 25%, #A8A89C 55%, #989890 75%, #8C8C84 100%)`
const SHEEN = `
  linear-gradient(90deg, rgba(255,255,255,0.14) 0px, rgba(255,255,255,0.04) 3px, transparent 10px),
  linear-gradient(180deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.03) 3px, transparent 10px)
`

/** Speaker-grille dot pattern (Delta landscape flank filler). */
function Grille({ width, height }: { width: number; height: number }) {
  return (
    <div style={{
      width, height,
      backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.35) 1.5px, transparent 1.5px)',
      backgroundSize: '9px 9px',
    }} />
  )
}

/** The LCD module — bezel + recessed screen hosting `children` (+ overlay). */
function ScreenModule({
  children, overlay, compact = false, wordmarkBelow = false, style = {},
}: {
  children: ReactNode
  overlay: ReactNode
  compact?: boolean
  wordmarkBelow?: boolean
  style?: React.CSSProperties
}) {
  const inset = compact ? 8 : 18
  const label = (
    <div style={{
      height: compact ? 22 : 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, zIndex: 1,
    }}>
      <span className={pressStart.className} style={{ fontSize: compact ? 6 : 8, color: '#3A3A3A', letterSpacing: 4 }}>
        SCR!PTS
      </span>
    </div>
  )
  return (
    <div style={{ background: '#111111', display: 'flex', flexDirection: 'column', position: 'relative', ...style }}>
      <div style={{
        flex: 1, margin: `${inset}px ${inset}px 0 ${inset}px`,
        background: '#DCDCDA', borderRadius: 4, position: 'relative', overflow: 'hidden', zIndex: 1,
      }}>
        {children}
        {overlay}
      </div>
      {wordmarkBelow || !compact ? label : <div style={{ height: inset }} />}
    </div>
  )
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
  const [overlayKind, setOverlayKind] = useState<'social' | 'keys' | null>(null)

  const setOverlay = useCallback((k: 'social' | 'keys' | null) => {
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

  const press = (b: Btn) => (e: React.PointerEvent) => {
    e.preventDefault()
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* noop */ }
    if (overlayKind && (b === 'B' || b === 'A' || b === 'START')) { closeOverlay(); return }
    onPress(b)
  }
  const release = (b: Btn) => (e: React.PointerEvent) => { e.preventDefault(); onRelease?.(b) }
  const hold = (b: Btn) => ({
    onPointerDown: press(b),
    onPointerUp: release(b),
    onPointerCancel: release(b),
  })
  const pressPlain = (b: Btn) => {
    if (overlayKind && (b === 'B' || b === 'A' || b === 'START')) { closeOverlay(); return }
    onPress(b)
  }

  const onUtility = (a: 'social' | 'inventory' | 'mute' | 'keys') => {
    if (a === 'inventory') { closeOverlay(); onInventory(); return }
    if (a === 'mute') { onToggleMute(); return }
    setOverlay(a)
  }

  const overlay = overlayKind
    ? <SystemOverlay kind={overlayKind} mobile={layout !== 'desktop'} onClose={closeOverlay} />
    : null

  const rootStyle: React.CSSProperties = {
    background: BODY, userSelect: 'none', WebkitUserSelect: 'none',
    WebkitTouchCallout: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'none',
  }

  // ── DESKTOP: full-bleed bezel; utility strip molded into the bottom edge.
  if (layout === 'desktop') {
    return (
      <div className="h-dvh w-screen flex flex-col" style={rootStyle}>
        <div style={{ flex: 1, position: 'relative', padding: '40px 40px 0 40px', display: 'flex' }}>
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: SHEEN }} />
          <div style={{
            position: 'relative', flex: 1, borderRadius: 16, overflow: 'hidden',
            boxShadow: '0 2px 0 rgba(255,255,255,0.12), 0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.5)',
          }}>
            <ScreenModule overlay={overlay} style={{ width: '100%', height: '100%' }}>{screen}</ScreenModule>
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 16,
              boxShadow: 'inset 0 6px 16px rgba(0,0,0,0.95), inset 0 -3px 8px rgba(0,0,0,0.6), inset 5px 0 12px rgba(0,0,0,0.6), inset -5px 0 12px rgba(0,0,0,0.6)',
            }} />
          </div>
        </div>
        <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ConsoleUtilityStrip muted={muted} active={overlayKind} onAction={onUtility} />
        </div>
      </div>
    )
  }

  // ── LANDSCAPE: LCD centre, D-pad left flank, A/B + grille right flank.
  if (layout === 'landscape') {
    return (
      <div className="h-dvh w-screen flex" style={rootStyle}>
        {/* Left flank */}
        <div style={{ width: 150, flexShrink: 0, position: 'relative', display: 'flex', flexDirection: 'column', padding: '10px 12px' }}>
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: SHEEN }} />
          <div style={{ alignSelf: 'flex-start' }}><PillBtn label="MENU" onPress={pressPlain} /></div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DPad size={110} hold={hold} />
          </div>
        </div>
        {/* Centre: screen + SELECT/START + wordmark below */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <ScreenModule overlay={overlay} compact wordmarkBelow style={{ flex: 1, minHeight: 0 }}>{screen}</ScreenModule>
          <div style={{ height: 34, display: 'flex', gap: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <PillBtn label="SELECT" onPress={pressPlain} />
            <PillBtn label="START" onPress={pressPlain} />
          </div>
        </div>
        {/* Right flank */}
        <div style={{ width: 150, flexShrink: 0, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 12px' }}>
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: SHEEN }} />
          <Grille width={70} height={54} />
          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            {/* A upper-right, B lower-left (Delta diagonal) */}
            <div style={{ position: 'relative', width: 118, height: 108, touchAction: 'none' }}>
              <div style={{ position: 'absolute', top: 0, right: 0 }}><RoundBtn label="A" onPress={pressPlain} size={52} /></div>
              <div style={{ position: 'absolute', bottom: 0, left: 0 }}><RoundBtn label="B" onPress={pressPlain} size={52} /></div>
            </div>
          </div>
          <ConsoleUtilityStrip compact muted={muted} active={overlayKind} onAction={onUtility} />
        </div>
      </div>
    )
  }

  // ── PORTRAIT: LCD top, molded control panel below, utility strip on the
  // bottom edge. All rows flex — nothing overlaps down to 320x568.
  return (
    <div className="h-dvh w-screen flex flex-col" style={rootStyle}>
      <div style={{ height: '50%', padding: '16px 16px 0 16px', display: 'flex', alignItems: 'stretch', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: SHEEN }} />
        <ScreenModule overlay={overlay} compact style={{
          flex: 1, borderRadius: '10px 10px 0 0', overflow: 'hidden',
          boxShadow: 'inset 0 3px 8px rgba(0,0,0,0.8), inset 2px 0 6px rgba(0,0,0,0.4), inset -2px 0 6px rgba(0,0,0,0.4)',
        }}>
          {screen}
        </ScreenModule>
      </div>

      <div style={{ height: '50%', display: 'flex', flexDirection: 'column', padding: '12px 28px 10px 28px', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: SHEEN }} />
        <div style={{ height: 1, background: 'rgba(0,0,0,0.12)', flexShrink: 0 }} />

        {/* Row 1: D-pad + A/B — flexes to absorb short viewports */}
        <div style={{ flex: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 0 }}>
          <DPad size={110} hold={hold} />
          <div style={{ position: 'relative', width: 120, height: 110, touchAction: 'none' }}>
            <div style={{ position: 'absolute', top: 0, right: 0 }}><RoundBtn label="A" onPress={pressPlain} /></div>
            <div style={{ position: 'absolute', bottom: 0, left: 0 }}><RoundBtn label="B" onPress={pressPlain} /></div>
          </div>
        </div>

        {/* Row 2: MENU · SELECT · START */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', minHeight: 30 }}>
          <div style={{ flex: 1 }}><PillBtn label="MENU" onPress={pressPlain} /></div>
          <div style={{ display: 'flex', gap: 22 }}>
            <PillBtn label="SELECT" onPress={pressPlain} />
            <PillBtn label="START" onPress={pressPlain} />
          </div>
          <div style={{ flex: 1 }} />
        </div>

        {/* Row 3: utility strip on the bottom edge of the body */}
        <div style={{ flexShrink: 0, paddingTop: 6, paddingBottom: 4 }}>
          <ConsoleUtilityStrip compact muted={muted} active={overlayKind} onAction={onUtility} />
        </div>
      </div>
    </div>
  )
}
