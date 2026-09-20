import type { Metadata } from 'next'

import PolicyPage, { Bullets, Mail, Section } from '@/components/PolicyPage'

export const metadata: Metadata = {
  title: 'Purchasing & Returns — SCR!PTS',
}

export default function PurchasingPage() {
  return (
    <PolicyPage title="Purchasing & Returns" updated="September 2026">
      <Section heading="Payment">
        <p>
          Payment is collected securely through the payment methods available at checkout.
        </p>
        <p>
          SCR!PTS does not directly store complete credit or debit card numbers.
        </p>
        <p>
          Prices are displayed in the currency shown at checkout. Any applicable taxes or shipping charges will be displayed before your purchase is completed.
        </p>
      </Section>

      <Section heading="Order confirmation">
        <p>
          After completing your purchase, you should receive an order confirmation at the email address provided during checkout.
        </p>
        <p>
          Please review your order information carefully.
        </p>
        <p>
          If you believe there is an issue with your order, contact <Mail /> as soon as possible.
        </p>
      </Section>

      <Section heading="Order changes & cancellations">
        <p>
          If you need to change or cancel an order, contact us as soon as possible.
        </p>
        <p>
          We will make a reasonable effort to accommodate requests before fulfillment begins, but we cannot guarantee changes or cancellations once an order has entered fulfillment or shipped.
        </p>
      </Section>

      <Section heading="Returns">
        <p>
          We accept eligible returns requested within 14 days of delivery.
        </p>
        <p>
          Returned items must be:
        </p>
        <Bullets
          items={[
            'Unworn',
            'Unwashed',
            'Unaltered',
            'In their original condition',
            'Returned with original tags attached',
          ]}
        />
        <p>
          To request a return, contact <Mail /> with your order number and reason for return.
        </p>
        <p>
          Do not send a return without contacting us first.
        </p>
      </Section>

      <Section heading="Return shipping">
        <p>
          Unless an item arrived damaged, defective, or incorrect, customers are responsible for the cost of return shipping.
        </p>
        <p>
          Original shipping charges are generally non-refundable unless required by applicable law or the return is due to an error by SCR!PTS.
        </p>
      </Section>

      <Section heading="Refunds">
        <p>
          Once your return has been received and inspected, we will notify you regarding the status of your refund.
        </p>
        <p>
          Approved refunds will be issued to the original payment method.
        </p>
        <p>
          After a refund is issued, your bank or payment provider may require additional time for the refund to appear in your account.
        </p>
      </Section>

      <Section heading="Damaged, defective or incorrect items">
        <p>
          If you receive an item that is damaged, defective, or different from what you ordered, contact us as soon as reasonably possible at <Mail />.
        </p>
        <p>
          Please include your order number and clear photographs showing the issue.
        </p>
        <p>
          If we determine that the item is defective or incorrect, we will work with you to provide an appropriate replacement, refund, or other solution.
        </p>
      </Section>

      <Section heading="Final sale items">
        <p>
          Certain products may be marked Final Sale on their product page.
        </p>
        <p>
          Where permitted by law, Final Sale items cannot be returned because of a change of mind.
        </p>
        <p>
          Final Sale restrictions do not affect rights you may have regarding defective, damaged, incorrectly supplied products, or other rights provided by applicable consumer law.
        </p>
      </Section>

      <Section heading="Limited products">
        <p>
          Some SCR!PTS products are produced in limited quantities.
        </p>
        <p>
          We cannot guarantee that another size or replacement will be available if an item is returned or requires replacement.
        </p>
        <p>
          When a replacement is unavailable, an eligible refund may be provided instead.
        </p>
      </Section>

      <Section heading="International customers">
        <p>
          Customers outside the United States may have additional rights under the consumer protection laws applicable to their purchase.
        </p>
        <p>
          Nothing in this policy is intended to limit rights that cannot legally be waived.
        </p>
      </Section>

      <Section heading="Questions">
        <p>
          For questions about an order, return, or refund, contact <Mail />.
        </p>
      </Section>
    </PolicyPage>
  )
}
