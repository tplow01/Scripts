import { requireAdmin } from '@/lib/server/auth'
import { supabaseUrl } from '@/lib/server/env'
import { INVALID, fail, notConfigured, ok, readJson } from '@/lib/server/http'
import {
  createSignedUpload,
  isSafeProductId,
  objectPath,
  publicMediaUrl,
  validateImage,
} from '@/lib/server/media'
import { isDatabaseConfigured } from '@/lib/server/supabase'
import { mediaUploadSchema } from '@/lib/schemas/product'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST — prepare a product image upload.
 *
 * The file itself never comes here: Vercel caps what a function may receive
 * at 4.5 MB, and a phone photo is often larger. The browser sends what it
 * knows about the file — `{ productId, type, size }` — and gets back:
 *   `uploadUrl`  a short-lived signed address to PUT the bytes to, straight
 *                into the bucket;
 *   `url`        the permanent public address the product keeps.
 * The bucket enforces the same type and size limits, so the check here is a
 * fast, well-worded refusal rather than the only line of defence.
 */
export async function POST(req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied
  if (!isDatabaseConfigured()) return notConfigured()

  const body = await readJson(req)
  if (body === INVALID) return fail(400, 'Expected a JSON body.')

  const parsed = mediaUploadSchema.safeParse(body)
  if (!parsed.success) {
    return fail(422, 'Say which product the image is for, and its type and size.', parsed.error.flatten())
  }
  const { productId, type, size } = parsed.data
  if (!isSafeProductId(productId)) return fail(422, 'A valid product id is required.')

  const check = validateImage({ type, size })
  if (!check.ok) return fail(check.status, check.message)

  const path = objectPath(productId, check.ext)
  try {
    const uploadUrl = await createSignedUpload(path)
    return ok({ uploadUrl, url: publicMediaUrl(supabaseUrl()!, path) })
  } catch (err) {
    console.error(`[media] ${(err as Error).message}`)
    return fail(502, 'The image could not be stored. Try again in a moment.')
  }
}
