'use client'

/** 12x12 pixel-art glyphs drawn as SVG rect grids (1 unit = 1 "pixel"). */
function Glyph({ kind, muted }: { kind: 'social' | 'inventory' | 'mute' | 'keys'; muted?: boolean }) {
  const px = (pts: Array<[number, number]>, fill: string) =>
    pts.map(([x, y], i) => <rect key={i} x={x} y={y} width={1} height={1} fill={fill} />)
  const ink = '#2B2B27'
  let cells: React.ReactNode = null
  if (kind === 'social') {
    // Link/share: two nodes joined by a diagonal chain
    cells = px([[2,2],[3,2],[2,3],[3,3],[4,4],[5,5],[6,6],[7,7],[8,8],[9,8],[8,9],[9,9]], ink)
  } else if (kind === 'inventory') {
    // Tee shirt
    cells = px([[3,2],[4,2],[7,2],[8,2],[2,3],[3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],[3,4],[8,4],[4,5],[5,5],[6,5],[7,5],[4,6],[7,6],[4,7],[7,7],[4,8],[5,8],[6,8],[7,8]], ink)
  } else if (kind === 'mute') {
    // Speaker cone (+ cross when muted)
    cells = (
      <>
        {px([[2,4],[3,4],[2,5],[3,5],[2,6],[3,6],[4,3],[4,7],[5,2],[5,8],[6,2],[6,3],[6,4],[6,5],[6,6],[6,7],[6,8]], ink)}
        {muted && px([[8,3],[9,4],[10,5],[9,6],[8,7],[10,3],[8,5],[10,7]], '#8B1A42')}
      </>
    )
  } else {
    // Question mark
    cells = px([[4,2],[5,2],[6,2],[3,3],[7,3],[7,4],[6,5],[5,6],[5,7],[5,9]], ink)
  }
  return <svg viewBox="0 0 12 12" width={14} height={14} shapeRendering="crispEdges">{cells}</svg>
}

/**
 * The four out-of-game hardware buttons (Socials / Inventory / Mute / Keys),
 * styled as small angled silkscreened buttons molded into the console body.
 * In-flex only — never absolutely positioned over siblings.
 */
export default function ConsoleUtilityStrip({
  compact = false, muted, active, onAction,
}: {
  compact?: boolean
  muted: boolean
  active: 'social' | 'keys' | null
  onAction: (a: 'social' | 'inventory' | 'mute' | 'keys') => void
}) {
  const actions = ['social', 'inventory', 'mute', 'keys'] as const
  return (
    <div style={{ display: 'flex', gap: compact ? 8 : 12, justifyContent: 'center', alignItems: 'center' }}>
      {actions.map((a, i) => (
        <button
          key={a}
          aria-label={a}
          onClick={() => onAction(a)}
          style={{
            width: compact ? 26 : 30, height: compact ? 20 : 22,
            transform: `rotate(${i % 2 ? 8 : -8}deg)`,
            background: active === a || (a === 'mute' && muted)
              ? 'linear-gradient(180deg, #B9B9AC 0%, #9C9C90 100%)'
              : 'linear-gradient(180deg, #C9C9BD 0%, #ACACA0 100%)',
            border: 'none', borderRadius: 5, padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.35), inset 0 -2px 2px rgba(0,0,0,0.28), 0 2px 3px rgba(0,0,0,0.3)',
            cursor: 'pointer', touchAction: 'manipulation',
          }}
        >
          <Glyph kind={a} muted={muted} />
        </button>
      ))}
    </div>
  )
}
