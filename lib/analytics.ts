'use client'

import { ANALYTICS_EVENTS, type ClientAnalyticsEvent } from './analyticsEvents'

const SESSION_KEY = 'scripts-analytics-sid'

// Memoized for the lifetime of the page. Without this, a browser with
// localStorage blocked (private browsing, blocked site data) would mint a
// fresh id on every call: track('checkout_started') and the id sent in the
// checkout POST body would never match, and every track() call anywhere else
// would look like a brand new visitor, inflating funnel/visitor counts.
let cachedSessionId: string | null = null

/**
 * crypto.randomUUID() is unavailable in some non-secure contexts (e.g. a LAN
 * IP dev server) or older browsers, and can throw. This is an anonymous
 * analytics id, not a security token, so a non-crypto fallback is fine — the
 * only requirement is that it never throws.
 */
function generateId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  }
}

/** A random id, no PII, created once per browser and reused forever after. */
export function getAnalyticsSessionId(): string {
  if (cachedSessionId) return cachedSessionId
  if (typeof window === 'undefined') return 'server'
  try {
    const existing = window.localStorage.getItem(SESSION_KEY)
    if (existing) {
      cachedSessionId = existing
      return existing
    }
    const id = generateId()
    window.localStorage.setItem(SESSION_KEY, id)
    cachedSessionId = id
    return id
  } catch {
    // Storage blocked (private browsing, etc). Still memoize in-module so
    // every call in this page's lifetime returns the SAME id — see the
    // comment on cachedSessionId above for why that matters.
    const id = generateId()
    cachedSessionId = id
    return id
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
