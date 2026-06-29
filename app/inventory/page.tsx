import type { Metadata } from 'next'
import NavBar from '@/components/NavBar'
import NewsletterFooter from '@/components/NewsletterFooter'
import InventoryGrid from '@/components/InventoryGrid'
import { CYBER_LOVE_PRODUCTS } from '@/lib/products'

export const metadata: Metadata = {
  title: 'Inventory — SCR!PTS',
}

export default function InventoryPage() {
  return (
    <div className="min-h-screen bg-white text-[#0d0d0d] flex flex-col">
      <NavBar showBack />
      <main className="px-4 md:px-16 lg:px-[200px] pb-[64px] pt-8 md:pt-[80px] flex-1">
        <InventoryGrid products={CYBER_LOVE_PRODUCTS} />
      </main>
      <NewsletterFooter />
    </div>
  )
}
