import 'server-only'

import { Resend } from 'resend'

/**
 * Transactional email.
 *
 * Every send here is triggered by something that has already happened and must
 * not be undone — a payment taken, an order marked shipped. So `sendEmail`
 * never throws: a mail failure must not roll back a paid order or make Stripe
 * retry a delivery that already succeeded. Failures are logged and swallowed.
 */

const apiKey = process.env.RESEND_API_KEY

/**
 * Resend's onboarding sender needs no DNS at all, which lets the whole flow be
 * built and tested before the domain is decided. It only delivers to the
 * account owner's own address — fine for development, replaced by a verified
 * `send.scripts.studio` address before real customers see it.
 */
const FROM = process.env.EMAIL_FROM || 'SCR!PTS <onboarding@resend.dev>'

export function isEmailConfigured(): boolean {
  return Boolean(apiKey)
}

let cached: Resend | null = null

function client(): Resend {
  if (!apiKey) throw new Error('RESEND_API_KEY is not set.')
  if (!cached) cached = new Resend(apiKey)
  return cached
}

export interface OutgoingEmail {
  to: string
  subject: string
  html: string
  /** Always send one. HTML-only mail filters badly and some clients show nothing. */
  text: string
}

export interface SendResult {
  sent: boolean
  /** Why not, when `sent` is false — for logs, never shown to a customer. */
  reason?: string
}

/**
 * Send, and resolve either way.
 *
 * Deliberately awaited by callers rather than fired and forgotten: a serverless
 * function can be frozen the moment it returns a response, which would drop an
 * in-flight send with no trace.
 */
export async function sendEmail(email: OutgoingEmail): Promise<SendResult> {
  if (!isEmailConfigured()) {
    return { sent: false, reason: 'RESEND_API_KEY not set' }
  }
  if (!email.to) {
    return { sent: false, reason: 'no recipient address on the order' }
  }

  try {
    const { error } = await client().emails.send({
      from: FROM,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    })
    if (error) {
      console.error('[email] send rejected:', error.message)
      return { sent: false, reason: error.message }
    }
    return { sent: true }
  } catch (err) {
    console.error('[email] send threw:', err)
    return { sent: false, reason: err instanceof Error ? err.message : 'unknown' }
  }
}
