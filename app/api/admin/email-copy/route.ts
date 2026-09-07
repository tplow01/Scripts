import { z } from 'zod'

import { requireAdmin } from '@/lib/server/auth'
import { fail, notConfigured, ok } from '@/lib/server/http'
import { getAllCopy, saveCopy } from '@/lib/server/emailCopy.repo'
import { specFor, TEMPLATES, type EmailTemplateId } from '@/lib/server/emails/defaults'
import { isDatabaseConfigured } from '@/lib/server/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  template: z.enum(['order_confirmation', 'order_shipped', 'order_delivered']),
  /** Only the fields the template actually declares; unknown keys are refused. */
  copy: z.record(z.string(), z.string().max(2000)),
})

export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied
  return ok({ copy: await getAllCopy(), templates: TEMPLATES })
}

export async function PUT(req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied
  if (!isDatabaseConfigured()) return notConfigured()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail(400, 'Expected a JSON body.')
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return fail(422, 'That copy is not valid.', parsed.error.flatten())

  // Refuse fields the template doesn't have, so a typo can't silently vanish.
  const allowed = new Set(specFor(parsed.data.template as EmailTemplateId).fields.map((f) => f.key))
  const unknown = Object.keys(parsed.data.copy).filter((k) => !allowed.has(k))
  if (unknown.length) return fail(422, `Unknown field(s): ${unknown.join(', ')}`)

  await saveCopy(parsed.data.template as EmailTemplateId, parsed.data.copy)
  return ok({ saved: parsed.data.template })
}
