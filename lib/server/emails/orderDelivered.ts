import type { AdminOrder } from '@/lib/admin/types'
import type { OutgoingEmail } from '@/lib/server/email'

import { escapeHtml, shell } from './layout'

const INK = '#0D0D0D'
const GREY = '#6F6F73'
const PINK_DEEP = '#FF4FA3'

/**
 * ─────────────────────────────────────────────────────────────────────────
 *  THE COPY. Edit here — nowhere else.
 *
 *  Used by both the HTML and plain-text versions, so they cannot drift.
 *
 *  This is the one email that is not admin: the order is done, nothing needs
 *  reporting. Its whole job is to leave a good taste and earn a second order.
 *  BRAND.md: creative, confident, underground — never corporate or pushy.
 *  Deliberately no discount code; SCR!PTS is not a brand that discounts itself.
 * ─────────────────────────────────────────────────────────────────────────
 */
const COPY = {
  /** `{order}` is replaced with the order number. */
  subject: 'Welcome to the world',
  headline: 'You made it',
  /** `{name}` is the customer's first name, or "there" if we don't have one. */
  greeting: '{name} — it landed. Thanks for wearing SCR!PTS.',
  body:
    'Every piece we make starts as something someone felt and could not say out loud. ' +
    'You are carrying one of those around now, which is the whole point.',
  /** The nudge back. Keep it an invitation, not a sales pitch. */
  hook: 'There is more down there than you have seen. Some of it never makes the shop floor.',
  ctaLabel: 'Back to the world',
  ctaHref: 'https://scripts.studio',
  signoff: 'Wear it loud.',
} as const

const fill = (line: string, vars: Record<string, string>): string =>
  line.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '')

/** Sent once, when an order first moves to `delivered`. */
export function orderDeliveredEmail(order: AdminOrder): OutgoingEmail {
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
