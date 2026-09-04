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

      {/* Text layer. The lockup and PRESS START are anchored independently as a
          share of the LCD height: logo just above the walkers, PRESS START down
          on the road. Both are placed by % so they track the same spots on any
          aspect ratio and never depend on the background image being stretched. */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 6, padding: mobile ? '0 16px' : '0 24px' }}>
        <div
          className={pressStart.className}
          style={{
            position: 'absolute', left: 0, right: 0, textAlign: 'center',
            top: mobile ? '34%' : '42%',
            fontSize: mobile ? 'clamp(26px, 9vw, 44px)' : 'clamp(32px, 5.5vw, 80px)',
            color: '#F7F7F5',
            letterSpacing: '0.05em',
            lineHeight: 1,
            textShadow: '3px 3px 0 #0D0D0D',
          }}
        >
          SCR!PTS
        </div>

        <div
          className={pressStart.className}
          style={{
            position: 'absolute', left: 0, right: 0,
            top: mobile ? '88%' : '83%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5em',
            fontSize: mobile ? 'clamp(7px, 2.2vw, 11px)' : 'clamp(8px, 0.95vw, 14px)',
            color: '#F7F7F5',
            letterSpacing: '0.2em',
            opacity: blink ? 1 : 0,
            transition: 'opacity 0.08s',
          }}
        >
          <span style={{ color: '#F7F7F5' }}>›</span>
          PRESS START
        </div>
      </div>
    </div>
  )
}
