import type { Metadata } from 'next'

import PolicyPage, { Bullets, Mail, Section } from '@/components/PolicyPage'

export const metadata: Metadata = {
  title: 'Delivery Information — SCR!PTS',
}

export default function DeliveryPage() {
  return (
    <PolicyPage title="Delivery" updated="September 2026">
      <Section heading="Order processing">
        <p>
          Orders are typically processed within 3–5 business days after purchase.
        </p>
        <p>
          During product launches, limited releases, holidays, or periods of higher order volume, processing may take longer.
        </p>
        <p>
          Pre-order or made-to-order products may have different estimated shipping dates. When applicable, these estimates will be listed on the individual product page.
        </p>
      </Section>

      <Section heading="Shipping">
        <p>
          SCR!PTS currently ships to select countries worldwide.
        </p>
        <p>
          Available shipping destinations and shipping costs will be shown during checkout.
        </p>
        <p>
          Estimated delivery times begin after your order has been processed and handed to the shipping carrier.
        </p>
        <p>
          Delivery times are estimates and may be affected by carrier delays, weather, customs, holidays, or other circumstances outside our control.
        </p>
      </Section>

      <Section heading="Tracking">
        <p>
          When tracking is available, you will receive tracking information by email once your order has shipped.
        </p>
        <p>
          Please allow some time for the carrier to update tracking information after receiving your package.
        </p>
      </Section>

      <Section heading="International orders">
        <p>
          International orders may be subject to customs duties, import taxes, VAT, or other fees charged by the destination country.
        </p>
        <p>
          Unless specifically stated otherwise at checkout, these charges are the responsibility of the customer and are not included in the product or shipping price paid to SCR!PTS.
        </p>
        <p>
          Customs processing may also cause additional delivery delays.
        </p>
      </Section>

      <Section heading="Incorrect addresses">
        <p>
          Customers are responsible for providing a complete and accurate shipping address.
        </p>
        <p>
          If you notice an error in your shipping information, contact us as soon as possible at <Mail />.
        </p>
        <p>
          We will try to update the address if the order has not shipped yet, but we cannot guarantee changes once fulfillment has begun.
        </p>
      </Section>

      <Section heading="Lost or damaged orders">
        <p>
          If your tracking shows an unusual delay, your package arrives damaged, or you believe your package has been lost in transit, contact us at <Mail /> with your order number.
        </p>
        <p>
          We will review the situation and work with you and the shipping carrier to determine the appropriate next step.
        </p>
      </Section>

      <Section heading="Shipping delays">
        <p>
          If we are unable to ship your order within the timeframe originally provided, we will contact you with updated information and, where required, give you the option to accept the delay or cancel the affected order for a refund.
        </p>
      </Section>

      <Section heading="Questions">
        <p>
          For shipping questions, contact <Mail />.
        </p>
      </Section>
    </PolicyPage>
  )
}
