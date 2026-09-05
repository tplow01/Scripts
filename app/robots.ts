import type { MetadataRoute } from 'next'

import { siteUrl } from '@/lib/server/siteUrl'

/**
 * robots.txt.
 *
 * Deliberately lists NOTHING secret. robots.txt is a public file, so a
 * `Disallow: /office-scr1pts-x7k2` or a Basement path would announce the very
 * things that are meant to be undiscoverable — the classic way people leak an
 * admin URL. Both are kept out of search by `noindex` metadata on the pages
 * themselves, which hides without advertising.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Nothing sensitive, just not useful to crawl.
      disallow: '/api/',
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  }
}
