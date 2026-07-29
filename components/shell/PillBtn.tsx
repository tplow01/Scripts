'use client'

import { useState } from 'react'
import { PILL_FACE, PILL_SHADOW, pressedStyle } from './theme'

/** Wide molded rubber pill with its label engraved inside (SOCIALS / INVENTORY / MUTE / ?). */
export default function PillBtn({
  label, onPress, height = 30, active = false,
}: { label: string; onPress: () => void; height?: number; active?: boolean }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      aria-label={label}
      onPointerDown={(e) => { e.preventDefault(); setPressed(true); onPress() }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        height, padding: `0 ${Math.round(height * 0.7)}px`, border: 'none',
        borderRadius: height / 2,
        background: PILL_FACE, boxShadow: PILL_SHADOW,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', touchAction: 'manipulation',
        fontFamily: 'sans-serif', fontWeight: 800,
        fontSize: Math.max(9, Math.round(height * 0.34)), letterSpacing: 1.5,
        color: active ? '#FF8AC7' : 'rgba(255,255,255,0.78)',
        textShadow: '0 -1px 1px rgba(0,0,0,0.85), 0 1px 1px rgba(255,255,255,0.1)',
        transition: 'transform 60ms, box-shadow 60ms',
        ...(pressed ? pressedStyle(PILL_SHADOW) : null),
      }}
    >
      {label}
    </button>
  )
}
