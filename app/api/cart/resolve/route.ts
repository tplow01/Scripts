import { fail, ok } from '@/lib/server/http'
import { resolveVariants } from '@/lib/server/products.repo'
import { cartResolveSchema } from '@/lib/schemas/product'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST — turn stored cart entries into real products, variants and prices.
 *
 * The browser stores only `{ variantId, quantity }` and sends only that. Prices
 * come back from the server and are never accepted from the client — the same
 * rule that keeps Stripe honest later, which is why this endpoint is the seam
 * the payment work will reuse.
 *
 * Unknown ids are dropped rather than erroring: a variant deleted since the
 * shopper added it should quietly leave the cart, not break the page.
 */
export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail(400, 'Expected a JSON body.')
  }

  const parsed = cartResolveSchema.safeParse(body)
  if (!parsed.success) return fail(422, 'That cart is not valid.', parsed.error.flatten())

  const wanted = parsed.data.items
  const found = await resolveVariants(wanted.map((i) => i.variantId))
  const byVariantId = new Map(found.map((f) => [f.variantId, f.product]))

  const items = wanted.flatMap(({ variantId, quantity }) => {
    const product = byVariantId.get(variantId)
    const variant = product?.variants.find((v) => v.id === variantId)
    if (!product || !variant) return []
    return [{ product, variant, quantity }]
  })

  return ok({ items })
}
