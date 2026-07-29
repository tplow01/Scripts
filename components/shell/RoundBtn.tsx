'use client'

import { Press_Start_2P } from 'next/font/google'
import { useState } from 'react'
import type { Btn } from '@/lib/controls'
import { PINK_FACE, PINK_SHADOW, RUBBER_FACE, RUBBER_SHADOW, pressedStyle } from './theme'

const pressStart = Press_Start_2P({ weight: '400', subsets: ['latin'], display: 'swap' })

/** Big matte-rubber round face button. A is the console's only pink control. */
export default function RoundBtn({
  label, onPress, size = 92,
}: { label: 'A' | 'B'; onPress: (b: Btn) => void; size?: number }) {
  const [pressed, setPressed] = useState(false)
  const pink = label === 'A'
  const shadow = pink ? PINK_SHADOW : RUBBER_SHADOW
  return (
    <div
      onPointerDown={(e) => { e.preventDefault(); setPressed(true); onPress(label) }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        width: size, height: size, borderRadius: '50%',
        background: pink ? PINK_FACE : RUBBER_FACE,
        boxShadow: shadow,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', touchAction: 'none',
        transition: 'transform 60ms, box-shadow 60ms',
        ...(pressed ? pressedStyle(shadow) : null),
      }}
    >
      <span className={pressStart.className} style={{
        fontSize: size * 0.33,
        color: pink ? 'rgba(122,27,82,0.75)' : 'rgba(247,247,245,0.28)',
        textShadow: '0 2px 2px rgba(0,0,0,0.35), 0 -1px 1px rgba(255,255,255,0.05)',
        transform: 'translateY(1px)',
      }}>
        {label}
      </span>
    </div>
  )
}
