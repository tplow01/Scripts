import type { Metadata } from 'next'

import type { AdminOrder } from '@/lib/admin/types'
import EmailEditor from '@/components/admin/EmailEditor'
import { getAllCopy } from '@/lib/server/emailCopy.repo'
import { TEMPLATES, type EmailTemplateId } from '@/lib/server/emails/defaults'
import { orderConfirmationEmail } from '@/lib/server/emails/orderConfirmation'
import { orderShippedEmail } from '@/lib/server/emails/orderShipped'
import { orderDeliveredEmail } from '@/lib/server/emails/orderDelivered'

export const metadata: Metadata = {
  title: 'Emails — SCR!PTS',
  robots: { index: false, follow: false },
}

// Always render the copy as it is right now, never a cached version.
export const dynamic = 'force-dynamic'

/**
 * Sample order used for the previews — deliberately awkward: two line items,
 * different sizes, a quantity above one and a multi-line address, so the
 * fiddly cases show up here rather than in a customer's inbox.
 */
const SAMPLE: AdminOrder = {
  id: 'SCR-1042',
  customer: {
    name: 'Maya Okafor',
    email: 'maya@example.com',
    phone: '+1 415 555 0123',
    address: ['22 Rivington Street', 'London, EC2A 3DY, UK'],
  },
  lineItems: [
    { productName: '"ANXIETY" — White', size: 'M', qty: 2, unitPrice: 44 },
    { productName: '"LOVE" — Army Green', size: 'L', qty: 1, unitPrice: 44 },
  ],
  subtotal: 132,
  shipping: 0,
  total: 132,
  date: '2026-09-06',
  status: 'paid',
  paymentStatus: 'paid',
  timeline: { makingAt: null, placedAt: '2026-09-06T10:00:00Z', shippedAt: null, deliveredAt: null },
}

const BUILDERS = {
  order_confirmation: orderConfirmationEmail,
  order_shipped: orderShippedEmail,
  order_delivered: orderDeliveredEmail,
} as const

export default async function EmailsPage() {
  const stored = await getAllCopy()

  return (
    <div className="pb-16">
      <h1 className="text-[28px] uppercase tracking-[0.04em] mb-2" style={{ fontFamily: 'var(--font-bebas)' }}>
        Emails
      </h1>
      <p className="text-[13px] text-grey mb-8 max-w-[68ch]">
        The three emails SCR!PTS sends. Rewrite any of them here — no code, no deploy. The preview
        beside each one uses a sample order; the grey text in an empty field is what will send if
        you leave it blank.
      </p>

      <div className="flex flex-col gap-8">
        {TEMPLATES.map((spec) => {
          const id = spec.id as EmailTemplateId
          const mail = BUILDERS[id](SAMPLE, stored[id])
          return (
            <EmailEditor
              key={id}
              spec={spec}
              initial={stored[id] ?? {}}
              preview={{ subject: mail.subject, html: mail.html, text: mail.text }}
            />
          )
        })}
      </div>
    </div>
  )
}
