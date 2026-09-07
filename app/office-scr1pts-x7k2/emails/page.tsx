import type { Metadata } from 'next'

import type { AdminOrder } from '@/lib/admin/types'
import { orderConfirmationEmail } from '@/lib/server/emails/orderConfirmation'
import { orderShippedEmail } from '@/lib/server/emails/orderShipped'

export const metadata: Metadata = {
  title: 'Email preview — SCR!PTS',
  robots: { index: false, follow: false },
}

/**
 * Live preview of the order emails, so copy can be rewritten and seen without
 * placing an order to send one. Edit the COPY block at the top of either
 * template and refresh.
 *
 * Rendered from a sample order chosen to exercise the awkward cases: two line
 * items, different sizes, a quantity above one, and a multi-line address.
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
  status: 'pending',
  paymentStatus: 'paid',
  timeline: { placedAt: '2026-09-06T10:00:00Z', shippedAt: null, deliveredAt: null },
}

export default function EmailPreviewPage() {
  const emails = [
    { label: 'Order confirmation', file: 'lib/server/emails/orderConfirmation.ts', mail: orderConfirmationEmail(SAMPLE) },
    { label: 'Shipping notice', file: 'lib/server/emails/orderShipped.ts', mail: orderShippedEmail(SAMPLE) },
  ]

  return (
    <div className="pb-16">
      <h1 className="text-[28px] uppercase tracking-[0.04em] mb-2" style={{ fontFamily: 'var(--font-bebas)' }}>
        Email preview
      </h1>
      <p className="text-[13px] text-grey mb-8 max-w-[60ch]">
        Rendered from the real templates. Edit the <code className="text-pink">COPY</code> block at
        the top of either file and refresh — no order needed. Nothing here sends anything.
      </p>

      <div className="flex flex-col gap-10">
        {emails.map(({ label, file, mail }) => (
          <section key={label}>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3">
              <h2 className="text-[15px] font-bold uppercase tracking-[0.08em]">{label}</h2>
              <code className="text-[11px] text-grey">{file}</code>
            </div>

            <div className="text-[12px] text-grey mb-3">
              <span className="uppercase tracking-[0.1em]">Subject</span>{' '}
              <span className="text-paper">{mail.subject}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-grey mb-2">HTML</p>
                <iframe
                  title={`${label} — HTML`}
                  srcDoc={mail.html}
                  className="w-full h-[560px] border border-grey/25 bg-white"
                />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-grey mb-2">
                  Plain text — what some clients and every spam filter see
                </p>
                <pre className="w-full h-[560px] overflow-auto border border-grey/25 bg-[#101010] p-4 text-[12px] leading-[1.7] whitespace-pre-wrap">
                  {mail.text}
                </pre>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
