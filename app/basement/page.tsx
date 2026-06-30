import type { Metadata } from 'next'
import BasementNavBar from '@/components/BasementNavBar'
import BasementGrid from '@/components/BasementGrid'
import BasementFooter from '@/components/BasementFooter'
import { BASEMENT_PRODUCTS } from '@/lib/products'

export const metadata: Metadata = {
  title: 'The Basement — SCR!PTS',
  robots: { index: false, follow: false },
}

export default function BasementPage() {
  return (
    <div className="min-h-screen bg-[#0d0d0d] text-[#f7f7f5] flex flex-col">
      <BasementNavBar backHref="/" />
      <main className="px-4 md:px-16 lg:px-[200px] pb-[64px] pt-8 md:pt-[80px] flex-1">
        <BasementGrid products={BASEMENT_PRODUCTS} />
      </main>
      <BasementFooter />
    </div>
  )
}
