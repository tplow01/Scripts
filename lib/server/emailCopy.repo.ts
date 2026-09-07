import 'server-only'

import { isDatabaseConfigured, serverClient } from './supabase'
import { TEMPLATES, type Copy, type EmailTemplateId } from './emails/defaults'

/**
 * Heath's edits to the email wording.
 *
 * Only overrides are stored — never the whole email. A field he has not touched
 * has no row value and falls back to the default in code, so the defaults stay
 * meaningful and clearing a field restores the original.
 */

export type AllCopy = Record<EmailTemplateId, Copy>

const empty = (): AllCopy =>
  Object.fromEntries(TEMPLATES.map((t) => [t.id, {}])) as AllCopy

/** Every template's overrides. Returns empty overrides when nothing is stored. */
export async function getAllCopy(): Promise<AllCopy> {
  if (!isDatabaseConfigured()) return empty()

  const { data, error } = await serverClient().from('email_copy').select('template, copy')
  if (error) throw new Error(`getAllCopy: ${error.message}`)

  const out = empty()
  for (const row of (data ?? []) as { template: EmailTemplateId; copy: Copy }[]) {
    if (row.template in out) out[row.template] = row.copy ?? {}
  }
  return out
}

/** One template's overrides — what the senders need. */
export async function getCopy(id: EmailTemplateId): Promise<Copy> {
  if (!isDatabaseConfigured()) return {}

  const { data, error } = await serverClient()
    .from('email_copy')
    .select('copy')
    .eq('template', id)
    .maybeSingle()
  // Never let a copy lookup stop an email going out — fall back to defaults.
  if (error) {
    console.error(`[email copy] ${id}: ${error.message}`)
    return {}
  }
  return ((data as { copy?: Copy } | null)?.copy ?? {}) as Copy
}

export async function saveCopy(id: EmailTemplateId, copy: Copy): Promise<void> {
  const { error } = await serverClient()
    .from('email_copy')
    .upsert({ template: id, copy }, { onConflict: 'template' })
  if (error) throw new Error(`saveCopy(${id}): ${error.message}`)
}
