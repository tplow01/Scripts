/** Hand-rolled inline SVG charts — pure presentational, no chart library. */

const W = 100 // internal viewBox width; SVG stretches to fill the card

function scaleY(values: number[], height: number): (v: number) => number {
  const max = Math.max(...values, 1)
  return (v) => height - (v / max) * (height - 4) // 4px headroom
}

/** Multi-series line chart. Empty/single-point series render a flat baseline, never a broken path. */
export function LineChart({ series, height = 56 }: {
  series: { color: string; points: number[]; label: string }[]
  height?: number
}) {
  const all = series.flatMap((s) => s.points)
  const y = scaleY(all, height)
  return (
    <div>
      <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" role="img" aria-label={series.map((s) => s.label).join(' & ')}>
        <line x1="0" y1={height - 0.5} x2={W} y2={height - 0.5} stroke="rgba(111,111,115,0.35)" strokeWidth="1" />
        {series.map((s) => {
          if (s.points.length === 0) return null
          const step = s.points.length > 1 ? W / (s.points.length - 1) : W
          const d = s.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(2)},${y(p).toFixed(2)}`).join(' ')
          return <path key={s.label} d={s.points.length > 1 ? d : `M0,${y(s.points[0])} L${W},${y(s.points[0])}`} fill="none" stroke={s.color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        })}
      </svg>
      <div className="mt-1.5 flex gap-4">
        {series.map((s) => (
          <span key={s.label} className="text-[8px] uppercase tracking-[0.1em]" style={{ color: s.color }}>— {s.label}</span>
        ))}
      </div>
    </div>
  )
}

/** Daily bar chart; zero-value days render no bar. Empty values render just the baseline. */
export function BarChart({ values, height = 56, color = '#FF8AC7' }: {
  values: { label: string; value: number }[]
  height?: number
  color?: string
}) {
  const y = scaleY(values.map((v) => v.value), height)
  const slot = values.length > 0 ? W / values.length : W
  const barW = Math.max(slot * 0.6, 1)
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" role="img" aria-label="bar chart">
      <line x1="0" y1={height - 0.5} x2={W} y2={height - 0.5} stroke="rgba(111,111,115,0.35)" strokeWidth="1" />
      {values.map((v, i) =>
        v.value > 0 ? (
          <rect key={v.label} x={(i * slot + (slot - barW) / 2).toFixed(2)} y={y(v.value).toFixed(2)} width={barW.toFixed(2)} height={(height - y(v.value)).toFixed(2)} fill={color} opacity="0.85">
            <title>{`${v.label}: ${v.value}`}</title>
          </rect>
        ) : null)}
    </svg>
  )
}
