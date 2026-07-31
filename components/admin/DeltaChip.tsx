const DELTA_STYLE = {
  up: { color: '#5FA36B', bg: 'rgba(95,163,107,0.15)', mark: '▲' },
  down: { color: '#E05252', bg: 'rgba(224,82,82,0.15)', mark: '▼' },
  flat: { color: '#6F6F73', bg: 'rgba(111,111,115,0.18)', mark: '—' },
} as const

/** The ONE delta rendering — used by StatCard and the drill-down headline. */
export default function DeltaChip({ delta, className = '' }: {
  delta: { pct: number; dir: 'up' | 'down' | 'flat' }
  className?: string
}) {
  const s = DELTA_STYLE[delta.dir]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${className}`}
      style={{ background: s.bg, color: s.color }}
    >
      {s.mark} {delta.dir === 'flat' ? 'flat' : `${delta.pct}% vs prev period`}
    </span>
  )
}
