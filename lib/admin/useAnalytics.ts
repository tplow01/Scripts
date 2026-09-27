'use client'

import { useEffect, useRef, useState } from 'react'
import type { MetricRange } from '@/components/admin/MetricShell'
import type { AnalyticsBundle } from '@/lib/server/analytics.repo'

/**
 * One fetch-on-range-change hook shared by the Overview page, the Visitors
 * metric drill-down and the Funnel page — the three places that need this
 * bundle — following the same cancelled-flag/try-catch-finally shape
 * lib/admin/store.tsx already uses for products/orders.
 */
export function useAnalytics(days: MetricRange): { bundle: AnalyticsBundle | null; loading: boolean } {
  const [bundle, setBundle] = useState<AnalyticsBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false
    setLoading(true)
    void (async () => {
      try {
        const res = await fetch(`/api/admin/analytics?days=${days}`)
        if (!res.ok) throw new Error('Could not load analytics.')
        const data = (await res.json()) as AnalyticsBundle
        if (!cancelledRef.current) setBundle(data)
      } catch {
        // Leave `bundle` as whatever it last was (or null) — the pages below
        // already render sensible empty states for null/empty data.
      } finally {
        if (!cancelledRef.current) setLoading(false)
      }
    })()
    return () => {
      cancelledRef.current = true
    }
  }, [days])

  return { bundle, loading }
}
