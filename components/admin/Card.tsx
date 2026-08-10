import type { ReactNode } from 'react'

/** The one admin card treatment — every panel on every page uses this shell. */
export default function Card({ title, action, children, className = '' }: {
  title?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-xl border border-grey/25 bg-[#141414] p-5 transition-colors ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-3">
          {title && <p className="text-[11px] uppercase tracking-[0.14em] text-grey">{title}</p>}
          {action}
        </div>
      )}
      {children}
    </div>
  )
}
