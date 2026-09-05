import type { Metadata } from 'next'

import PolicyPage, { Section, Undecided } from '@/components/PolicyPage'

export const metadata: Metadata = {
  title: 'Purchasing Policy — SCR!PTS',
  robots: { index: false, follow: false },
}

/**
 * Returns and refunds. This is the page Stripe's account review looks for, and
 * the card networks require merchants to display one — so it is the policy with
 * the most external pressure behind it.
 */
export default function PurchasingPage() {
  return (
    <PolicyPage title="Purchasing Policy" draft>
      <Section heading="Prices and payment">
        <p>
          All prices are shown in <strong>US dollars</strong>. Payment is taken by Stripe, which
          accepts cards, Apple Pay and Google Pay. Your order is confirmed once payment succeeds.
        </p>
        <p>
          Stock is checked before payment is taken. If a piece sells out while it is in your bag,
          checkout will tell you rather than charging you for something we cannot send.
        </p>
      </Section>

      <Section heading="Returns">
        <Undecided>
          The return window, the condition items must be in, and who pays return shipping. This is
          a business decision, not a legal formality — but note customers in the UK and EU have a
          statutory right to cancel that applies regardless of what this page says, so the policy
          has to meet or exceed it.
        </Undecided>
      </Section>

      <Section heading="Refunds">
        <Undecided>
          How long refunds take and how they are issued. Stripe returns funds to the original
          payment method; the customer-facing timescale still needs stating.
        </Undecided>
      </Section>

      <Section heading="Faulty or incorrect items">
        <Undecided>
          What a customer should do, and what SCR!PTS commits to. This is separate from ordinary
          returns and is covered by consumer law in most places we ship to.
        </Undecided>
      </Section>

      <Section heading="Cancelling an order">
        <Undecided>
          Whether an order can be cancelled before dispatch, and how.
        </Undecided>
      </Section>
    </PolicyPage>
  )
}
