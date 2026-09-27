import { describe, expect, it } from 'vitest'
import { isLikelyBot } from '@/lib/server/botFilter'

describe('isLikelyBot', () => {
  it('flags common crawlers', () => {
    expect(isLikelyBot('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(true)
    expect(isLikelyBot('Mozilla/5.0 (compatible; bingbot/2.0)')).toBe(true)
    expect(isLikelyBot('AhrefsBot/7.0')).toBe(true)
    expect(isLikelyBot('SemrushBot/7~bl')).toBe(true)
    expect(isLikelyBot('curl/8.4.0')).toBe(true)
    expect(isLikelyBot('python-requests/2.31.0')).toBe(true)
  })

  it('does not flag an ordinary browser', () => {
    expect(isLikelyBot('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15')).toBe(false)
  })

  it('treats a missing User-Agent as not a bot (fails open, not closed)', () => {
    expect(isLikelyBot(null)).toBe(false)
  })
})
