'use client'

import { useEffect } from 'react'

/**
 * Toggles body.dark-route (see globals.css) for the lifetime of a dark page —
 * the Basement, or a dark-themed product page. Without this, body defaults
 * to paper, and iOS Safari's rubber-band overscroll reveals that white
 * instead of ink beneath the page's own black background.
 */
export default function DarkRouteBody() {
  useEffect(() => {
    document.body.classList.add('dark-route')
    return () => {
      document.body.classList.remove('dark-route')
    }
  }, [])
  return null
}
