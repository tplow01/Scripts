import type { Metadata } from 'next'

import PolicyPage, { Bullets, Mail, Section } from '@/components/PolicyPage'

export const metadata: Metadata = {
  title: 'Terms of Use — SCR!PTS',
}

export default function TermsPage() {
  return (
    <PolicyPage title="Terms of Use" updated="September 2026">
      <Section heading="About SCR!PTS">
        <p>
          SCR!PTS is an independent clothing brand operated by SCR!PTS LLC, based in Colorado, United States.
        </p>
        <p>
          Throughout this website, &ldquo;SCR!PTS,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; and &ldquo;our&rdquo; refer to SCR!PTS LLC and the SCR!PTS brand.
        </p>
        <p>
          These Terms of Use apply to your use of our website and any purchases made through it. By accessing or using this website, you agree to these terms.
        </p>
      </Section>

      <Section heading="Using our website">
        <p>
          You may use this website for personal, non-commercial purposes and to browse or purchase SCR!PTS products.
        </p>
        <p>
          You agree not to misuse the website, interfere with its operation, attempt to gain unauthorized access to any part of the site, use automated purchasing tools or bots, or use SCR!PTS content for unauthorized commercial purposes.
        </p>
        <p>
          We may restrict or refuse access to the website where we reasonably believe misuse, fraud, or other prohibited activity has occurred.
        </p>
      </Section>

      <Section heading="Products">
        <p>
          We make reasonable efforts to accurately display our products, including their colors, materials, measurements, and details. However, colors and appearance may vary slightly depending on your device, screen, lighting, and manufacturing variations.
        </p>
        <p>
          Because SCR!PTS produces limited quantities, availability is not guaranteed. An item appearing on the website does not guarantee that it will remain available.
        </p>
        <p>
          We may limit quantities, cancel orders, or correct pricing or product information when necessary.
        </p>
      </Section>

      <Section heading="Orders">
        <p>
          Submitting an order does not guarantee acceptance. We reserve the right to refuse or cancel an order due to inventory errors, suspected fraud, incorrect pricing, payment issues, or other reasonable circumstances.
        </p>
        <p>
          If we cancel an order after payment has been collected, the applicable amount will be refunded to the original payment method.
        </p>
        <p>
          Orders are intended for personal use. We may limit quantities where we reasonably believe an order is being placed for unauthorized resale or other commercial purposes.
        </p>
      </Section>

      <Section heading="Intellectual property">
        <p>
          The SCR!PTS name, logos, graphics, garment designs, artwork, photography, characters, website designs, written content, and other original creative material are owned by or licensed to SCR!PTS and are protected by applicable intellectual property laws.
        </p>
        <p>
          This includes the SCR!PTS digital world and original characters, including Scribbs.
        </p>
        <p>
          You may not reproduce, sell, distribute, modify, or commercially use SCR!PTS content without our permission.
        </p>
      </Section>

      <Section heading="Third-party services">
        <p>
          Our website may rely on third-party services for functions such as payments, hosting, databases, shipping, and other website operations.
        </p>
        <p>
          We are not responsible for independent third-party websites or services that may be linked from our website.
        </p>
      </Section>

      <Section heading="Website availability">
        <p>
          We try to keep the SCR!PTS website functioning properly, but we cannot guarantee uninterrupted access.
        </p>
        <p>
          The website may occasionally be unavailable due to maintenance, updates, technical problems, or circumstances outside our control.
        </p>
      </Section>

      <Section heading="Liability">
        <p>
          To the fullest extent permitted by applicable law, SCR!PTS will not be responsible for indirect or consequential losses resulting from use of this website.
        </p>
        <p>
          Nothing in these Terms limits any consumer rights or other rights that cannot legally be excluded.
        </p>
      </Section>

      <Section heading="Changes to these terms">
        <p>
          We may update these Terms from time to time as SCR!PTS, our website, or applicable requirements change.
        </p>
        <p>
          The version posted on this page at the time of use will be the current version.
        </p>
      </Section>

      <Section heading="Contact">
        <p>
          Questions regarding these Terms can be sent to <Mail />.
        </p>
        <p>
          SCR!PTS LLC, Colorado, United States.
        </p>
      </Section>
    </PolicyPage>
  )
}
