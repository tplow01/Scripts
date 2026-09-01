'use client'

import { Press_Start_2P } from 'next/font/google'
import { useEffect, useState } from 'react'
import PixelCityIntro from './PixelCityIntro'

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
      <PixelCityIntro />

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
            color: '#F7F7F5',
            letterSpacing: '0.05em',
            lineHeight: 1,
            marginBottom: mobile ? '2em' : '2.2em',
            textShadow: '3px 3px 0 #0D0D0D',
          }}
        >
          SCR!PTS
        </div>

        <div
          className={pressStart.className}
          style={{
            fontSize: mobile ? 'clamp(7px, 2.2vw, 11px)' : 'clamp(8px, 0.95vw, 14px)',
            color: '#F7F7F5',
            letterSpacing: '0.2em',
            opacity: blink ? 1 : 0,
            transition: 'opacity 0.08s',
            display: 'flex', alignItems: 'center', gap: '0.5em',
          }}
        >
          <span style={{ color: '#F7F7F5' }}>›</span>
          PRESS START
        </div>
      </div>
    </div>
  )
}
