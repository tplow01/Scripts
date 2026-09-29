import type { Metadata, Viewport } from 'next'
import NavBar from '@/components/NavBar'
import NewsletterFooter from '@/components/NewsletterFooter'
import ProductGrid from '@/components/ProductGrid'
import PageEdgeArt from '@/components/PageEdgeArt'
import TrackPageView from '@/components/TrackPageView'
import { listStorefrontProducts } from '@/lib/server/products.repo'
import { toStorefrontProduct } from '@/lib/storefront'

export const metadata: Metadata = {
  title: 'Inventory — SCR!PTS',
}

// Rebuild at most once a minute, so a price or stock edit in the back office
// reaches the storefront without a deploy.
export const revalidate = 60

// Best-effort: a plain (non-home-screen) Safari tab paints its native
// status-bar chrome from its own default regardless of this, so it won't
// reliably tint that strip white here — but it's harmless, and does help in
// Chrome/Android and if the page is ever added to the home screen.
export const viewport: Viewport = {
  themeColor: '#f7f7f5',
}

export default async function InventoryPage() {
  const products = (await listStorefrontProducts()).map(toStorefrontProduct)

  return (
    <div className="min-h-screen bg-white text-[#0d0d0d] flex flex-col">
      <TrackPageView event="inventory_view" />
      <PageEdgeArt
        left="/decor/inventory-left.png"
        right="/decor/inventory-right.png"
        leftAlt=""
        rightAlt=""
        mobile="/decor/phone-inventory.png"
        mobileAlt=""
      />
      <NavBar showBack titleIsH1 />
      <main className="relative z-10 px-4 md:px-16 lg:px-[200px] pb-[64px] pt-8 md:pt-[80px] flex-1">
        <ProductGrid products={products} theme="light" columns={3} />
      </main>
      {/* Phone (< lg): opaque white band so the fixed full-bleed PageEdgeArt
          stops and the footer reads as its own section. Desktop unchanged. */}
      <div className="relative z-10 bg-white lg:bg-transparent">
        <NewsletterFooter />
      </div>
    </div>
  )
}
