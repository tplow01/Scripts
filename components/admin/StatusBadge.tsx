import type { OrderStatus } from '@/lib/admin/types'

/**
 * Muted status pill: tone at 15% background, full tone text.
 *
 * The ramp encodes urgency rather than decoration — red is the one needing
 * action, amber is in hand, blue is out the door, green is finished. Heath
 * should be able to scan the Orders list and see what needs him.
 */
const TONES: Record<OrderStatus, { bg: string; text: string; label: string }> = {
  // Needs action: paid for, not yet sent to the maker.
  paid: { bg: 'rgba(226,90,90,0.15)', text: '#E25A5A', label: 'Paid' },
  // In hand: with the maker, in production.
  making: { bg: 'rgba(232,185,60,0.15)', text: '#E8B93C', label: 'Making' },
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
