import type Stripe from 'stripe'

import { fail, ok } from '@/lib/server/http'
import { resolveVariants } from '@/lib/server/products.repo'
import { CURRENCY, isStripeConfigured, stripe, toMinorUnits } from '@/lib/server/stripe'
import { cartResolveSchema } from '@/lib/schemas/product'
import { variantTitle } from '@/lib/admin/variants'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Where SCR!PTS will ship. Stripe won't let a customer choose anything else,
 * so widening this is a business decision, not a technical one.
 */
const SHIP_TO: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] = [
  'US', 'CA', 'GB', 'IE', 'AU', 'NZ', 'DE', 'FR', 'ES', 'IT', 'NL', 'SE', 'DK', 'NO',
]

/**
 * POST — turn a cart into a Stripe Checkout Session and hand back its URL.
 *
 * The browser sends variant ids and quantities. It does NOT send prices, and
 * none would be trusted if it did: every amount below is read from the database
 * inside this handler. That is the whole reason this endpoint exists rather
 * than the client talking to Stripe directly.
 */
export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return fail(503, 'Payments are not configured yet.')
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail(400, 'Expected a JSON body.')
  }

  const parsed = cartResolveSchema.safeParse(body)
  if (!parsed.success) return fail(422, 'That cart is not valid.', parsed.error.flatten())
  if (!parsed.data.items.length) return fail(422, 'Your bag is empty.')

  const wanted = parsed.data.items
  const found = await resolveVariants(wanted.map((i) => i.variantId))
  const byVariantId = new Map(found.map((f) => [f.variantId, f.product]))

  const origin = req.headers.get('origin') ?? new URL(req.url).origin

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []

  for (const { variantId, quantity } of wanted) {
    const product = byVariantId.get(variantId)
    const variant = product?.variants.find((v) => v.id === variantId)
    if (!product || !variant) {
      return fail(409, 'Something in your bag is no longer available. Refresh and try again.')
    }

    // Stock is checked here as well as at fulfilment: better to refuse before
    // taking money than to refund afterwards. Untracked or backorderable
    // variants always pass.
    if (variant.trackInventory && !variant.allowBackorder && variant.stock < quantity) {
      const left = variant.stock
      return fail(
        409,
        left === 0
          ? `${product.name} (${variantTitle(variant.optionValues)}) just sold out.`
          : `Only ${left} left of ${product.name} (${variantTitle(variant.optionValues)}).`,
      )
    }

    // Stripe cannot fetch images from localhost, so only send them from a real
    // origin — the checkout page just shows no thumbnail in development.
    const image = product.media[0]?.url
    const images =
      image && origin.startsWith('https://') ? [`${origin}${image}`] : undefined

    lineItems.push({
      quantity,
      price_data: {
        currency: CURRENCY,
        unit_amount: toMinorUnits(variant.price),
        product_data: {
          name: product.name,
          description: variantTitle(variant.optionValues) || undefined,
          images,
          // The webhook reads this back to know exactly which variant to
          // decrement. Carried per line, so it scales past metadata's size cap.
          metadata: { variant_id: variant.id, product_name: product.name },
        },
      },
    })
  }

  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/cart`,
    // No accounts in SCR!PTS, so Stripe collects the email itself.
    shipping_address_collection: { allowed_countries: SHIP_TO },
    phone_number_collection: { enabled: true },
    // Free shipping for launch (matches the old SHIPPING = 0 constant).
    shipping_options: [
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: { amount: 0, currency: CURRENCY },
          display_name: 'Free shipping',
        },
      },
    ],
  })

  if (!session.url) return fail(502, 'Stripe did not return a checkout URL.')
  return ok({ url: session.url })
}
