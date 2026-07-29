'use client'

import type { Btn } from '@/lib/controls'

export type HoldHandlers = {
  onPointerDown: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  onPointerCancel: (e: React.PointerEvent) => void
}

/**
 * One seamless symmetric cross (single SVG path — never two overlapping bars):
 * all four lobes identical, rounded corners, molded-rubber shading, rounded
 * embossed arrows, dished centre. Four hold-to-walk pointer zones on top.
 */
export default function DPad({ size, hold }: { size: number; hold: (b: Btn) => HoldHandlers }) {
  return (
    <div style={{
      position: 'relative', width: size, height: size, touchAction: 'none',
      filter: 'drop-shadow(0 5px 7px rgba(0,0,0,0.4))',
    }}>
      <svg width={size} height={size} viewBox="0 0 84 84">
        <defs>
          <linearGradient id="dpad-rubber" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2c2c2f" />
            <stop offset="1" stopColor="#101012" />
          </linearGradient>
        </defs>
        {/* Symmetric cross: both arms 28 units wide, spanning 4→80. */}
        <path
          d="M35 4 h14 a7 7 0 0 1 7 7 v17 h17 a7 7 0 0 1 7 7 v14 a7 7 0 0 1 -7 7 h-17 v17 a7 7 0 0 1 -7 7 h-14 a7 7 0 0 1 -7 -7 v-17 h-17 a7 7 0 0 1 -7 -7 v-14 a7 7 0 0 1 7 -7 h17 v-17 a7 7 0 0 1 7 -7 z"
          fill="url(#dpad-rubber)"
        />
        {/* Rounded embossed arrows — round stroke joins soften the points. */}
        <g fill="#0a0a0b" stroke="#0a0a0b" strokeWidth="3.5" strokeLinejoin="round">
          <polygon points="42,12 46.5,18.5 37.5,18.5" />
          <polygon points="42,72 46.5,65.5 37.5,65.5" />
          <polygon points="12,42 18.5,37.5 18.5,46.5" />
          <polygon points="72,42 65.5,37.5 65.5,46.5" />
        </g>
        {/* Dished centre */}
        <circle cx="42" cy="42" r="9.5" fill="#0e0e10" />
        <circle cx="42" cy="42" r="9.5" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      </svg>
      {/* Hold zones (unchanged behaviour) */}
      <div {...hold('up')} style={{ position: 'absolute', top: 0, left: '28%', width: '44%', height: '40%' }} />
      <div {...hold('down')} style={{ position: 'absolute', bottom: 0, left: '28%', width: '44%', height: '40%' }} />
      <div {...hold('left')} style={{ position: 'absolute', left: 0, top: '28%', width: '40%', height: '44%' }} />
      <div {...hold('right')} style={{ position: 'absolute', right: 0, top: '28%', width: '40%', height: '44%' }} />
    </div>
  )
}
