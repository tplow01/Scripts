'use client'

export type Btn = 'up' | 'down' | 'left' | 'right' | 'A' | 'B' | 'MENU' | 'SELECT' | 'START'

export type HoldHandlers = {
  onPointerDown: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  onPointerCancel: (e: React.PointerEvent) => void
}

const ARM = 'linear-gradient(180deg, #34342F 0%, #232320 100%)'

/** Etched arrow triangle pointing in a direction (Delta-style D-pad face). */
function Arrow({ dir, size }: { dir: 'up' | 'down' | 'left' | 'right'; size: number }) {
  const s = size
  const points = {
    up: `${s / 2},0 ${s},${s} 0,${s}`,
    down: `0,0 ${s},0 ${s / 2},${s}`,
    left: `${s},0 ${s},${s} 0,${s / 2}`,
    right: `0,0 ${s},${s / 2} 0,${s}`,
  }[dir]
  return (
    <svg width={s} height={s} style={{ opacity: 0.5 }}>
      <polygon points={points} fill="#141412" />
    </svg>
  )
}

/**
 * Molded D-pad cross: dark charcoal arms with etched arrow triangles and a
 * centre dot, four hold-to-walk pointer zones on top.
 */
export default function DPad({ size, hold }: { size: number; hold: (b: Btn) => HoldHandlers }) {
  const arrow = Math.round(size * 0.11)
  const pad = Math.round(size * 0.075)
  return (
    <div style={{ position: 'relative', width: size, height: size, touchAction: 'none' }}>
      {/* Arms */}
      <div style={{
        position: 'absolute', top: '34%', left: 0, right: 0, height: '32%',
        background: ARM, borderRadius: size * 0.09,
        boxShadow: '0 3px 6px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -2px 3px rgba(0,0,0,0.5)',
      }} />
      <div style={{
        position: 'absolute', left: '34%', top: 0, bottom: 0, width: '32%',
        background: ARM, borderRadius: size * 0.09,
        boxShadow: '0 3px 6px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -2px 3px rgba(0,0,0,0.5)',
      }} />
      {/* Centre dot */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: size * 0.18, height: size * 0.18, borderRadius: '50%',
        background: 'radial-gradient(circle at 40% 35%, #3A3A35, #1D1D1B)',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6)',
      }} />
      {/* Etched arrows */}
      <div style={{ position: 'absolute', top: pad, left: '50%', transform: 'translateX(-50%)' }}><Arrow dir="up" size={arrow} /></div>
      <div style={{ position: 'absolute', bottom: pad, left: '50%', transform: 'translateX(-50%)' }}><Arrow dir="down" size={arrow} /></div>
      <div style={{ position: 'absolute', left: pad, top: '50%', transform: 'translateY(-50%)' }}><Arrow dir="left" size={arrow} /></div>
      <div style={{ position: 'absolute', right: pad, top: '50%', transform: 'translateY(-50%)' }}><Arrow dir="right" size={arrow} /></div>
      {/* Hold zones */}
      <div {...hold('up')} style={{ position: 'absolute', top: 0, left: '28%', width: '44%', height: '40%' }} />
      <div {...hold('down')} style={{ position: 'absolute', bottom: 0, left: '28%', width: '44%', height: '40%' }} />
      <div {...hold('left')} style={{ position: 'absolute', left: 0, top: '28%', width: '40%', height: '44%' }} />
      <div {...hold('right')} style={{ position: 'absolute', right: 0, top: '28%', width: '40%', height: '44%' }} />
    </div>
  )
}
