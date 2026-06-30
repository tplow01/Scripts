'use client'

import { Press_Start_2P } from 'next/font/google'
import type { ReactNode } from 'react'

const pressStart = Press_Start_2P({ weight: '400', subsets: ['latin'], display: 'swap' })

const BODY = `linear-gradient(160deg, #D4D4C8 0%, #BCBCB0 25%, #A8A89C 55%, #989890 75%, #8C8C84 100%)`

export type Btn = 'up' | 'down' | 'left' | 'right' | 'A' | 'B' | 'MENU' | 'SELECT' | 'START'

const pill: React.CSSProperties = {
  width: 44, height: 13,
  background: 'linear-gradient(180deg, #969690 0%, #808080 100%)',
  borderRadius: 7,
  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5), inset 0 -1px 2px rgba(255,255,255,0.08)',
}
const pillLbl: React.CSSProperties = { fontSize: 5, color: '#555', letterSpacing: 0.5 }

/** The LCD module — bezel + the recessed grey screen that hosts `children`. */
function ScreenModule({
  children,
  mobile = false,
  style = {},
}: {
  children: ReactNode
  mobile?: boolean
  style?: React.CSSProperties
}) {
  return (
    <div style={{
      background: '#111111',
      display: 'flex', flexDirection: 'column',
      overflow: 'visible', position: 'relative',
      ...style,
    }}>
      {/* Screen light bleed */}
      <div style={{
        position: 'absolute',
        top: mobile ? 14 : 18, left: mobile ? 14 : 18, right: mobile ? 14 : 18, bottom: mobile ? 30 : 38,
        borderRadius: 4,
        boxShadow: '0 0 24px 4px rgba(220,220,210,0.18)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* The LCD itself — content (start screen or game canvas) clips inside. */}
      <div style={{
        flex: 1,
        margin: mobile ? '14px 14px 0 14px' : '18px 18px 0 18px',
        background: '#DCDCDA',
        borderRadius: 4,
        position: 'relative',
        overflow: 'hidden',
        zIndex: 1,
      }}>
        {children}
      </div>

      <div style={{
        height: mobile ? 30 : 38,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, zIndex: 1,
      }}>
        <span className={pressStart.className} style={{
          fontSize: mobile ? 6 : 8, color: '#3A3A3A', letterSpacing: 4,
        }}>
          SCR!PTS
        </span>
      </div>
    </div>
  )
}

/** A pill button (MENU / SELECT / START) with its label. */
function PillBtn({ label, onPress }: { label: Btn; onPress: (b: Btn) => void }) {
  return (
    <div
      onPointerDown={(e) => { e.preventDefault(); onPress(label) }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer', touchAction: 'none' }}
    >
      <div style={pill} />
      <span className={pressStart.className} style={pillLbl}>{label}</span>
    </div>
  )
}

export default function GameBoyShell({
  screen,
  onPress,
  mobile,
}: {
  screen: ReactNode
  onPress: (b: Btn) => void
  mobile: boolean
}) {
  const press = (b: Btn) => (e: React.PointerEvent) => { e.preventDefault(); onPress(b) }

  // ── DESKTOP: full-bleed bezel, keyboard-driven (no on-screen buttons).
  if (!mobile) {
    return (
      <div className="h-screen w-screen" style={{ background: BODY }}>
        <div className="flex items-center justify-center w-full h-full" style={{ position: 'relative' }}>
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `
              linear-gradient(135deg, rgba(255,255,255,0.22) 0px, transparent 160px),
              linear-gradient(315deg, rgba(0,0,0,0.18) 0px, transparent 160px)
            `,
          }} />
          <div style={{
            position: 'relative',
            width: 'calc(100vw - 80px)', height: 'calc(100vh - 80px)',
            borderRadius: 16, overflow: 'hidden',
            boxShadow: '0 2px 0 rgba(255,255,255,0.12), 0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.5)',
          }}>
            <ScreenModule style={{ width: '100%', height: '100%' }}>{screen}</ScreenModule>
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 16,
              boxShadow: 'inset 0 6px 16px rgba(0,0,0,0.95), inset 0 -3px 8px rgba(0,0,0,0.6), inset 5px 0 12px rgba(0,0,0,0.6), inset -5px 0 12px rgba(0,0,0,0.6)',
            }} />
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 16,
              background: `
                linear-gradient(90deg, rgba(255,255,255,0.16) 0px, rgba(255,255,255,0.05) 3px, transparent 10px),
                linear-gradient(180deg, rgba(255,255,255,0.12) 0px, rgba(255,255,255,0.04) 3px, transparent 10px)
              `,
            }} />
          </div>
        </div>
      </div>
    )
  }

  // ── MOBILE: split — LCD on top, Delta-style controls below.
  return (
    <div className="h-screen w-screen flex flex-col" style={{ background: BODY }}>
      {/* Top: screen */}
      <div style={{ height: '50%', background: BODY, padding: '16px 16px 0 16px', display: 'flex', alignItems: 'stretch', position: 'relative' }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `
            linear-gradient(90deg, rgba(255,255,255,0.14) 0px, rgba(255,255,255,0.04) 3px, transparent 10px),
            linear-gradient(180deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.03) 3px, transparent 10px)
          `,
        }} />
        <ScreenModule mobile style={{
          flex: 1, borderRadius: '10px 10px 0 0', overflow: 'hidden',
          boxShadow: 'inset 0 3px 8px rgba(0,0,0,0.8), inset 2px 0 6px rgba(0,0,0,0.4), inset -2px 0 6px rgba(0,0,0,0.4)',
        }}>
          {screen}
        </ScreenModule>
      </div>

      {/* Bottom: controls */}
      <div style={{ height: '50%', background: BODY, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', padding: '12px 28px 20px 28px', position: 'relative' }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `
            linear-gradient(90deg, rgba(255,255,255,0.14) 0px, rgba(255,255,255,0.04) 3px, transparent 10px),
            linear-gradient(180deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.03) 3px, transparent 10px)
          `,
        }} />
        <div style={{ height: 1, background: 'rgba(0,0,0,0.12)' }} />

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, marginTop: 12 }}>

          {/* Row 1: D-pad + A/B */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* D-Pad — arms are individual touch zones */}
            <div style={{ position: 'relative', width: 110, height: 110, touchAction: 'none' }}>
              <div style={{
                position: 'absolute', top: '33%', left: 0, right: 0, height: '34%',
                background: 'linear-gradient(180deg, #969690 0%, #808080 100%)', borderRadius: 6,
                boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.55), inset 0 -1px 2px rgba(255,255,255,0.08)',
              }} />
              <div style={{
                position: 'absolute', left: '33%', top: 0, bottom: 0, width: '34%',
                background: 'linear-gradient(90deg, #969690 0%, #808080 100%)', borderRadius: 6,
                boxShadow: 'inset 2px 0 5px rgba(0,0,0,0.55), inset -1px 0 2px rgba(255,255,255,0.08)',
              }} />
              <div style={{ position: 'absolute', top: '33%', left: '33%', width: '34%', height: '34%', background: '#7A7A74', borderRadius: 3 }} />
              {/* touch zones */}
              <div onPointerDown={press('up')} style={{ position: 'absolute', top: 0, left: '28%', width: '44%', height: '40%' }} />
              <div onPointerDown={press('down')} style={{ position: 'absolute', bottom: 0, left: '28%', width: '44%', height: '40%' }} />
              <div onPointerDown={press('left')} style={{ position: 'absolute', left: 0, top: '28%', width: '40%', height: '44%' }} />
              <div onPointerDown={press('right')} style={{ position: 'absolute', right: 0, top: '28%', width: '40%', height: '44%' }} />
            </div>

            {/* A / B — B lower-left, A upper-right (Delta diagonal) */}
            <div style={{ position: 'relative', width: 120, height: 110, touchAction: 'none' }}>
              <div
                onPointerDown={press('B')}
                style={{
                  position: 'absolute', bottom: 0, left: 0, width: 56, height: 56, borderRadius: '50%',
                  background: 'linear-gradient(145deg, #C0396A 0%, #8B1A42 100%)',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -2px 3px rgba(0,0,0,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}
              >
                <span className={pressStart.className} style={{ fontSize: 12, color: '#fff' }}>B</span>
              </div>
              <div
                onPointerDown={press('A')}
                style={{
                  position: 'absolute', top: 0, right: 0, width: 56, height: 56, borderRadius: '50%',
                  background: 'linear-gradient(145deg, #C0396A 0%, #8B1A42 100%)',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -2px 3px rgba(0,0,0,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}
              >
                <span className={pressStart.className} style={{ fontSize: 12, color: '#fff' }}>A</span>
              </div>
            </div>
          </div>

          {/* Row 2: MENU · SELECT · START (Delta placement) */}
          <div style={{ position: 'relative', height: 26, marginBottom: 2, touchAction: 'none' }}>
            <div style={{ position: 'absolute', left: 0, bottom: 0 }}>
              <PillBtn label="MENU" onPress={onPress} />
            </div>
            <div style={{ position: 'absolute', left: '50%', bottom: 0, transform: 'translateX(-50%)', display: 'flex', gap: 22 }}>
              <PillBtn label="SELECT" onPress={onPress} />
              <PillBtn label="START" onPress={onPress} />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
