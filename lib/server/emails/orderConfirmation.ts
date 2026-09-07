import type { AdminOrder } from '@/lib/admin/types'
import type { OutgoingEmail } from '@/lib/server/email'

import { fill, mergeCopy, type Copy } from './defaults'
import { escapeHtml, orderTable, orderTableText, shell } from './layout'

const INK = '#0D0D0D'
const GREY = '#6F6F73'


/**
 * Sent once, when the Stripe webhook records a paid order.
 *
 * Answers the three things someone wants to know the moment after paying: did
 * it work, what did I buy, and where is it going.
 */
export function orderConfirmationEmail(order: AdminOrder, stored?: Copy | null): OutgoingEmail {
  const COPY = mergeCopy('order_confirmation', stored)
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
