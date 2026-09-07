'use client'

import { useState } from 'react'

import EmailEditor from '@/components/admin/EmailEditor'
import type { Copy, EmailTemplateId, TemplateSpec } from '@/lib/server/emails/defaults'

export interface EmailTab {
  spec: TemplateSpec
  initial: Copy
  preview: { subject: string; html: string; text: string }
}

/**
 * One email at a time.
 *
 * Stacking all three editors made a very long page where it was easy to lose
 * track of which email you were editing — and they read almost identically, so
 * a wrong-file edit is the obvious mistake to design out.
 */
export default function EmailTabs({ tabs }: { tabs: EmailTab[] }) {
  const [active, setActive] = useState<EmailTemplateId>(tabs[0]?.spec.id as EmailTemplateId)
  const current = tabs.find((t) => t.spec.id === active) ?? tabs[0]

  return (
    <div>
      <div role="tablist" aria-label="Emails" className="flex flex-wrap gap-1 mb-6 border-b border-grey/25">
        {tabs.map(({ spec }) => {
          const selected = spec.id === active
          return (
            <button
              key={spec.id}
              role="tab"
              type="button"
              aria-selected={selected}
              onClick={() => setActive(spec.id as EmailTemplateId)}
              className={`-mb-px border-b-2 px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.1em] transition-colors ${
                selected
                  ? 'border-pinkDeep text-paper'
                  : 'border-transparent text-grey hover:text-paper'
              }`}
            >
              {spec.name}
            </button>
          )
        })}
      </div>

      {current && (
        <EmailEditor
          key={current.spec.id}
          spec={current.spec}
          initial={current.initial}
          preview={current.preview}
        />
      )}
    </div>
  )
}
