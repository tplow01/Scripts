import type { AdminOrder } from '@/lib/admin/types'
import type { OutgoingEmail } from '@/lib/server/email'

import { escapeHtml, orderTable, orderTableText, shell } from './layout'

const INK = '#0D0D0D'
const GREY = '#6F6F73'

/**
 * ─────────────────────────────────────────────────────────────────────────
 *  THE COPY. Edit here — nowhere else.
 *
 *  Used by both the HTML and plain-text versions, so they cannot drift.
 *
 *  Note there is deliberately nothing about tracking: nothing captures a
 *  tracking number yet, and promising one we cannot supply is worse than
 *  staying quiet. Add it here once fulfilment provides one.
 * ─────────────────────────────────────────────────────────────────────────
 */
const COPY = {
  /** `{order}` is replaced with the order number, e.g. SCR-1055. */
  subject: 'On its way — {order}',
  headline: 'On its way',
  /** `{name}` is the customer's first name, or "there" if we don't have one. */
  greeting: '{name} — your order has shipped.',
  addressLabel: 'Heading to',
  closing: "Reply to this message if it doesn't turn up.",
} as const

const fill = (line: string, vars: Record<string, string>): string =>
  line.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '')

/** Sent once, when an order first moves to `shipped` in the back office. */
export function orderShippedEmail(order: AdminOrder): OutgoingEmail {
  const address = order.customer.address.filter(Boolean)
  const name = order.customer.name.trim().split(/\s+/)[0] || 'there'
  const vars = { order: order.id, name }

  const greeting = fill(COPY.greeting, vars)

  const html = shell(
    COPY.headline,
    `
    <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:${INK};">
      ${escapeHtml(greeting)}
    </p>
    <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:${GREY};">
      Order ${escapeHtml(order.id)}
    </p>
    ${orderTable(order)}
    ${
      address.length
        ? `<p style="margin:0 0 6px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:${GREY};">${escapeHtml(COPY.addressLabel)}</p>
           <p style="margin:0 0 24px;font-size:13px;line-height:1.7;color:${INK};">
             ${escapeHtml(order.customer.name)}<br>${address.map(escapeHtml).join('<br>')}
           </p>`
        : ''
    }
    <p style="margin:0;font-size:13px;line-height:1.7;color:${GREY};">
      ${escapeHtml(COPY.closing)}
    </p>`,
  )

  const text = [
    `${COPY.headline} — ${order.id}`,
    '',
    greeting,
    '',
    orderTableText(order),
    '',
    ...(address.length
      ? [`${COPY.addressLabel}:`, `  ${order.customer.name}`, ...address.map((l) => `  ${l}`), '']
      : []),
    COPY.closing,
    '',
    'SCR!PTS — a home for creative culture',
  ].join('\n')

  return { to: order.customer.email, subject: fill(COPY.subject, vars), html, text }
}
