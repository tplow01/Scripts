import type { Metadata } from 'next'

import PolicyPage, { Section, Undecided } from '@/components/PolicyPage'

export const metadata: Metadata = {
  title: 'Delivery Information — SCR!PTS',
  robots: { index: false, follow: false },
}

/**
 * Not a legal document — this is the page that stops "where is my order?"
 * emails. The shipping countries and the free-shipping rate below are read off
 * the actual Stripe Checkout configuration, so they are correct today; keep
 * them in step with `SHIP_TO` in app/api/checkout/session/route.ts.
 */
export default function DeliveryPage() {
  return (
    <PolicyPage title="Delivery" draft>
      <Section heading="Where we ship">
        <p>SCR!PTS currently ships to:</p>
        <p className="text-[13px] leading-[1.9]">
          Australia · Canada · Denmark · France · Germany · Ireland · Italy · Netherlands ·
          New Zealand · Norway · Spain · Sweden · United Kingdom · United States
        </p>
        <p className="text-[13px] text-[#6F6F73]">
          If your country is not listed, checkout will not let you select it. Adding one is a
          change to the store settings, not a limitation of the courier.
        </p>
      </Section>

      <Section heading="Cost">
        <p>
          <strong>Shipping is free</strong> on every order, to every country listed above.
        </p>
      </Section>

      <Section heading="How long it takes">
        <Undecided>
          Dispatch time and delivery estimates per region. Nothing in the system knows this — it
          depends on who is fulfilling orders and which service they use.
        </Undecided>
      </Section>

      <Section heading="Tracking">
        <Undecided>
          Whether tracking is provided, and how a customer receives it. The back office records an
          order as shipped, but no tracking number is captured today.
        </Undecided>
      </Section>

      <Section heading="Customs and import duties">
        <Undecided>
          Who pays duties on orders outside the US. Half the countries above are outside it, so
          this will come up. Customers generally expect this stated up front rather than
          discovered at the door.
        </Undecided>
      </Section>
    </PolicyPage>
  )
}
