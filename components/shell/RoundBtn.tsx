'use client'

import { Press_Start_2P } from 'next/font/google'
import { useState } from 'react'
import type { Btn } from '@/lib/controls'
import { RUBBER_FACE, RUBBER_SHADOW, WORDMARK_PINK, pressedStyle } from './theme'

const pressStart = Press_Start_2P({ weight: '400', subsets: ['latin'], display: 'swap' })

/** Big matte-rubber round face button. Both A and B are black with pink letters. */
export default function RoundBtn({
  label, onPress, size = 92,
}: { label: 'A' | 'B'; onPress: (b: Btn) => void; size?: number }) {
  const [pressed, setPressed] = useState(false)
  return (
    <div
      onPointerDown={(e) => { e.preventDefault(); setPressed(true); onPress(label) }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        width: size, height: size, borderRadius: '50%',
        background: RUBBER_FACE,
        boxShadow: RUBBER_SHADOW,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', touchAction: 'none',
        transition: 'transform 60ms, box-shadow 60ms',
        ...(pressed ? pressedStyle(RUBBER_SHADOW) : null),
      }}
    >
      <span className={pressStart.className} style={{
        fontSize: size * 0.33,
        color: WORDMARK_PINK,
        textShadow: '0 2px 2px rgba(0,0,0,0.35), 0 -1px 1px rgba(255,255,255,0.05)',
        transform: 'translateY(1px)',
      }}>
        {label}
      </span>
    </div>
  )
}
