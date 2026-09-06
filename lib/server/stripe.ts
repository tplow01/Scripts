import 'server-only'

import Stripe from 'stripe'

/**
 * The Stripe client. `server-only` for the same reason as the database client:
 * the secret key must never reach the browser.
 */

const secret = process.env.STRIPE_SECRET_KEY

export function isStripeConfigured(): boolean {
  return Boolean(secret)
}

let cached: Stripe | null = null

export function stripe(): Stripe {
  if (!secret) {
    throw new Error(
      'Stripe is not configured. Add STRIPE_SECRET_KEY to .env.local ' +
      '(use the sk_test_… key while developing).',
    )
  }
  if (!cached) cached = new Stripe(secret)
  return cached
}

/**
 * Stripe works in the smallest currency unit — 4400, not 44.00. Rounding here
 * rather than at each call site keeps float error out of the amount we charge.
 */
export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100)
}

export function fromMinorUnits(amount: number): number {
  return amount / 100
}

export const CURRENCY = 'usd'
