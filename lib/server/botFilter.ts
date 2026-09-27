import 'server-only'

/**
 * A courtesy filter, not a security boundary. Catches the obvious crawlers
 * and scripts so they don't skew the funnel numbers; a bot built to look like
 * a real browser sails straight through, and that's an accepted limitation.
 */
const BOT_PATTERN = /bot|crawl|spider|curl|wget|python-requests|headlesschrome|slurp|facebookexternalhit/i

export function isLikelyBot(userAgent: string | null): boolean {
  if (!userAgent) return false
  return BOT_PATTERN.test(userAgent)
}
