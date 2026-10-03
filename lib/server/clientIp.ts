import 'server-only'

/**
 * The caller's IP, for rate-limit keys. Same rules as the analytics route:
 * prefer x-real-ip (set by the proxy, not forgeable by the client), then the
 * LAST x-forwarded-for hop. The first hop is whatever the client sent, so
 * trusting it would let one connection mint unlimited rate-limit keys.
 */
export function clientIp(req: Request): string {
  const realIp = req.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp

  const chain = req.headers.get('x-forwarded-for')
  if (chain) {
    const hops = chain.split(',').map((h) => h.trim()).filter(Boolean)
    if (hops.length) return hops[hops.length - 1]
  }

  return 'unknown'
}
