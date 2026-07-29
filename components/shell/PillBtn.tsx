'use client'

import { Press_Start_2P } from 'next/font/google'
import type { Btn } from '@/lib/controls'

const pressStart = Press_Start_2P({ weight: '400', subsets: ['latin'], display: 'swap' })

/** A dark molded pill button (MENU / SELECT / START) with its label below. */
export default function PillBtn({ label, onPress }: { label: Btn; onPress: (b: Btn) => void }) {
  return (
    <div
      onPointerDown={(e) => { e.preventDefault(); onPress(label) }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer', touchAction: 'none' }}
    >
      <div style={{
        width: 44, height: 13,
        background: 'linear-gradient(180deg, #34342F 0%, #232320 100%)',
        borderRadius: 7,
        boxShadow: '0 2px 5px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -2px 3px rgba(0,0,0,0.5)',
      }} />
      <span className={pressStart.className} style={{ fontSize: 5, color: '#4A4A44', letterSpacing: 0.5 }}>
        {label}
      </span>
    </div>
  )
}
