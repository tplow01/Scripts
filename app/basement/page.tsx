import type { Metadata, Viewport } from 'next'
import BasementNavBar from '@/components/BasementNavBar'
import ProductGrid from '@/components/ProductGrid'
import BasementFooter from '@/components/BasementFooter'
import PageEdgeArt from '@/components/PageEdgeArt'
import TrackPageView from '@/components/TrackPageView'
import DarkRouteBody from '@/components/DarkRouteBody'
import { listBasementProducts } from '@/lib/server/products.repo'
import { toStorefrontProduct } from '@/lib/storefront'

export const metadata: Metadata = {
  title: 'The Basement — SCR!PTS',
  robots: { index: false, follow: false },
}

export const revalidate = 60

// Best-effort: a plain (non-home-screen) Safari tab paints its native
// status-bar chrome from its own default regardless of this, so it won't
// reliably tint that strip black here — but it's harmless, and does help in
// Chrome/Android and if the page is ever added to the home screen.
export const viewport: Viewport = {
  themeColor: '#0d0d0d',
}

export default async function BasementPage() {
  const products = (await listBasementProducts()).map(toStorefrontProduct)

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-[#f7f7f5] flex flex-col">
      <DarkRouteBody />
      <TrackPageView event="basement_view" />
      <PageEdgeArt
        left="/decor/basement-left.png"
        right="/decor/basement-right.png"
        leftAlt=""
        rightAlt=""
        mobile="/decor/phone-basement.png"
        mobileAlt=""
      />
      <BasementNavBar backHref="/" titleIsH1 />
      <main className="relative z-10 px-4 md:px-16 lg:px-[200px] pb-[64px] pt-8 md:pt-[80px] flex-1">
        <ProductGrid products={products} theme="dark" columns={2} />
      </main>
      {/* Phone (< lg): opaque band so the fixed full-bleed PageEdgeArt stops
          and the footer reads as its own section. Desktop unchanged. */}
      <div className="relative z-10 bg-[#0d0d0d] lg:bg-transparent">
        <BasementFooter />
      </div>
    </div>
  )
}
