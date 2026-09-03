import { requireAdmin } from '@/lib/server/auth'
import { fail, notConfigured, ok } from '@/lib/server/http'
import {
  deleteProduct,
  getProductById,
  setPublishedStatus,
  upsertProduct,
} from '@/lib/server/products.repo'
import { isDatabaseConfigured } from '@/lib/server/supabase'
import { productSchema, publishToggleSchema } from '@/lib/schemas/product'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Next 15: dynamic route params arrive as a Promise (same as app/products/[slug]).
type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id } = await params
  const product = await getProductById(id)
  if (!product) return fail(404, 'No product with that id.')
  return ok({ product })
}

/** PUT — replace. The body is the whole product, so its children replace too. */
export async function PUT(req: Request, { params }: Ctx) {
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

  const { id } = await params
  if (parsed.data.id !== id) return fail(400, 'The product id in the body must match the URL.')

  return ok({ product: await upsertProduct(parsed.data) })
}

/** PATCH — publish/unpublish only. */
export async function PATCH(req: Request, { params }: Ctx) {
  const denied = await requireAdmin()
  if (denied) return denied
  if (!isDatabaseConfigured()) return notConfigured()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail(400, 'Expected a JSON body.')
  }

  const parsed = publishToggleSchema.safeParse(body)
  if (!parsed.success) return fail(422, 'That status is not valid.', parsed.error.flatten())

  const { id } = await params
  const product = await setPublishedStatus(id, parsed.data.publishedStatus)
  if (!product) return fail(404, 'No product with that id.')
  return ok({ product })
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const denied = await requireAdmin()
  if (denied) return denied
  if (!isDatabaseConfigured()) return notConfigured()

  const { id } = await params
  await deleteProduct(id)
  return ok({ deleted: id })
}
