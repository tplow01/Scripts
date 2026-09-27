'use client'

import { useState } from 'react'
import Card from '@/components/admin/Card'
import type { MetricRange } from '@/components/admin/MetricShell'
import { useAnalytics } from '@/lib/admin/useAnalytics'
import { ANALYTICS_EVENTS } from '@/lib/analyticsEvents'

const RANGES: MetricRange[] = [7, 14, 30]

const LABELS: Record<string, string> = {
  click_to_start: 'Clicked start',
  inventory_shortcut: 'Skipped to Inventory',
  npc_interaction: 'Talked to a character',
  karl_interaction: 'Talked to Karl',
  vinyl_interaction: 'Touched the vinyl',
  basement_discovered: 'Found the Basement',
  inventory_view: 'Viewed Inventory',
  basement_view: 'Viewed the Basement',
  product_click_inventory: 'Clicked a product (Inventory)',
  product_click_basement: 'Clicked a product (Basement)',
  add_to_cart: 'Added to cart',
  checkout_started: 'Started checkout',
  purchase: 'Purchased',
}

/**
 * Every event's own distinct-session count, in the order a visitor actually
 * reaches them. This is deliberately NOT one strict decreasing funnel (a
 * visitor can e.g. talk to an NPC after viewing Inventory, out of the literal
 * "step 3 then step 4" order) — each row is just "how many sessions did this,
 * at all", with the percentage read against the very first step (arrivals).
 */
export default function FunnelPage() {
  const [range, setRange] = useState<MetricRange>(14)
  const { bundle, loading } = useAnalytics(range)

  const counts = new Map((bundle?.funnel ?? []).map((f) => [f.event, f.sessions]))
  const arrivals = counts.get('click_to_start') ?? 0

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[32px] sm:text-[40px] leading-none uppercase tracking-[0.04em]" style={{ fontFamily: 'var(--font-bebas)' }}>
          Funnel
        </h1>
        <div className="flex shrink-0 rounded-lg border border-grey/30 overflow-hidden" role="group" aria-label="Time range">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={range === r}
              onClick={() => setRange(r)}
              className={`px-3 sm:px-4 py-2 text-[11px] sm:text-[12px] font-semibold transition-colors ${
                range === r ? 'bg-pink text-ink' : 'text-grey hover:text-paper'
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      <Card className="mt-6" title={`Last ${range} days`}>
        {loading && <p className="text-[12px] text-grey">Loading…</p>}
        {!loading && arrivals === 0 && <p className="text-[12px] text-grey">No sessions yet in this range.</p>}
        {!loading && arrivals > 0 && (
          <ul className="divide-y divide-grey/15">
            {ANALYTICS_EVENTS.map((event) => {
              const sessions = counts.get(event) ?? 0
              const pct = arrivals > 0 ? Math.round((sessions / arrivals) * 100) : 0
              return (
                <li key={event} className="flex items-center gap-4 py-3 text-[13px]">
                  <span className="min-w-0 flex-1 truncate text-paper/90">{LABELS[event] ?? event}</span>
                  <div className="h-2 w-24 sm:w-40 rounded-full bg-[#101010] overflow-hidden shrink-0">
                    <div className="h-full bg-pink" style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                  <span className="w-16 shrink-0 text-right tabular-nums text-paper/80">{sessions.toLocaleString()}</span>
                  <span className="w-12 shrink-0 text-right tabular-nums text-grey">{pct}%</span>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
