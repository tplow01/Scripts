'use client'

/** Hand-rolled inline SVG charts — pure presentational, no chart library. */

import { useState } from 'react'

const W = 100 // internal viewBox width; SVG stretches to fill the card

function scaleY(values: number[], height: number): (v: number) => number {
  const max = Math.max(...values, 1)
  return (v) => height - (v / max) * (height - 4) // 4px headroom
}

/** First / middle / last labels under a chart. */
function Ticks({ ticks }: { ticks: string[] }) {
  if (ticks.length === 0) return null
  const shown = [ticks[0], ticks[Math.floor(ticks.length / 2)], ticks[ticks.length - 1]]
  return (
    <div className="mt-1 flex justify-between text-[8px] uppercase tracking-[0.08em] text-grey">
      {shown.map((t, i) => <span key={`${t}-${i}`}>{t}</span>)}
    </div>
  )
}

/**
 * Hover/tap readout: invisible per-index hit columns + a tooltip and guide line.
 * `rows` = the readout lines for index i. Clamped so the tooltip never leaves the chart box.
 */
function Readout({ count, hover, setHover, height, rows }: {
  count: number
  hover: number | null
  setHover: (i: number | null) => void
  height: number
  rows: (i: number) => { label: string; lines: string[] }
}) {
  if (count === 0) return null
  return (
    <div className="absolute inset-x-0 top-0" style={{ height }} onMouseLeave={() => setHover(null)}>
      <div className="absolute inset-0 flex">
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className="flex-1 h-full"
            onMouseEnter={() => setHover(i)}
            onPointerDown={() => setHover(hover === i ? null : i)}
          />
        ))}
      </div>
      {hover !== null && (() => {
        const { label, lines } = rows(hover)
        const centre = ((hover + 0.5) / count) * 100
        const translate = centre < 15 ? '0%' : centre > 85 ? '-100%' : '-50%'
        return (
          <>
            <div className="absolute top-0 bottom-0 w-px bg-paper/25 pointer-events-none" style={{ left: `${centre}%` }} />
            <div
              className="absolute -top-1 -translate-y-full pointer-events-none rounded-lg border border-grey/30 bg-[#0f0f0f] px-2.5 py-1.5 shadow-lg"
              style={{ left: `${centre}%`, transform: `translate(${translate}, -100%)` }}
            >
              <p className="text-[8px] uppercase tracking-[0.08em] text-grey whitespace-nowrap">{label}</p>
              {lines.map((l) => <p key={l} className="text-[11px] text-paper whitespace-nowrap tabular-nums">{l}</p>)}
            </div>
          </>
        )
      })()}
    </div>
  )
}

/** Multi-series line chart. Empty/single-point series render a flat baseline, never a broken path. */
export function LineChart({ series, height = 56, ticks, labels }: {
  series: { color: string; points: number[]; label: string }[]
  height?: number
  ticks?: string[]
  labels?: string[]
}) {
  const [hover, setHover] = useState<number | null>(null)
  const all = series.flatMap((s) => s.points)
  const y = scaleY(all, height)
  const count = labels?.length ?? 0
  return (
    <div>
      <div className="relative">
        <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" role="img" aria-label={series.map((s) => s.label).join(' & ')}>
          <line x1="0" y1={height - 0.5} x2={W} y2={height - 0.5} stroke="rgba(111,111,115,0.35)" strokeWidth="1" />
          {series.map((s) => {
            if (s.points.length === 0) return null
            const step = s.points.length > 1 ? W / (s.points.length - 1) : W
            const d = s.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(2)},${y(p).toFixed(2)}`).join(' ')
            return <path key={s.label} d={s.points.length > 1 ? d : `M0,${y(s.points[0])} L${W},${y(s.points[0])}`} fill="none" stroke={s.color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          })}
        </svg>
        {labels && (
          <Readout
            count={count} hover={hover} setHover={setHover} height={height}
            rows={(i) => ({ label: labels[i], lines: series.map((s) => `${s.label}: ${s.points[i]?.toLocaleString() ?? '—'}`) })}
          />
        )}
      </div>
      {ticks && <Ticks ticks={ticks} />}
      <div className="mt-1.5 flex gap-4">
        {series.map((s) => (
          <span key={s.label} className="text-[8px] uppercase tracking-[0.1em]" style={{ color: s.color }}>— {s.label}</span>
        ))}
      </div>
    </div>
  )
}

/** Daily bar chart; zero-value days render no bar. Empty values render just the baseline. */
export function BarChart({ values, height = 56, color = '#FF8AC7', ticks }: {
  values: { label: string; value: number }[]
  height?: number
  color?: string
  ticks?: string[]
}) {
  const [hover, setHover] = useState<number | null>(null)
  const y = scaleY(values.map((v) => v.value), height)
  const slot = values.length > 0 ? W / values.length : W
  const barW = Math.max(slot * 0.6, 1)
  return (
    <div>
      <div className="relative">
        <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" role="img" aria-label="bar chart">
          <line x1="0" y1={height - 0.5} x2={W} y2={height - 0.5} stroke="rgba(111,111,115,0.35)" strokeWidth="1" />
          {values.map((v, i) =>
            v.value > 0 ? (
              <rect key={v.label} x={(i * slot + (slot - barW) / 2).toFixed(2)} y={y(v.value).toFixed(2)} width={barW.toFixed(2)} height={(height - y(v.value)).toFixed(2)} fill={color} opacity={hover === null || hover === i ? 0.85 : 0.4}>
                <title>{`${v.label}: ${v.value}`}</title>
              </rect>
            ) : null)}
        </svg>
        <Readout
          count={values.length} hover={hover} setHover={setHover} height={height}
          rows={(i) => ({ label: values[i].label, lines: [values[i].value.toLocaleString()] })}
        />
      </div>
      {ticks && <Ticks ticks={ticks} />}
    </div>
  )
}
