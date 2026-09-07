import type { AdminOrder } from '@/lib/admin/types'

/**
 * Shared shell for order emails.
 *
 * Plain HTML with inline styles, tables for layout — email clients are still
 * roughly 2005 and ignore most modern CSS. Deliberately typographic and sparse:
 * this is SCR!PTS' commerce register, editorial rather than the game's voice,
 * and a clean receipt reads better than a heavy layout.
 *
 * Colours are BRAND.md's tokens, written out because an email cannot reference
 * the app's theme file at render time.
 */

const INK = '#0D0D0D'
const PAPER = '#FFFFFF'
const GREY = '#6F6F73'
const PINK_DEEP = '#FF4FA3'
const RULE = '#E5E5E5'

/** Anything from a customer or the catalog is untrusted in an HTML context. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export const money = (n: number): string => `$${n.toFixed(2)}`

/** The line-items + totals block, shared by both emails. */
export function orderTable(order: AdminOrder): string {
  const rows = order.lineItems
    .map(
      (li) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid ${RULE};font-size:13px;color:${INK};">
          <strong>${escapeHtml(li.productName)}</strong>${li.size ? ` &middot; ${escapeHtml(li.size)}` : ''} &times;${li.qty}
        </td>
        <td style="padding:12px 0;border-bottom:1px solid ${RULE};font-size:13px;color:${INK};text-align:right;white-space:nowrap;">
          ${money(li.unitPrice * li.qty)}
        </td>
      </tr>`,
    )
    .join('')

  return `
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin:24px 0;">
    ${rows}
    <tr>
      <td style="padding:12px 0;font-size:13px;color:${GREY};">Shipping</td>
      <td style="padding:12px 0;font-size:13px;color:${GREY};text-align:right;">
        ${order.shipping === 0 ? 'Free' : money(order.shipping)}
      </td>
    </tr>
    <tr>
      <td style="padding:12px 0;border-top:2px solid ${INK};font-size:14px;font-weight:bold;color:${INK};text-transform:uppercase;letter-spacing:0.04em;">Total</td>
      <td style="padding:12px 0;border-top:2px solid ${INK};font-size:16px;font-weight:bold;color:${INK};text-align:right;">
        ${money(order.total)}
      </td>
    </tr>
  </table>`
}

/** The same block as plain text, for clients that show no HTML. */
export function orderTableText(order: AdminOrder): string {
  const lines = order.lineItems.map(
    (li) =>
      `  ${li.productName}${li.size ? ` · ${li.size}` : ''} ×${li.qty}   ${money(li.unitPrice * li.qty)}`,
  )
  lines.push(`  Shipping   ${order.shipping === 0 ? 'Free' : money(order.shipping)}`)
  lines.push(`  TOTAL      ${money(order.total)}`)
  return lines.join('\n')
}

/** Wrap body HTML in the SCR!PTS shell. */
export function shell(headline: string, body: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:${PAPER};">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${PAPER};">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:520px;font-family:Helvetica,Arial,sans-serif;">
            <tr>
              <td style="padding-bottom:28px;">
                <span style="font-size:18px;font-weight:bold;letter-spacing:0.14em;color:${INK};">SCR!PTS</span>
              </td>
            </tr>
            <tr>
              <td style="font-size:26px;font-weight:bold;letter-spacing:0.02em;color:${INK};text-transform:uppercase;padding-bottom:16px;">
                ${escapeHtml(headline)}
              </td>
            </tr>
            <tr><td>${body}</td></tr>
            <tr>
              <td style="padding-top:32px;border-top:1px solid ${RULE};font-size:11px;line-height:1.7;color:${GREY};">
                A home for creative culture.<br>
                <span style="color:${PINK_DEEP};">scripts.studio</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}
