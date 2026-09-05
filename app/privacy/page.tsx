import type { Metadata } from 'next'

import PolicyPage, { Section, Undecided } from '@/components/PolicyPage'

export const metadata: Metadata = {
  title: 'Privacy Policy — SCR!PTS',
  // Draft policies must not be indexed; remove once the content is real.
  robots: { index: false, follow: false },
}

/**
 * The factual parts below are drawn from what the code actually does — what
 * Stripe is configured to collect, what the schema stores, who processes what.
 * They are accurate. The judgment calls are marked and are not.
 *
 * Note the Shopify store's existing privacy policy is NOT reusable here: it
 * names Shopify as the processor fifteen times and this stack uses Supabase,
 * Stripe and Vercel instead. Copying it would misdescribe where customer data
 * actually goes.
 */
export default function PrivacyPage() {
  return (
    <PolicyPage title="Privacy Policy" draft>
      <Section heading="What we collect">
        <p>
          When you place an order, Stripe collects your email address, name, shipping address and
          phone number on our behalf, and passes them to us so the order can be fulfilled.
        </p>
        <p>
          If you sign up to the newsletter we store your email address and the date you gave it.
        </p>
        <p>
          <strong>We never see or store your card details.</strong> Payment is taken on Stripe&apos;s
          own hosted checkout page; card numbers do not pass through SCR!PTS at any point.
        </p>
      </Section>

      <Section heading="Where it goes">
        <p>Three processors handle data on our behalf:</p>
        <ul className="list-disc pl-[20px] flex flex-col gap-[6px]">
          <li><strong>Stripe</strong> — payment processing, and collecting your details at checkout.</li>
          <li><strong>Supabase</strong> — the database holding orders and newsletter signups.</li>
          <li><strong>Vercel</strong> — hosting for the website itself.</li>
        </ul>
        <Undecided>
          Where each processor stores data geographically, and which transfer mechanism covers
          UK/EU customers. The database currently runs in <strong>US East (Ohio)</strong>, which
          matters for anyone ordering from the UK or EU.
        </Undecided>
      </Section>

      <Section heading="How long we keep it">
        <Undecided>
          A retention period for orders and for newsletter signups. Tax and accounting rules
          usually set a floor on order records; there is no such floor for marketing emails.
        </Undecided>
      </Section>

      <Section heading="Your rights">
        <Undecided>
          Which rights to state, and the process for honouring them. Customers in the UK/EU
          (GDPR) and California (CCPA) have statutory rights of access, correction and deletion —
          SCR!PTS ships to both, so both apply. This needs a real answer, including who handles a
          request and how quickly.
        </Undecided>
      </Section>

      <Section heading="Cookies">
        <Undecided>
          What the site actually sets. At the time of writing there is no analytics or advertising
          tracking; the only stored values are the shopping bag (kept in your own browser) and the
          back-office login session. Revisit this the moment analytics is added.
        </Undecided>
      </Section>

      <Section heading="Contact">
        <Undecided>
          A real contact address for privacy requests. The site footer currently shows a
          placeholder.
        </Undecided>
      </Section>
    </PolicyPage>
  )
}
