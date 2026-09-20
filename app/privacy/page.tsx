import type { Metadata } from 'next'

import PolicyPage, { Bullets, Mail, Section } from '@/components/PolicyPage'

export const metadata: Metadata = {
  title: 'Privacy Policy — SCR!PTS',
}

export default function PrivacyPage() {
  return (
    <PolicyPage title="Privacy Policy" updated="September 2026">
      <Section heading="Overview">
        <p>
          SCR!PTS respects your privacy. This Privacy Policy explains the types of information we may collect when you use our website, why we collect it, and how that information may be used.
        </p>
      </Section>

      <Section heading="Who we are">
        <p>
          SCR!PTS is an independent clothing brand operated by SCR!PTS LLC, based in Colorado, United States.
        </p>
        <p>
          For privacy-related questions, contact <Mail address="heathnager@gmail.com" />.
        </p>
      </Section>

      <Section heading="Information we collect">
        <p>
          When you place an order, join our mailing list, contact us, or otherwise interact with the SCR!PTS website, we may collect information such as:
        </p>
        <Bullets
          items={[
            'Name',
            'Email address',
            'Shipping and billing information',
            'Order and purchase information',
            'Information you voluntarily provide when contacting us',
            'Basic device, browser, and website usage information',
          ]}
        />
      </Section>

      <Section heading="Payment information">
        <p>
          Payments are processed through third-party payment providers, including Stripe.
        </p>
        <p>
          SCR!PTS does not directly receive or store your complete credit or debit card number.
        </p>
        <p>
          Payment providers may collect and process information according to their own privacy policies.
        </p>
      </Section>

      <Section heading="How we use information">
        <p>
          We may use your information to:
        </p>
        <Bullets
          items={[
            'Process and fulfill orders',
            'Provide order and shipping updates',
            'Respond to customer service requests',
            'Prevent fraud and protect the website',
            'Maintain records relating to purchases',
            'Improve the SCR!PTS website and shopping experience',
            'Send marketing communications when you have chosen to receive them',
            'Comply with applicable legal obligations',
          ]}
        />
      </Section>

      <Section heading="Service providers">
        <p>
          SCR!PTS uses third-party services to operate our website and process orders. These may include services such as:
        </p>
        <Bullets
          items={[
            'Stripe — payment processing',
            'Supabase — database and website data services',
            'Vercel — website hosting and infrastructure',
            'Shipping providers — order delivery and tracking',
          ]}
        />
        <p>
          These providers may process information only as necessary to provide their respective services, subject to their own terms and privacy practices.
        </p>
      </Section>

      <Section heading="Marketing">
        <p>
          If you choose to join the SCR!PTS mailing list, we may send you emails regarding product releases, brand updates, events, or other SCR!PTS news.
        </p>
        <p>
          You can unsubscribe from marketing emails at any time using the unsubscribe option included in those messages.
        </p>
        <p>
          Transactional messages regarding purchases, shipping, returns, or customer service are separate from marketing communications.
        </p>
      </Section>

      <Section heading="Cookies & website technology">
        <p>
          Our website may use cookies, local storage, or similar technologies necessary for features such as shopping, website functionality, security, preferences, and basic website operation.
        </p>
        <p>
          If we introduce additional analytics, advertising, or tracking technologies, this Privacy Policy may be updated to reflect those practices and appropriate choices may be provided where required.
        </p>
      </Section>

      <Section heading="When information may be shared">
        <p>
          We do not sell your personal information for money.
        </p>
        <p>
          Information may be shared with service providers when necessary to operate SCR!PTS, including processing payments, fulfilling orders, hosting the website, sending communications, and delivering purchases.
        </p>
        <p>
          We may also disclose information where reasonably necessary to comply with applicable law, prevent fraud, protect our rights, or respond to lawful requests.
        </p>
      </Section>

      <Section heading="Data retention">
        <p>
          We retain personal information only for as long as reasonably necessary for the purposes described in this Policy, including fulfilling orders, maintaining business and tax records, resolving disputes, preventing fraud, and complying with legal obligations.
        </p>
        <p>
          Different categories of information may be retained for different periods.
        </p>
      </Section>

      <Section heading="International data processing">
        <p>
          SCR!PTS is based in the United States, and some of our service providers and infrastructure are located in the United States or other countries.
        </p>
        <p>
          If you access or purchase from SCR!PTS outside the United States, your information may be processed in countries different from the country where you live.
        </p>
      </Section>

      <Section heading="Your privacy rights">
        <p>
          Depending on where you live, you may have rights regarding your personal information, which may include requesting access to, correction of, or deletion of certain information.
        </p>
        <p>
          You may also have the right to withdraw consent or object to certain uses of your information where applicable.
        </p>
        <p>
          To make a privacy request, contact <Mail address="heathnager@gmail.com" />.
        </p>
        <p>
          We may need to verify your identity before completing certain requests.
        </p>
      </Section>

      <Section heading="Children">
        <p>
          SCR!PTS is not intended to knowingly collect personal information from children in violation of applicable law.
        </p>
        <p>
          If you believe a child has provided personal information to us improperly, please contact us.
        </p>
      </Section>

      <Section heading="Security">
        <p>
          We use reasonable measures and reputable service providers to help protect information handled through our website.
        </p>
        <p>
          However, no online system can be guaranteed to be completely secure.
        </p>
      </Section>

      <Section heading="Changes to this policy">
        <p>
          We may update this Privacy Policy as SCR!PTS grows, our website changes, or our privacy practices change.
        </p>
        <p>
          The current version will be posted on this page along with its most recent update date.
        </p>
      </Section>

      <Section heading="Contact">
        <p>
          For questions regarding this Privacy Policy or your personal information, contact <Mail />.
        </p>
        <p>
          SCR!PTS LLC, Colorado, United States.
        </p>
      </Section>
    </PolicyPage>
  )
}
