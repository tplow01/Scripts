'use client'

import { Press_Start_2P } from 'next/font/google'
import type { Btn } from './DPad'

const pressStart = Press_Start_2P({ weight: '400', subsets: ['latin'], display: 'swap' })

/** Dark molded round face button (A / B), Delta-style. */
export default function RoundBtn({
  label, onPress, size = 56,
}: { label: 'A' | 'B'; onPress: (b: Btn) => void; size?: number }) {
  return (
    <div
      onPointerDown={(e) => { e.preventDefault(); onPress(label) }}
      style={{
        width: size, height: size, borderRadius: '50%',
        background: 'radial-gradient(circle at 38% 32%, #3B3B36 0%, #232320 55%, #191917 100%)',
        boxShadow: '0 4px 10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -3px 4px rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', touchAction: 'none',
      }}
    >
      <span className={pressStart.className} style={{ fontSize: size * 0.24, color: 'rgba(247,247,245,0.35)' }}>
        {label}
      </span>
    </div>
  )
}
