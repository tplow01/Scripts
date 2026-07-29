'use client'

import { Press_Start_2P } from 'next/font/google'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { Btn, UtilityAction } from '@/lib/controls'
import { UTILITY_LABELS } from '@/lib/controls'
import type { ShellLayout } from '@/lib/useShellLayout'
import DPad from './shell/DPad'
import PillBtn from './shell/PillBtn'
import RoundBtn from './shell/RoundBtn'
import SystemOverlay from './shell/SystemOverlay'
import { INK_BODY, INK_CREASES, SCREEN_GLASS, WORDMARK_PINK } from './shell/theme'

export type { Btn }

const pressStart = Press_Start_2P({ weight: '400', subsets: ['latin'], display: 'swap' })

/** Speaker-dot motif on the ink body. */
function Dots({ width, height }: { width: number | string; height: number | string }) {
  return (
    <div style={{
      width, height,
      backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.32) 1.4px, transparent 1.4px)',
      backgroundSize: '8px 8px',
      WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 78%)',
      maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 78%)',
    }} />
  )
}

/** LCD in its black bezel with the flat SCR!PTS strip as the bezel's bottom band. */
function ScreenModule({ children, overlay, stripHeight = 26, style = {} }: {
  children: ReactNode; overlay: ReactNode; stripHeight?: number; style?: React.CSSProperties
}) {
  return (
    <div style={{ background: '#000', display: 'flex', flexDirection: 'column', ...style }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'linear-gradient(160deg, #E2E2DE 0%, #D6D6D2 100%)' }}>
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
  const utilityPills = (height: number) => (
    <>
      <PillBtn label={UTILITY_LABELS.social} height={height} onPress={() => onUtility('social')} />
      <PillBtn label={UTILITY_LABELS.inventory} height={height} onPress={() => onUtility('inventory')} />
      <PillBtn label={UTILITY_LABELS.mute} height={height} active={muted} onPress={() => onUtility('mute')} />
      <PillBtn label={UTILITY_LABELS.help} height={height} onPress={() => onUtility('help')} />
    </>
  )

  const overlay = overlayKind
    ? <SystemOverlay kind={overlayKind} mobile={layout !== 'desktop'} onClose={closeOverlay} />
    : null

  const rootStyle: React.CSSProperties = {
    background: INK_BODY, userSelect: 'none', WebkitUserSelect: 'none',
    WebkitTouchCallout: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'none',
  }

  // ── DESKTOP: full-bleed bezel; utility rail below it.
  if (layout === 'desktop') {
    return (
      <div className="w-screen flex flex-col" style={{ ...rootStyle, height: '100dvh', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: INK_CREASES }} />
        <div style={{
          margin: '2.5% 1.6% 0', flex: 1, borderRadius: 14, overflow: 'hidden',
          boxShadow: '0 10px 26px rgba(0,0,0,0.55)',
        }}>
          <ScreenModule overlay={overlay} stripHeight={26} style={{ width: '100%', height: '100%' }}>{screen}</ScreenModule>
        </div>
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 18,
          padding: '10px 0 calc(10px + env(safe-area-inset-bottom))',
        }}>
          {utilityPills(30)}
        </div>
      </div>
    )
  }

  // ── LANDSCAPE: LCD centre bezel, D-pad left flank, A/B right flank, utilities on both flanks.
  if (layout === 'landscape') {
    const dpadSize = Math.max(96, Math.min(0.20 * vh, 0.115 * vw))
    const absSize = Math.max(56, Math.min(0.13 * vh, 0.075 * vw))
    return (
      <div style={{ ...rootStyle, position: 'relative', height: '100dvh' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: INK_CREASES }} />
        {/* Bezel */}
        <div style={{
          position: 'absolute', left: '13%', right: '13%', top: 0, bottom: '4%',
          borderRadius: '0 0 16px 16px', overflow: 'hidden',
        }}>
          <ScreenModule overlay={overlay} stripHeight={22} style={{ width: '100%', height: '100%' }}>{screen}</ScreenModule>
        </div>
        {/* Left flank */}
        <div style={{
          position: 'absolute', left: 0, width: '13%', top: 0, bottom: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          paddingTop: 'max(12px, env(safe-area-inset-top))', paddingLeft: 'env(safe-area-inset-left)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <PillBtn label={UTILITY_LABELS.social} height={24} onPress={() => onUtility('social')} />
            <PillBtn label={UTILITY_LABELS.inventory} height={24} onPress={() => onUtility('inventory')} />
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <DPad size={dpadSize} hold={hold} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <Dots width={40} height={26} />
          </div>
        </div>
        {/* Right flank */}
        <div style={{
          position: 'absolute', right: 0, width: '13%', top: 0, bottom: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          paddingTop: 'max(12px, env(safe-area-inset-top))', paddingRight: 'env(safe-area-inset-right)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <PillBtn label={UTILITY_LABELS.mute} height={24} active={muted} onPress={() => onUtility('mute')} />
            <PillBtn label={UTILITY_LABELS.help} height={24} onPress={() => onUtility('help')} />
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: absSize * 2.1, height: absSize * 1.8, touchAction: 'none' }}>
              <div style={{ position: 'absolute', top: 0, right: 0 }}><RoundBtn label="A" onPress={pressPlain} size={absSize} /></div>
              <div style={{ position: 'absolute', bottom: 0, left: 0 }}><RoundBtn label="B" onPress={pressPlain} size={absSize} /></div>
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <Dots width={40} height={26} />
          </div>
        </div>
      </div>
    )
  }

  // ── PORTRAIT: LCD top, molded control deck below with absolute-positioned controls.
  const portraitDpadSize = Math.min(0.36 * vw, 150)
  const portraitAbsSize = Math.min(0.24 * vw, 100)
  const utilityHeight = Math.max(24, Math.min(0.075 * vw, 32))
  return (
    <div className="w-screen flex flex-col" style={{ ...rootStyle, height: '100dvh' }}>
      <div style={{ height: '52%', overflow: 'hidden', borderRadius: '0 0 16px 16px' }}>
        <ScreenModule overlay={overlay} stripHeight={24} style={{ width: '100%', height: '100%' }}>{screen}</ScreenModule>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: INK_BODY }} />
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: INK_CREASES }} />
        <div style={{ position: 'absolute', left: '7%', top: '14%' }}>
          <DPad size={portraitDpadSize} hold={hold} />
        </div>
        <div style={{
          position: 'absolute', right: '6%', top: '16%',
          width: portraitAbsSize * 2.1, height: portraitAbsSize * 1.8, touchAction: 'none',
        }}>
          <div style={{ position: 'absolute', top: 0, right: 0 }}><RoundBtn label="A" onPress={pressPlain} size={portraitAbsSize} /></div>
          <div style={{ position: 'absolute', bottom: 0, left: 0 }}><RoundBtn label="B" onPress={pressPlain} size={portraitAbsSize} /></div>
        </div>
        <div style={{ position: 'absolute', right: '6%', bottom: 'calc(4% + 40px + env(safe-area-inset-bottom))' }}>
          <Dots width={34} height={24} />
        </div>
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 'calc(4% + env(safe-area-inset-bottom))',
          display: 'flex', justifyContent: 'center', gap: 8,
        }}>
          {utilityPills(utilityHeight)}
        </div>
      </div>
    </div>
  )
}
