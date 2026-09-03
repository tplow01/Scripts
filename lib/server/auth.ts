import 'server-only'

import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import type { NextResponse } from 'next/server'

import { isDatabaseConfigured } from './supabase'
import { fail } from './http'
import { ADMIN_COOKIE } from './authConstants'

/**
 * Back-office authentication.
 *
 * Credentials are checked by Supabase Auth — we never hash or compare a
 * password ourselves. The resulting access token is kept in an httpOnly
 * cookie, so page JavaScript (and anything injected into it) cannot read it.
 */

export { ADMIN_COOKIE }

/** Verify an access token and confirm it belongs to the configured admin. */
export async function verifyToken(token: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) return false

  const { data, error } = await createClient(url, anon).auth.getUser(token)
  if (error || !data.user?.email) return false

  const allowed = process.env.ADMIN_EMAIL?.toLowerCase().trim()
  // With no ADMIN_EMAIL set, any authenticated Supabase user counts — fine
  // while there is exactly one account, and tightened by setting the variable.
  return !allowed || data.user.email.toLowerCase() === allowed
}

/**
 * Guard for every /api/admin/* route. Returns a response to send when the
 * caller is not the admin, or `null` when the request may proceed.
 *
 * When Supabase isn't configured there is no account to authenticate against,
 * and every write path returns 503 anyway, so the guard stands aside. Reads in
 * that state serve the same seed/mock data the storefront already ships.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  if (!isDatabaseConfigured()) return null

  const token = (await cookies()).get(ADMIN_COOKIE)?.value
  if (!token) return fail(401, 'Sign in to the back office to do that.')
  if (!(await verifyToken(token))) return fail(401, 'Your session has expired. Sign in again.')
  return null
}
