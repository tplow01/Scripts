import { requireAdmin } from '@/lib/server/auth'
import { fail, notConfigured, ok } from '@/lib/server/http'
import { listAllProducts, upsertProduct } from '@/lib/server/products.repo'
import { isDatabaseConfigured } from '@/lib/server/supabase'
import { productSchema } from '@/lib/schemas/product'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET — every product, including drafts and Basement pieces. */
export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied

  return ok({ products: await listAllProducts() })
}

/** POST — create. */
export async function POST(req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied
  if (!isDatabaseConfigured()) return notConfigured()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail(400, 'Expected a JSON body.')
  }

  const parsed = productSchema.safeParse(body)
  if (!parsed.success) return fail(422, 'That product is not valid.', parsed.error.flatten())

  return ok({ product: await upsertProduct(parsed.data) }, 201)
}
