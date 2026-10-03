import { fail, notConfigured, ok } from '@/lib/server/http'
import { addSignup } from '@/lib/server/newsletter.repo'
import { clientIp } from '@/lib/server/clientIp'
import { checkRateLimit } from '@/lib/server/rateLimit'
import { isDatabaseConfigured } from '@/lib/server/supabase'
import { newsletterSchema } from '@/lib/schemas/product'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!isDatabaseConfigured()) return notConfigured()

  // A person signs up once. Five tries a minute per IP is generous for typos
  // and still stops a script filling the subscriber table.
  if (!checkRateLimit(`newsletter:${clientIp(req)}`, { limit: 5, windowMs: 60_000 })) {
    return fail(429, 'Too many tries. Give it a minute.')
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail(400, 'Expected a JSON body.')
  }

  const parsed = newsletterSchema.safeParse(body)
  if (!parsed.success) {
    return fail(422, 'Enter a valid email address.', parsed.error.flatten())
  }

  await addSignup(parsed.data.email, parsed.data.source)
  return ok({ subscribed: true }, 201)
}
