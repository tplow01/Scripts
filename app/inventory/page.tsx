import type { Metadata } from 'next'
import NavBar from '@/components/NavBar'
import NewsletterFooter from '@/components/NewsletterFooter'
import ProductGrid from '@/components/ProductGrid'
import PageEdgeArt from '@/components/PageEdgeArt'
import { CYBER_LOVE_PRODUCTS } from '@/lib/products'

export const metadata: Metadata = {
  title: 'Inventory — SCR!PTS',
}

export default function InventoryPage() {
  return (
    <div className="min-h-screen bg-white text-[#0d0d0d] flex flex-col">
      <PageEdgeArt
        left="/decor/inventory-left.png"
        right="/decor/inventory-right.png"
        leftAlt=""
        rightAlt=""
        mobile="/decor/phone-inventory.png"
        mobileAlt=""
      />
      <NavBar showBack />
      <main className="relative z-10 px-4 md:px-16 lg:px-[200px] pb-[64px] pt-8 md:pt-[80px] flex-1">
        <ProductGrid products={CYBER_LOVE_PRODUCTS} theme="light" columns={3} />
      </main>
      <div className="relative z-10">
        <NewsletterFooter />
      </div>
    </div>
  )
}
