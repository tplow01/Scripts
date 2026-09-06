import type { AdminOrder } from '@/lib/admin/types'
import type { OutgoingEmail } from '@/lib/server/email'

import { escapeHtml, orderTable, orderTableText, shell } from './layout'

const INK = '#0D0D0D'
const GREY = '#6F6F73'

/**
 * Sent once, when the Stripe webhook records a paid order.
 *
 * Its job is to answer the three things someone wants to know the moment after
 * paying: did it work, what did I buy, and where is it going.
 */
export function orderConfirmationEmail(order: AdminOrder): OutgoingEmail {
  const address = order.customer.address.filter(Boolean)
  const firstName = order.customer.name.trim().split(/\s+/)[0] || 'there'

  const html = shell(
    'Order confirmed',
    `
    <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:${INK};">
      Thanks ${escapeHtml(firstName)} — your order is in.
    </p>
    <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:${GREY};">
      Order ${escapeHtml(order.id)}
    </p>
    ${orderTable(order)}
    ${
      address.length
        ? `<p style="margin:0 0 6px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:${GREY};">Shipping to</p>
           <p style="margin:0 0 24px;font-size:13px;line-height:1.7;color:${INK};">
             ${escapeHtml(order.customer.name)}<br>${address.map(escapeHtml).join('<br>')}
           </p>`
        : ''
    }
    <p style="margin:0;font-size:13px;line-height:1.7;color:${GREY};">
      We'll email again the moment it ships. Reply to this message if anything looks wrong.
    </p>`,
  )

  const text = [
    `Order confirmed — ${order.id}`,
    '',
    `Thanks ${firstName} — your order is in.`,
    '',
    orderTableText(order),
    '',
    ...(address.length ? ['Shipping to:', `  ${order.customer.name}`, ...address.map((l) => `  ${l}`), ''] : []),
    "We'll email again the moment it ships. Reply to this message if anything looks wrong.",
    '',
    'SCR!PTS — a home for creative culture',
  ].join('\n')

  return {
    to: order.customer.email,
    subject: `Order confirmed — ${order.id}`,
    html,
    text,
  }
}
