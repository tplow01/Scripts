import type { Metadata } from 'next'
import BasementNavBar from '@/components/BasementNavBar'
import ProductGrid from '@/components/ProductGrid'
import BasementFooter from '@/components/BasementFooter'
import PageEdgeArt from '@/components/PageEdgeArt'
import { BASEMENT_PRODUCTS } from '@/lib/products'

export const metadata: Metadata = {
  title: 'The Basement — SCR!PTS',
  robots: { index: false, follow: false },
}

export default function BasementPage() {
  return (
    <div className="min-h-screen bg-[#0d0d0d] text-[#f7f7f5] flex flex-col">
      <PageEdgeArt
        left="/decor/basement-left.png"
        right="/decor/basement-right.png"
        leftAlt=""
        rightAlt=""
        mobile="/decor/phone-basement.png"
        mobileAlt=""
      />
      <BasementNavBar backHref="/" />
      <main className="relative z-10 px-4 md:px-16 lg:px-[200px] pb-[64px] pt-8 md:pt-[80px] flex-1">
        <ProductGrid products={BASEMENT_PRODUCTS} theme="dark" columns={2} />
      </main>
      <div className="relative z-10">
        <BasementFooter />
      </div>
    </div>
  )
}
