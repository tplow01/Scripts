import type { ReactNode } from 'react'

import NavBar from '@/components/NavBar'
import FooterLinks from '@/components/FooterLinks'

/**
 * Shared shell for the four policy pages.
 *
 * `draft` renders an unmissable banner. A policy page that *looks* finished but
 * isn't is worse than no page at all — a customer would reasonably read it as a
 * commitment, and a reviewer would take it at face value. The banner comes off
 * per page, as each one's content is actually settled.
 */
export default function PolicyPage({
  title,
  updated,
  draft = false,
  children,
}: {
  title: string
  updated?: string
  draft?: boolean
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-white text-[#0d0d0d] flex flex-col">
      <NavBar showBack backHref="/" />

      <main className="flex-1 px-4 md:px-16 lg:px-[200px] pt-8 md:pt-[64px] pb-[64px]">
        <div className="mx-auto w-full max-w-[680px]">
          <h1
            className="text-[40px] md:text-[56px] leading-none tracking-[0.04em] uppercase"
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            {title}
          </h1>

          {updated && (
            <p className="mt-[10px] text-[11px] font-bold uppercase tracking-[0.1em] text-[#6F6F73]">
              Last updated {updated}
            </p>
          )}

          {draft && (
            <div
              role="note"
              className="mt-[24px] border-2 border-[#FF4FA3] bg-[#FFF0F7] px-[18px] py-[14px]"
            >
              <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#0d0d0d]">
                Draft — not in force
              </p>
              <p className="mt-[6px] text-[13px] leading-relaxed text-[#444]">
                This page is a working outline, not SCR!PTS&apos; policy. Sections marked{' '}
                <span className="font-bold">Needs a decision</span> have to be settled by SCR!PTS
                and reviewed before this can be relied on.
              </p>
            </div>
          )}

          <div className="mt-[32px] flex flex-col gap-[28px]">{children}</div>
        </div>
      </main>

      <FooterLinks />
    </div>
  )
}

/** One section of a policy. */
export function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-[13px] font-extrabold uppercase tracking-[0.1em] mb-[10px]">{heading}</h2>
      <div className="flex flex-col gap-[12px] text-[14px] leading-[1.7] text-[#333]">{children}</div>
    </section>
  )
}

/** An open question that only SCR!PTS can answer. Deliberately conspicuous. */
export function Undecided({ children }: { children: ReactNode }) {
  return (
    <p className="border-l-[3px] border-[#FF4FA3] bg-[#FAFAFA] px-[14px] py-[10px] text-[13px] leading-[1.6] text-[#6F6F73]">
      <span className="font-extrabold uppercase tracking-[0.08em] text-[#0d0d0d]">
        Needs a decision:{' '}
      </span>
      {children}
    </p>
  )
}
