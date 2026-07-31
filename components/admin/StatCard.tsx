import Link from 'next/link'
import type { ReactNode } from 'react'
import Card from './Card'

const DELTA_STYLE = {
  up: { color: '#5FA36B', mark: '▲' },
  down: { color: '#E05252', mark: '▼' },
  flat: { color: '#6F6F73', mark: '—' },
} as const

export default function StatCard({ label, value, icon, delta, href }: {
  label: string
  value: string
  icon: ReactNode
  delta?: { pct: number; dir: 'up' | 'down' | 'flat' }
  href?: string
}) {
  const d = delta ? DELTA_STYLE[delta.dir] : null
  const body = (
    <Card className={href ? 'group h-full transition-all hover:border-pink/50' : 'h-full'}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-grey">{label}</p>
          <p className="mt-2 text-[36px] leading-none uppercase tracking-[0.04em]" style={{ fontFamily: 'var(--font-bebas)' }}>
            {value}
          </p>
          {delta && d && (
            <p className="mt-1.5 text-[11px]" style={{ color: d.color }}>
              {d.mark} {delta.dir === 'flat' ? 'flat' : `${delta.pct}% vs prev period`}
            </p>
          )}
        </div>
        <span className="text-pink mt-1 flex flex-col items-end gap-2">
          {icon}
          {href && <span className="text-[10px] text-grey opacity-0 group-hover:opacity-100 transition-opacity">view →</span>}
        </span>
      </div>
    </Card>
  )
  return href ? <Link href={href} className="block">{body}</Link> : body
}
