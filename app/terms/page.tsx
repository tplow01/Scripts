import type { Metadata } from 'next'

import PolicyPage, { Section, Undecided } from '@/components/PolicyPage'

export const metadata: Metadata = {
  title: 'Terms of Use — SCR!PTS',
  robots: { index: false, follow: false },
}

export default function TermsPage() {
  return (
    <PolicyPage title="Terms of Use" draft>
      <Section heading="Who you are contracting with">
        <Undecided>
          The legal entity behind SCR!PTS, its registered address and company number. Everything
          else on this page depends on that being settled — it is the same answer needed to
          activate the Stripe account.
        </Undecided>
      </Section>

      <Section heading="Orders">
        <p>
          Placing an order is an offer to buy. The contract forms when we confirm the order and
          take payment. We may decline an order — for example if a piece is out of stock or the
          price shown was wrong.
        </p>
        <Undecided>
          Whether that description matches how SCR!PTS actually wants to operate, particularly the
          right to decline.
        </Undecided>
      </Section>

      <Section heading="Using the site">
        <p>
          The SCR!PTS world, its artwork, characters, writing and code are owned by SCR!PTS. You
          are welcome to play, explore and share it. You may not copy or reuse the artwork or
          assets for your own purposes.
        </p>
      </Section>

      <Section heading="Availability">
        <p>
          We do not promise the site is always available. Pieces are made in limited runs and can
          sell out.
        </p>
      </Section>

      <Section heading="Liability and governing law">
        <Undecided>
          Limitation of liability, and which jurisdiction&apos;s law applies. Genuinely worth a
          lawyer rather than a template — it follows from where the entity is registered, and it is
          the clause that matters if anything ever goes wrong.
        </Undecided>
      </Section>

      <Section heading="Changes">
        <p>These terms may change. The version in force is the one published here when you order.</p>
      </Section>
    </PolicyPage>
  )
}
