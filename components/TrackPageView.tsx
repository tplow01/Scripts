'use client'

import { useEffect } from 'react'
import { track } from '@/lib/analytics'

/**
 * The inventory/basement pages are server components (they fetch the catalog
 * server-side), so they can't call the client-only `track()` themselves.
 * This is the bridge: render it once, it fires on mount, it renders nothing.
 */
export default function TrackPageView({ event }: { event: 'inventory_view' | 'basement_view' }) {
  useEffect(() => {
    track(event)
  }, [event])
  return null
}
