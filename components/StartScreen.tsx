'use client'

import { Press_Start_2P } from 'next/font/google'
import { useEffect, useState } from 'react'

const pressStart = Press_Start_2P({ weight: '400', subsets: ['latin'], display: 'swap' })

/**
 * The boot/title content rendered inside the Game Boy LCD before the game
 * starts: CRT overlays, the SCR!PTS lockup, tagline, and a blinking PRESS START.
 * Clicking/tapping anywhere on it starts the game (keyboard + the A/START
 * buttons are wired by the shell).
 */
export default function StartScreen({
  mobile = false,
  onStart,
}: {
  mobile?: boolean
  onStart: () => void
}) {
  const [blink, setBlink] = useState(true)

  useEffect(() => {
    const id = setInterval(() => setBlink((b) => !b), 700)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      onClick={onStart}
      style={{ position: 'absolute', inset: 0, cursor: 'pointer' }}
    >
      {/* Scanlines ~5% */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.05) 3px, rgba(0,0,0,0.05) 4px)',
      }} />

      {/* Dot matrix */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.07) 1px, transparent 1px)',
        backgroundSize: '4px 4px',
      }} />

      {/* Corner vignette */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.18) 100%)',
      }} />

      {/* Screen inset shadow — LCD recessed into bezel */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none',
        boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.28), inset 4px 0 8px rgba(0,0,0,0.12), inset -4px 0 8px rgba(0,0,0,0.12), inset 0 -2px 6px rgba(0,0,0,0.1)',
        borderRadius: 4,
      }} />

      {/* Screen glow */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none',
        boxShadow: 'inset 0 0 40px rgba(220,220,210,0.4)',
        borderRadius: 4,
      }} />

      {/* Text layer */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 6,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: mobile ? '0 16px' : '0 24px',
      }}>
        <div
          className={pressStart.className}
          style={{
            fontSize: mobile ? 'clamp(26px, 9vw, 44px)' : 'clamp(32px, 5.5vw, 80px)',
            color: '#0D0D0D',
            letterSpacing: '0.05em',
            lineHeight: 1,
            marginBottom: '0.45em',
            filter: 'drop-shadow(2px 3px 0px rgba(0,0,0,0.25))',
          }}
        >
          SCR!PTS
        </div>

        <div
          className={pressStart.className}
          style={{
            fontSize: mobile ? 'clamp(5px, 1.8vw, 8px)' : 'clamp(6px, 0.65vw, 10px)',
            color: '#666',
            letterSpacing: '0.14em',
            marginBottom: mobile ? '2em' : '2.2em',
          }}
        >
          Storytelling through clothing
        </div>

        <div
          className={pressStart.className}
          style={{
            fontSize: mobile ? 'clamp(7px, 2.2vw, 11px)' : 'clamp(8px, 0.95vw, 14px)',
            color: '#888',
            letterSpacing: '0.2em',
            opacity: blink ? 1 : 0,
            transition: 'opacity 0.08s',
            display: 'flex', alignItems: 'center', gap: '0.5em',
          }}
        >
          <span style={{ color: '#777' }}>›</span>
          PRESS START
        </div>
      </div>

      {/* Copyright */}
      <div style={{
        position: 'absolute', bottom: mobile ? 10 : 14, left: 0, right: 0,
        zIndex: 6, textAlign: 'center',
      }}>
        <span className={pressStart.className} style={{
          fontSize: mobile ? 5 : 7, color: '#999', letterSpacing: '0.12em',
        }}>
          © SCR!PTS 2026
        </span>
      </div>
    </div>
  )
}
