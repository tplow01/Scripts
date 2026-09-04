import { redirect } from 'next/navigation'

/**
 * Checkout now happens on Stripe's hosted page: the bag posts to
 * /api/checkout/session and the shopper is redirected there, returning to
 * /checkout/success afterwards.
 *
 * This route stays as a redirect so older links — and anyone's bookmark — land
 * somewhere sensible instead of a 404.
 */
export default function CheckoutPage() {
  redirect('/cart')
}
