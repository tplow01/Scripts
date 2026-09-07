'use client'

import { useState } from 'react'

import { useToast } from '@/lib/toast'
import type { Copy, EmailTemplateId, TemplateSpec } from '@/lib/server/emails/defaults'

/**
 * Lets Heath rewrite the order emails without touching code.
 *
 * Only differences from the default are stored. Clearing a field restores the
 * original wording rather than sending a blank line — which is why every input
 * shows the default as its placeholder: what you see greyed out is what will
 * actually send if you leave it empty.
 */
export default function EmailEditor({
  spec,
  initial,
  preview,
}: {
  spec: TemplateSpec
  initial: Copy
  /** Server-rendered preview of the copy as currently saved. */
  preview: { subject: string; html: string; text: string }
}) {
  const { notify } = useToast()
  const [values, setValues] = useState<Copy>(initial)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const set = (key: string, v: string) => {
    setValues((p) => ({ ...p, [key]: v }))
    setDirty(true)
  }

  async function save() {
    setSaving(true)
    try {
      // Blank fields are dropped rather than stored, so they fall back cleanly.
      const copy = Object.fromEntries(
        Object.entries(values).filter(([, v]) => v.trim()),
      ) as Copy
      const res = await fetch('/api/admin/email-copy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: spec.id as EmailTemplateId, copy }),
      })
      if (!res.ok) {
        const b = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
        notify(b?.error?.message ?? 'Could not save.', 'error')
        return
      }
      notify('Saved — refresh to see the preview update', 'success')
      setDirty(false)
    } catch {
      notify('Could not reach the server.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const input =
    'w-full bg-[#101010] border border-grey/30 px-3 py-2 text-[13px] text-paper rounded ' +
    'focus:outline-none focus:border-pink placeholder:text-grey/60'

  return (
    <section className="border border-grey/20 rounded-lg p-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1">
        <h2 className="text-[20px] uppercase tracking-[0.04em]" style={{ fontFamily: 'var(--font-bebas)' }}>
          {spec.name}
        </h2>
        {dirty && <span className="text-[11px] text-[#E8B93C]">unsaved changes</span>}
      </div>
      <p className="text-[12px] text-grey mb-5">{spec.when}</p>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <div className="flex flex-col gap-4">
          {spec.fields.map((f) => (
            <div key={f.key}>
              <label
                htmlFor={`${spec.id}-${f.key}`}
                className="block text-[11px] uppercase tracking-[0.14em] text-grey mb-1.5"
              >
                {f.label}
              </label>
              {f.multiline ? (
                <textarea
                  id={`${spec.id}-${f.key}`}
                  rows={3}
                  value={values[f.key] ?? ''}
                  placeholder={f.default}
                  onChange={(e) => set(f.key, e.target.value)}
                  className={input}
                />
              ) : (
                <input
                  id={`${spec.id}-${f.key}`}
                  type="text"
                  value={values[f.key] ?? ''}
                  placeholder={f.default}
                  onChange={(e) => set(f.key, e.target.value)}
                  className={input}
                />
              )}
              {f.hint && <p className="mt-1 text-[11px] text-grey">{f.hint}</p>}
            </div>
          ))}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={save}
              disabled={saving || !dirty}
              className="bg-pinkDeep text-ink px-5 py-2 text-[12px] font-bold uppercase tracking-[0.1em] rounded disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <p className="text-[11px] text-grey">
              Leave a field empty to use the default shown in grey.
            </p>
          </div>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-grey mb-2">
            Preview — as currently saved
          </p>
          <p className="text-[12px] text-grey mb-2">
            <span className="uppercase tracking-[0.1em]">Subject</span>{' '}
            <span className="text-paper">{preview.subject}</span>
          </p>
          <iframe
            title={`${spec.name} preview`}
            srcDoc={preview.html}
            className="w-full h-[420px] border border-grey/25 bg-white rounded"
          />
        </div>
      </div>
    </section>
  )
}
