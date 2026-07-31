'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { adminPath } from '@/lib/admin/config'
import Card from './Card'
import DeltaChip from './DeltaChip'

export type MetricRange = 7 | 14 | 30
const RANGES: MetricRange[] = [7, 14, 30]

/**
 * Shared SaaS drill-down frame. The sticky bar IS the page title — back control,
 * metric name and range pills stay reachable however far the page is scrolled.
 * Negative margins let it bleed to the viewport edges inside the padded <main>.
 */
export default function MetricShell({ title, headlineLabel, headline, delta, range, onRange, chart, children }: {
  title: string
  headlineLabel: string
  headline: string
  delta?: { pct: number; dir: 'up' | 'down' | 'flat' }
  range: MetricRange
  onRange: (r: MetricRange) => void
  chart: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 lg:-mx-8 -mt-6 lg:-mt-8 px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3 border-b border-grey/25 bg-ink/95 backdrop-blur">
        <Link
          href={adminPath()}
          aria-label="Back to Overview"
          className="flex items-center gap-2 shrink-0 rounded-lg border border-grey/30 px-2.5 py-2 text-[12px] text-paper/80 hover:text-paper hover:border-grey/60 transition-colors"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Overview</span>
        </Link>

        <div className="min-w-0">
          <span className="sm:hidden block text-[9px] uppercase tracking-[0.16em] text-grey leading-none">Overview</span>
          <h1 className="text-[20px] sm:text-[24px] leading-none uppercase tracking-[0.04em] truncate" style={{ fontFamily: 'var(--font-bebas)' }}>
            {title}
          </h1>
        </div>

        <div className="ml-auto flex shrink-0 rounded-lg border border-grey/30 overflow-hidden" role="group" aria-label="Time range">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={range === r}
              onClick={() => onRange(r)}
              className={`px-3 sm:px-4 py-2 text-[11px] sm:text-[12px] font-semibold transition-colors ${
                range === r ? 'bg-pink text-ink' : 'text-grey hover:text-paper'
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      <Card className="mt-6 text-center sm:text-left">
        <p className="text-[11px] uppercase tracking-[0.14em] text-grey">{headlineLabel}</p>
        <p className="mt-2 text-[44px] sm:text-[56px] leading-none uppercase tracking-[0.04em] tabular-nums" style={{ fontFamily: 'var(--font-bebas)' }}>
          {headline}
        </p>
        {delta && <DeltaChip delta={delta} className="mt-3" />}
      </Card>

      {/* key={range} remounts the chart block so the 150ms fade-in plays on every range change */}
      <div key={range} className="mt-4 animate-[fadeIn_150ms_ease-out]" style={{ animationFillMode: 'backwards' }}>
        {chart}
      </div>
      <style jsx global>{`@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>

      <div className="mt-4 space-y-4">{children}</div>
    </div>
  )
}
