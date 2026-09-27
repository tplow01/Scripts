import 'server-only'

/**
 * A tiny in-memory, per-instance sliding-window limiter.
 *
 * This is not a distributed limiter — each serverless instance keeps its own
 * counts, so the real ceiling under load is `limit × concurrent instances`.
 * That is deliberate: nothing here has a shared store (Redis, etc.) to talk
 * to, and the goal is only to stop a single script hammering an endpoint from
 * one connection, not to enforce an exact global quota.
 */

interface Bucket {
  hits: number[]
}

const buckets = new Map<string, Bucket>()

export function checkRateLimit(
  key: string,
  { limit = 5, windowMs = 60_000 }: { limit?: number; windowMs?: number } = {},
): boolean {
  const now = Date.now()
  const bucket = buckets.get(key) ?? { hits: [] }
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs)

  if (bucket.hits.length >= limit) {
    buckets.set(key, bucket)
    return false
  }

  bucket.hits.push(now)
  buckets.set(key, bucket)
  return true
}
