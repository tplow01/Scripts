import Link from 'next/link'
import type { ReactNode } from 'react'
import Card from './Card'
import DeltaChip from './DeltaChip'

export default function StatCard({ label, value, icon, delta, href }: {
  label: string
  value: string
  icon: ReactNode
  delta?: { pct: number; dir: 'up' | 'down' | 'flat' }
  href?: string
}) {
  const body = (
    <Card className={href ? 'group h-full transition-all hover:border-pink/50' : 'h-full'}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.14em] text-grey">{label}</p>
          <p className="mt-2 text-[32px] sm:text-[36px] leading-none uppercase tracking-[0.04em] tabular-nums" style={{ fontFamily: 'var(--font-bebas)' }}>
            {value}
          </p>
          {delta && <DeltaChip delta={delta} className="mt-2.5" />}
        </div>
        <span className="text-pink mt-1 flex flex-col items-end gap-2 shrink-0">
          {icon}
          {href && <span className="text-[10px] text-grey opacity-0 group-hover:opacity-100 transition-opacity">view →</span>}
        </span>
      </div>
    </Card>
  )
  return href ? <Link href={href} className="block">{body}</Link> : body
}
