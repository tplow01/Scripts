'use client'

import { LayoutDashboard, Package, ShoppingBag, Store } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { adminPath } from '@/lib/admin/config'

const ITEMS = [
  { href: adminPath(), label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: adminPath('products'), label: 'Products', icon: Package, exact: false },
  { href: adminPath('orders'), label: 'Orders', icon: ShoppingBag, exact: false },
  { href: '/', label: 'Store', icon: Store, exact: false },
]

/** Phone-only nav. The sidebar is hidden below `sm`; this replaces it. */
export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Admin sections"
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 flex border-t border-grey/25 bg-[#101010]/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {ITEMS.map(({ href, label, icon: Icon, exact }) => {
        // The storefront link is never "active" inside the admin.
        const active = href === '/' ? false : exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] uppercase tracking-[0.08em] transition-colors ${
              active ? 'text-pink' : 'text-grey hover:text-paper'
            }`}
          >
            <Icon size={18} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
