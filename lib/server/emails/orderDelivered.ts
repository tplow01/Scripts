import type { AdminOrder } from '@/lib/admin/types'
import type { OutgoingEmail } from '@/lib/server/email'

import { fill, mergeCopy, type Copy } from './defaults'
import { escapeHtml, shell } from './layout'

const INK = '#0D0D0D'
const GREY = '#6F6F73'
const PINK_DEEP = '#FF4FA3'


/** Sent once, when an order first moves to `delivered`. */
export function orderDeliveredEmail(order: AdminOrder, stored?: Copy | null): OutgoingEmail {
  const COPY = mergeCopy('order_delivered', stored)
  const name = order.customer.name.trim().split(/\s+/)[0] || 'there'
  const vars = { order: order.id, name }
  const greeting = fill(COPY.greeting, vars)

  const html = shell(
    COPY.headline,
    `
    <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:${INK};">
      ${escapeHtml(greeting)}
    </p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:${INK};">
      ${escapeHtml(COPY.body)}
    </p>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:${INK};">
      ${escapeHtml(COPY.hook)}
    </p>
    <p style="margin:0 0 28px;">
      <a href="${COPY.ctaHref}"
         style="display:inline-block;background:${INK};color:#FFFFFF;text-decoration:none;padding:14px 28px;font-size:12px;font-weight:bold;letter-spacing:0.12em;text-transform:uppercase;">
        ${escapeHtml(COPY.ctaLabel)}
      </a>
    </p>
    <p style="margin:0;font-size:13px;line-height:1.7;color:${PINK_DEEP};">
      ${escapeHtml(COPY.signoff)}
    </p>
    <p style="margin:12px 0 0;font-size:11px;color:${GREY};">
      Order ${escapeHtml(order.id)}
    </p>`,
  )

  const text = [
    COPY.headline,
    '',
    greeting,
    '',
    COPY.body,
    '',
    COPY.hook,
    '',
    `${COPY.ctaLabel}: ${COPY.ctaHref}`,
    '',
    COPY.signoff,
    '',
    `Order ${order.id}`,
    '',
    'SCR!PTS — a home for creative culture',
  ].join('\n')

  return { to: order.customer.email, subject: fill(COPY.subject, vars), html, text }
}
