import 'server-only'

/**
 * The site's public origin, for absolute URLs in metadata.
 *
 * Vercel sets VERCEL_PROJECT_PRODUCTION_URL to the production domain, which
 * follows a custom domain once one is attached. NEXT_PUBLIC_SITE_URL overrides
 * it when we want something explicit.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/$/, '')

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercel) return `https://${vercel}`

  return 'http://localhost:3000'
}
