'use client'

import type { Btn } from '@/lib/controls'

export type HoldHandlers = {
  onPointerDown: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  onPointerCancel: (e: React.PointerEvent) => void
}

const LOBE = 'linear-gradient(160deg, #2c2c2f 0%, #1a1a1c 55%, #111113 100%)'
const LOBE_INSET = 'inset 0 2px 2px rgba(255,255,255,0.14), inset 0 -3px 5px rgba(0,0,0,0.65)'

/** Fat embossed arrow (Delta-style), drawn as an SVG triangle. */
function Arrow({ dir, size }: { dir: 'up' | 'down' | 'left' | 'right'; size: number }) {
  const s = size
  const points = {
    up: `${s / 2},0 ${s},${s} 0,${s}`,
    down: `0,0 ${s},0 ${s / 2},${s}`,
    left: `${s},0 ${s},${s} 0,${s / 2}`,
    right: `0,0 ${s},${s / 2} 0,${s}`,
  }[dir]
  return (
    <svg width={s} height={s} style={{ opacity: 0.8, filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.06))' }}>
      <polygon points={points} fill="#0a0a0b" />
    </svg>
  )
}

/**
 * Delta-style D-pad: rounded-lobe cross in matte rubber, fat embossed arrows,
 * dished centre circle. Four hold-to-walk pointer zones on top.
 */
export default function DPad({ size, hold }: { size: number; hold: (b: Btn) => HoldHandlers }) {
  const arrow = Math.round(size * 0.19)
  const pad = Math.round(size * 0.08)
  const lobeRadius = size * 0.15
  return (
    <div style={{
      position: 'relative', width: size, height: size, touchAction: 'none',
      filter: 'drop-shadow(0 5px 7px rgba(0,0,0,0.55))',
    }}>
      {/* Rounded lobes */}
      <div style={{ position: 'absolute', top: '29%', left: 0, right: 0, height: '42%', background: LOBE, borderRadius: lobeRadius, boxShadow: LOBE_INSET }} />
      <div style={{ position: 'absolute', left: '29%', top: 0, bottom: 0, width: '42%', background: LOBE, borderRadius: lobeRadius, boxShadow: LOBE_INSET }} />
      {/* Dished centre */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: size * 0.29, height: size * 0.29, borderRadius: '50%',
        background: 'radial-gradient(circle at 40% 32%, #232326, #101012 70%)',
        boxShadow: 'inset 0 3px 5px rgba(0,0,0,0.75), inset 0 -1px 1px rgba(255,255,255,0.07)',
      }} />
      {/* Embossed arrows */}
      <div style={{ position: 'absolute', top: pad, left: '50%', transform: 'translateX(-50%)' }}><Arrow dir="up" size={arrow} /></div>
      <div style={{ position: 'absolute', bottom: pad, left: '50%', transform: 'translateX(-50%)' }}><Arrow dir="down" size={arrow} /></div>
      <div style={{ position: 'absolute', left: pad, top: '50%', transform: 'translateY(-50%)' }}><Arrow dir="left" size={arrow} /></div>
      <div style={{ position: 'absolute', right: pad, top: '50%', transform: 'translateY(-50%)' }}><Arrow dir="right" size={arrow} /></div>
      {/* Hold zones (unchanged behaviour) */}
      <div {...hold('up')} style={{ position: 'absolute', top: 0, left: '28%', width: '44%', height: '40%' }} />
      <div {...hold('down')} style={{ position: 'absolute', bottom: 0, left: '28%', width: '44%', height: '40%' }} />
      <div {...hold('left')} style={{ position: 'absolute', left: 0, top: '28%', width: '40%', height: '44%' }} />
      <div {...hold('right')} style={{ position: 'absolute', right: 0, top: '28%', width: '40%', height: '44%' }} />
    </div>
  )
}
