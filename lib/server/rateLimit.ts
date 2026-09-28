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
  /** The window this bucket's hits were last filtered against, so a sweep
   *  triggered by a DIFFERENT key can still correctly decide this one is idle. */
  windowMs: number
}

const buckets = new Map<string, Bucket>()

/**
 * Deleting only the CURRENT key's bucket when it goes empty would not fix the
 * leak this exists for: a key that is called once and never again is never
 * revisited, so its own bucket would never get a chance to self-prune. Instead,
 * every call sweeps the whole map for buckets whose hits have all aged out of
 * their own window — so any traffic at all, from any key, eventually frees
 * every idle bucket. This is O(number of tracked keys) per call, which is fine
 * at this endpoint's traffic level; it is not a substitute for a real cap on
 * distinct keys under sustained abuse from many different callers.
 */
function pruneIdleBuckets(now: number): void {
  for (const [k, b] of buckets) {
    const stillLive = b.hits.some((t) => now - t < b.windowMs)
    if (!stillLive) buckets.delete(k)
  }
}

export function checkRateLimit(
  key: string,
  { limit = 5, windowMs = 60_000 }: { limit?: number; windowMs?: number } = {},
): boolean {
  const now = Date.now()
  pruneIdleBuckets(now)

  const bucket = buckets.get(key) ?? { hits: [], windowMs }
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs)
  bucket.windowMs = windowMs

  if (bucket.hits.length >= limit) {
    buckets.set(key, bucket)
    return false
  }

  bucket.hits.push(now)
  buckets.set(key, bucket)
  return true
}

/** Test-only: lets tests confirm idle buckets are actually evicted. */
export function _debugBucketCount(): number {
  return buckets.size
}
