'use client'

import {
  STRIP_BLACK as INK,
  BRAND_WHITE as PAPER,
  PINK_DEEP,
  PANEL_DARK as PANEL,
} from './theme'
import { DPadGlyph } from './DPad'

const SOCIALS = [
  { label: 'Instagram', href: 'https://www.instagram.com/scripts.studio/' },
  { label: 'YouTube', href: 'https://youtube.com' },
  { label: 'TikTok', href: 'https://www.tiktok.com/@scripts.studio' },
]

const DIVIDER = '1px solid rgba(255,255,255,0.08)'

const LABEL: React.CSSProperties = {
  font: '800 11px/1.25 Inter, system-ui, sans-serif',
  letterSpacing: '0.09em', textTransform: 'uppercase', color: PAPER, textAlign: 'center',
}
const SUB: React.CSSProperties = {
  display: 'block', font: '600 9px Inter, system-ui, sans-serif',
  letterSpacing: '0.02em', textTransform: 'none', color: '#9A9A9A', marginTop: 3,
}

/** Pointer/cursor glyph — desktop "click". */
function CursorGlyph({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={PAPER} aria-hidden>
      <path d="M5 2v17l4.3-4.1 2.5 5.9 2.6-1.1-2.5-5.8H18z" />
    </svg>
  )
}

/** Tap glyph — mobile "tap". */
function TapGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="14" r="4" fill={PAPER} />
      <path d="M6 7C7 5.2 9.3 4 12 4s5 1.2 6 3" stroke={PAPER} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

/** Outlined key-cap — desktop Z / X. */
const CAP_FONT = "13px/1 var(--font-bebas), sans-serif"

function KeyCap({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      minWidth: 22, height: 22, padding: '0 5px', borderRadius: 3,
      border: `1.6px solid ${PAPER}`, background: '#000', color: PAPER, flexShrink: 0,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      font: CAP_FONT, letterSpacing: '0.04em',
    }}>
      {children}
    </span>
  )
}

/** Round rubber button — mobile A / B. */
function RoundCap({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
      background: 'radial-gradient(circle at 36% 30%, #3A3A3E, #111 70%)',
      boxShadow: '0 2px 3px rgba(0,0,0,0.5), inset 0 2px 3px rgba(255,255,255,0.14)',
      color: PAPER,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      font: CAP_FONT, letterSpacing: '0.04em',
    }}>
      {children}
    </span>
  )
}

/** Desktop arrow-key cluster: ↑ over ← ↓ →. */
function ArrowKeys() {
  const cell: React.CSSProperties = {
    width: 20, height: 20, border: `1.6px solid ${PAPER}`, background: '#000',
    color: PAPER, borderRadius: 3, fontSize: 11,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 20px)', gridAutoRows: 20, gap: 3 }}>
      <span /><span style={cell}>&uarr;</span><span />
      <span style={cell}>&larr;</span><span style={cell}>&darr;</span><span style={cell}>&rarr;</span>
    </div>
  )
}

/**
 * Pause-menu overlay rendered INSIDE the LCD (same host as the game canvas /
 * start screen): dimmed screen + a near-black card that matches the dialogue
 * Yes/No panel. Either the socials list or a platform-aware control map. Tap
 * outside — or B / X / Escape, handled by the shell — closes it.
 */
export default function SystemOverlay({
  kind, mobile, onClose,
}: { kind: 'social' | 'help'; mobile: boolean; onClose: () => void }) {
  const secondary = mobile
    ? [
        { cap: <RoundCap>A</RoundCap>, text: 'Interact' },
        { cap: <RoundCap>B</RoundCap>, text: 'Back' },
        { cap: <TapGlyph />, text: 'Tap' },
      ]
    : [
        { cap: <KeyCap>Z</KeyCap>, text: 'Interact' },
        { cap: <KeyCap>X</KeyCap>, text: 'Back' },
        { cap: <CursorGlyph />, text: 'Click' },
      ]

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 8,
        background: 'rgba(13,13,13,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: PANEL, borderRadius: 13, overflow: 'hidden',
          boxShadow: '0 8px 20px rgba(0,0,0,0.34)', minWidth: 234, maxWidth: 300,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-bebas), sans-serif', fontSize: 15,
            letterSpacing: '0.16em', textTransform: 'uppercase', lineHeight: 1,
            color: PINK_DEEP, padding: '15px 18px 9px', textAlign: 'center',
          }}
        >
          {kind === 'social' ? 'SOCIALS' : 'HOW TO PLAY'}
        </div>

        {kind === 'social' ? (
          SOCIALS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block', textAlign: 'center', textDecoration: 'none',
                fontFamily: 'var(--font-bebas), sans-serif', fontSize: 19,
                letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1,
                color: PAPER, padding: '13px 18px', borderTop: DIVIDER,
                transition: 'background 80ms, color 80ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = PINK_DEEP; e.currentTarget.style.color = INK }}
              onFocus={(e) => { e.currentTarget.style.background = PINK_DEEP; e.currentTarget.style.color = INK }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = PAPER }}
              onBlur={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = PAPER }}
            >
              {s.label}
            </a>
          ))
        ) : (
          <>
            {/* Hero — movement */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 11, padding: '10px 20px 15px' }}>
              {mobile ? (
                <span style={{ display: 'block', filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.55))' }}>
                  <DPadGlyph size={66} idSuffix="-help" rim />
                </span>
              ) : (
                <ArrowKeys />
              )}
              <span style={LABEL}>Move<span style={SUB}>hold to walk</span></span>
            </div>
            {/* Secondary — interact / back / click */}
            <div style={{
              display: 'flex', justifyContent: 'center', gap: 18, flexWrap: 'wrap',
              padding: '13px 16px 16px', borderTop: DIVIDER,
            }}>
              {secondary.map((s, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                  {s.cap}
                  <span style={{ ...LABEL, fontSize: 9, letterSpacing: '0.05em' }}>{s.text}</span>
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
