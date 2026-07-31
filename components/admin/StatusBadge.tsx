import type { OrderStatus } from '@/lib/admin/types'

/** Muted, on-brand status pill: tone at 15% background, full tone text. */
const TONES: Record<OrderStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: 'rgba(217,164,65,0.15)', text: '#D9A441', label: 'Pending' },
  shipped: { bg: 'rgba(91,141,201,0.15)', text: '#5B8DC9', label: 'Shipped' },
  delivered: { bg: 'rgba(95,163,107,0.15)', text: '#5FA36B', label: 'Delivered' },
}

export default function StatusBadge({ status }: { status: OrderStatus }) {
  const t = TONES[status]
  return (
    <span
      className="inline-flex items-center justify-center min-w-[86px] rounded-full px-[10px] py-[3px] text-[11px] font-semibold tracking-[0.08em] uppercase"
      style={{ background: t.bg, color: t.text }}
    >
      {t.label}
    </span>
  )
}
