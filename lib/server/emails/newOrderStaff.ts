import { adminPath } from '@/lib/admin/config'
import type { AdminOrder } from '@/lib/admin/types'
import { shipToName } from '@/lib/admin/types'
import type { OutgoingEmail } from '@/lib/server/email'
import { siteUrl } from '@/lib/server/siteUrl'

import { escapeHtml, money, orderTable, orderTableText, shell } from './layout'

const INK = '#0D0D0D'
const GREY = '#6F6F73'

/**
 * Where the staff copy goes. ORDER_NOTIFY_EMAIL when set; otherwise the
 * address inside EMAIL_FROM, which on the live site is orders@scripts.studio
 * and forwards to the studio inbox. Null when neither is set: the onboarding
 * sender that `sendEmail` falls back to is Resend's address, not ours, and no
 * copy is sent.
 */
export function staffAddress(): string | null {
  const explicit = process.env.ORDER_NOTIFY_EMAIL?.trim()
  if (explicit) return explicit
  const from = process.env.EMAIL_FROM?.trim()
  if (!from) return null
  const bracketed = from.match(/<([^>]+)>/)
  const address = (bracketed ? bracketed[1] : from).trim()
  return address.includes('@') ? address : null
}

/**
 * The staff copy of a new order, sent to the SCR!PTS inbox the moment the
 * webhook records it.
 *
 * Heath places the Tapstitch order by hand from this, so it carries what the
 * customer's confirmation carries plus how to reach the buyer, and links to the
 * back office where the order is moved along. Fixed wording: it is internal,
 * so it is not one of the templates edited in the back office.
 */
export function newOrderStaffEmail(order: AdminOrder, to: string): OutgoingEmail {
  const address = order.customer.address.filter(Boolean)
  const parcelTo = shipToName(order.customer)
  const ordersUrl = `${siteUrl()}${adminPath('orders')}`
  const count = order.lineItems.reduce((n, li) => n + li.qty, 0)
  const subject = `New order ${order.id} · ${money(order.total)} · ${count} ${count === 1 ? 'item' : 'items'}`

  const label = (s: string) =>
    `<p style="margin:0 0 6px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:${GREY};">${escapeHtml(s)}</p>`
  const block = (lines: string[]) =>
    `<p style="margin:0 0 24px;font-size:13px;line-height:1.7;color:${INK};">${lines.map(escapeHtml).join('<br>')}</p>`

  const html = shell(
    'New order',
    `
    ${label(`Order ${order.id}`)}
    ${orderTable(order)}
    ${label('Ship to')}
    ${block([parcelTo, ...address])}
    ${label('Buyer')}
    ${block([
      `Ordered by: ${order.customer.name}`,
      `Email: ${order.customer.email}`,
      ...(order.customer.phone ? [`Phone: ${order.customer.phone}`] : []),
    ])}
    <p style="margin:0 0 24px;">
      <a href="${ordersUrl}" style="display:inline-block;padding:12px 20px;background:${INK};color:#F7F7F5;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;text-decoration:none;">Open in the back office</a>
    </p>
    <p style="margin:0;font-size:13px;line-height:1.7;color:${GREY};">
      The customer has their confirmation. Move the order to Making once it is placed with Tapstitch.
    </p>`,
  )

  const text = [
    `New order — ${order.id}`,
    '',
    orderTableText(order),
    '',
    'Ship to:',
    `  ${parcelTo}`,
    ...address.map((l) => `  ${l}`),
    '',
    `Ordered by: ${order.customer.name}`,
    `Email: ${order.customer.email}`,
    ...(order.customer.phone ? [`Phone: ${order.customer.phone}`] : []),
    '',
    `Back office: ${ordersUrl}`,
    '',
    'The customer has their confirmation. Move the order to Making once it is placed with Tapstitch.',
  ].join('\n')

  return { to, subject, html, text }
}
