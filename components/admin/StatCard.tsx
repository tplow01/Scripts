import type { ReactNode } from 'react'

export default function StatCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-xl border border-grey/25 bg-[#141414] p-5 flex items-start justify-between">
      <div>
        <p className="text-[11px] uppercase tracking-[0.14em] text-grey">{label}</p>
        <p className="mt-2 text-[40px] leading-none uppercase tracking-[0.04em]" style={{ fontFamily: 'var(--font-bebas)' }}>
          {value}
        </p>
      </div>
      <span className="text-pink mt-1">{icon}</span>
    </div>
  )
}
