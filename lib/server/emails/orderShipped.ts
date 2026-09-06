import type { AdminOrder } from '@/lib/admin/types'
import type { OutgoingEmail } from '@/lib/server/email'

import { escapeHtml, orderTable, orderTableText, shell } from './layout'

const INK = '#0D0D0D'
const GREY = '#6F6F73'

/**
 * Sent once, when an order first moves to `shipped` in the back office.
 *
 * Deliberately says nothing about tracking: nothing in the system captures a
 * tracking number yet, and promising one we cannot supply is worse than staying
 * quiet. Add it here when fulfilment provides one.
 */
export function orderShippedEmail(order: AdminOrder): OutgoingEmail {
  const address = order.customer.address.filter(Boolean)
  const firstName = order.customer.name.trim().split(/\s+/)[0] || 'there'

  const html = shell(
    'On its way',
    `
    <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:${INK};">
      ${escapeHtml(firstName)} — your order has shipped.
    </p>
    <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:${GREY};">
      Order ${escapeHtml(order.id)}
    </p>
    ${orderTable(order)}
    ${
      address.length
        ? `<p style="margin:0 0 6px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:${GREY};">Heading to</p>
           <p style="margin:0 0 24px;font-size:13px;line-height:1.7;color:${INK};">
             ${escapeHtml(order.customer.name)}<br>${address.map(escapeHtml).join('<br>')}
           </p>`
        : ''
    }
    <p style="margin:0;font-size:13px;line-height:1.7;color:${GREY};">
      Reply to this message if it doesn't turn up.
    </p>`,
  )

  const text = [
    `On its way — ${order.id}`,
    '',
    `${firstName} — your order has shipped.`,
    '',
    orderTableText(order),
    '',
    ...(address.length ? ['Heading to:', `  ${order.customer.name}`, ...address.map((l) => `  ${l}`), ''] : []),
    "Reply to this message if it doesn't turn up.",
    '',
    'SCR!PTS — a home for creative culture',
  ].join('\n')

  return {
    to: order.customer.email,
    subject: `On its way — ${order.id}`,
    html,
    text,
  }
}
