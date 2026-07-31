'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { adminPath } from '@/lib/admin/config'

export type MetricRange = 7 | 14 | 30
const RANGES: MetricRange[] = [7, 14, 30]

const DELTA_STYLE = {
  up: { color: '#5FA36B', mark: '▲' },
  down: { color: '#E05252', mark: '▼' },
  flat: { color: '#6F6F73', mark: '—' },
} as const

/** Shared SaaS drill-down frame: breadcrumb, headline + delta, range pills, crossfading chart, content below. */
export default function MetricShell({ title, headline, delta, range, onRange, chart, children }: {
  title: string
  headline: string
  delta?: { pct: number; dir: 'up' | 'down' | 'flat' }
  range: MetricRange
  onRange: (r: MetricRange) => void
  chart: ReactNode
  children: ReactNode
}) {
  const d = delta ? DELTA_STYLE[delta.dir] : null
  return (
    <div>
      <nav className="text-[12px] text-grey">
        <Link href={adminPath()} className="hover:text-paper transition-colors">Overview</Link>
        <span className="mx-2">/</span>
        <span className="text-paper/80">{title}</span>
      </nav>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[40px] leading-none uppercase tracking-[0.04em]" style={{ fontFamily: 'var(--font-bebas)' }}>
            {title}
          </h1>
          <p className="mt-2 flex items-baseline gap-3">
            <span className="text-[36px] leading-none uppercase tracking-[0.04em] tabular-nums" style={{ fontFamily: 'var(--font-bebas)' }}>
              {headline}
            </span>
            {delta && d && (
              <span className="text-[11px]" style={{ color: d.color }}>
                {d.mark} {delta.dir === 'flat' ? 'flat' : `${delta.pct}% vs prev period`}
              </span>
            )}
          </p>
        </div>
        <div className="flex rounded-lg border border-grey/30 overflow-hidden" role="group" aria-label="Time range">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={range === r}
              onClick={() => onRange(r)}
              className={`px-4 py-2 text-[12px] font-semibold transition-colors ${
                range === r ? 'bg-pink text-ink' : 'text-grey hover:text-paper'
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      {/* key={range} remounts the chart block so the 150ms fade-in plays on every range change */}
      <div key={range} className="mt-6 animate-[fadeIn_150ms_ease-out]" style={{ animationFillMode: 'backwards' }}>
        {chart}
      </div>
      <style jsx global>{`@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>

      <div className="mt-4 space-y-4">{children}</div>
    </div>
  )
}
