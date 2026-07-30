import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Sidebar from '@/components/admin/Sidebar'
import { AdminProvider } from '@/lib/admin/store'

// Hidden back office: never indexed, never linked from the storefront.
export const metadata: Metadata = {
  title: 'SCR!PTS — Back Office',
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminProvider>
      <div className="min-h-dvh flex bg-ink text-paper">
        <Sidebar />
        <main className="flex-1 min-w-0 px-4 md:px-8 py-6 md:py-8">{children}</main>
      </div>
    </AdminProvider>
  )
}
