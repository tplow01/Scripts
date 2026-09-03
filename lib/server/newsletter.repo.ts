import 'server-only'

import { isDatabaseConfigured, serverClient } from './supabase'

/**
 * Newsletter signups. Storing `consented_at` is the point: an email address
 * with no record of when it was given is a liability, not an asset.
 */
export async function addSignup(email: string, source = 'footer'): Promise<void> {
  if (!isDatabaseConfigured()) {
    throw new Error('Supabase is not configured; refusing to drop a signup on the floor.')
  }

  // Signing up twice is not an error worth showing a visitor.
  const { error } = await serverClient()
    .from('newsletter_signups')
    .upsert({ email: email.toLowerCase().trim(), source }, { onConflict: 'email' })
  if (error) throw new Error(`addSignup: ${error.message}`)
}
