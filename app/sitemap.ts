import type { MetadataRoute } from 'next'

import { listStorefrontProducts } from '@/lib/server/products.repo'
import { siteUrl } from '@/lib/server/siteUrl'

export const revalidate = 3600

/**
 * Storefront pages only.
 *
 * `listStorefrontProducts()` filters on `is_basement = false`, so Basement
 * pieces can never reach the sitemap — the same column that drives their
 * noindex tag and the database's read policy. One flag, three defences.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/inventory`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
  ]

  const products = await listStorefrontProducts()
  return [
    ...staticPages,
    ...products.map((p) => ({
      url: `${base}/products/${p.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
