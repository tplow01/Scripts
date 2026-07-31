'use client'

import { ArrowLeft, LayoutDashboard, Package, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { adminPath } from '@/lib/admin/config'

const NAV = [
  { href: adminPath(), label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: adminPath('products'), label: 'Products', icon: Package, exact: false },
  { href: adminPath('orders'), label: 'Orders', icon: ShoppingBag, exact: false },
]

/** Hidden on phone (BottomNav takes over), icon rail on tablet, labelled at lg+. */
export default function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="hidden sm:flex w-14 lg:w-56 shrink-0 border-r border-grey/25 bg-[#101010] flex-col">
      <div className="px-3 lg:px-5 py-5 border-b border-grey/25">
        <span className="hidden lg:block text-[24px] leading-none uppercase tracking-[0.06em] text-pink" style={{ fontFamily: 'var(--font-bebas)' }}>
          SCR!PTS
        </span>
        <span className="lg:hidden block text-pink text-[18px] font-bold text-center" style={{ fontFamily: 'var(--font-bebas)' }}>S!</span>
        <span className="hidden lg:block text-[10px] uppercase tracking-[0.2em] text-grey mt-1">Back office</span>
      </div>
      <nav className="flex-1 py-3">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={`flex items-center justify-center lg:justify-start gap-3 px-4 lg:px-5 py-2.5 text-[13px] transition-colors ${
                active ? 'text-pink bg-pink/10 border-r-2 border-pink' : 'text-paper/70 hover:text-paper'
              }`}
            >
              <Icon size={17} />
              <span className="hidden lg:inline">{label}</span>
            </Link>
          )
        })}
      </nav>
      <Link href="/" title="Back to store" className="flex items-center justify-center lg:justify-start gap-3 px-4 lg:px-5 py-4 text-[12px] text-grey hover:text-paper border-t border-grey/25">
        <ArrowLeft size={15} />
        <span className="hidden lg:inline">Back to store</span>
      </Link>
    </aside>
  )
}
