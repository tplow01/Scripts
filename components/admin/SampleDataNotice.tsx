'use client'

import { AlertTriangle } from 'lucide-react'

import { useAdmin } from '@/lib/admin/store'

/**
 * Says out loud when the screen is showing built-in sample data.
 *
 * The samples exist so the back office has something to render before there is
 * a database, and they look entirely real — named customers, plausible totals,
 * working status dropdowns. Without this, someone could mark a fictional order
 * shipped and send an email to an address that does not exist.
 *
 * It disappears on its own the moment real data loads. Nothing to clean up.
 */
export default function SampleDataNotice() {
  const { state, hydrated } = useAdmin()
  if (!hydrated || !state.isSample) return null

  return (
    <div
      role="status"
      className="mb-6 flex items-start gap-3 border border-[#E8B93C]/40 bg-[#E8B93C]/10 px-4 py-3"
    >
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[#E8B93C]" />
      <p className="text-[13px] leading-relaxed text-paper">
        <span className="font-bold uppercase tracking-[0.08em] text-[#E8B93C]">Sample data</span>
        {' — '}
        these are not real orders or customers. Nothing here has been paid for and no email will
        reach anyone. Real data replaces this automatically once the back office can reach the
        database.
      </p>
    </div>
  )
}
