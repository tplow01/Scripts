import { requireAdmin } from '@/lib/server/auth'
import { fail, notConfigured, ok } from '@/lib/server/http'
import {
  isSafeProductId,
  objectPath,
  uploadProductImage,
  validateImage,
} from '@/lib/server/media'
import { isDatabaseConfigured } from '@/lib/server/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST — store one product image.
 *
 * Multipart form: `file` (PNG, JPEG or WebP, at most 5 MB) and `productId`.
 * Responds 201 with `{ url }`, the permanent public address the product's
 * media row should keep. The file is checked before any byte goes to storage,
 * and a storage failure is reported, never swallowed.
 */
export async function POST(req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied
  if (!isDatabaseConfigured()) return notConfigured()

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return fail(400, 'Expected a form with an image file.')
  }

  const file = form.get('file')
  const productId = form.get('productId')
  if (!(file instanceof Blob)) return fail(400, 'Attach the image as the "file" field.')
  if (typeof productId !== 'string' || !isSafeProductId(productId)) {
    return fail(422, 'A valid product id is required.')
  }

  const check = validateImage(file)
  if (!check.ok) return fail(check.status, check.message)

  const path = objectPath(productId, check.ext)
  try {
    return ok({ url: await uploadProductImage(path, file, file.type) }, 201)
  } catch (err) {
    console.error(`[media] ${(err as Error).message}`)
    return fail(502, 'The image could not be stored. Try again in a moment.')
  }
}
