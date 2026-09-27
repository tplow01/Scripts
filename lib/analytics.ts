'use client'

import { ANALYTICS_EVENTS, type ClientAnalyticsEvent } from './analyticsEvents'

const SESSION_KEY = 'scripts-analytics-sid'

/** A random id, no PII, created once per browser and reused forever after. */
export function getAnalyticsSessionId(): string {
  if (typeof window === 'undefined') return 'server'
  try {
    const existing = window.localStorage.getItem(SESSION_KEY)
    if (existing) return existing
    const id = crypto.randomUUID()
    window.localStorage.setItem(SESSION_KEY, id)
    return id
  } catch {
    // Private browsing / storage blocked: a fresh id per call is still better
    // than throwing, and this call site never depends on it being stable.
    return crypto.randomUUID()
  }
}

/**
 * Fire-and-forget. Never awaited by callers, never throws, does nothing on
 * the server. A tracking failure must never break the page — same rule
 * sendEmail already follows for mail on the server side.
 */
export function track(event: ClientAnalyticsEvent, meta?: Record<string, string | number | boolean>): void {
  if (typeof window === 'undefined') return
  try {
    const body = JSON.stringify({
      event,
      sessionId: getAnalyticsSessionId(),
      deviceType: window.matchMedia('(max-width: 639px)').matches ? 'mobile' : 'desktop',
      path: window.location.pathname,
      meta,
    })
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Analytics must never break the page it's tracking.
  }
}

export { ANALYTICS_EVENTS }
