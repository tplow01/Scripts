import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import BottomNav from '@/components/admin/BottomNav'
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
        {/* Bottom padding on phone clears the fixed BottomNav (nav height + safe area). */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 pb-[calc(4rem_+_env(safe-area-inset-bottom))] sm:pb-8">
          {children}
        </main>
        <BottomNav />
      </div>
    </AdminProvider>
  )
}
