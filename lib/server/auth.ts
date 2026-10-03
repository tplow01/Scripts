import 'server-only'

import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import type { NextResponse } from 'next/server'

import { isDatabaseConfigured } from './supabase'
import { supabaseAnonKey, supabaseUrl } from './env'
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
  const url = supabaseUrl()
  const anon = supabaseAnonKey()
  if (!url || !anon) return false

  const { data, error } = await createClient(url, anon).auth.getUser(token)
  if (error || !data.user?.email) return false

  return isAdminEmail(data.user.email)
}

/**
 * Is this the one back-office account? Fails closed: with ADMIN_EMAIL unset,
 * nobody is. Otherwise any account that can sign in to the Supabase project
 * would count as the admin, and orders carry customer names and addresses.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  const allowed = process.env.ADMIN_EMAIL?.toLowerCase().trim()
  if (!allowed) {
    // Loud, because to Heath this looks exactly like a wrong password.
    console.error('[auth] ADMIN_EMAIL is not set, so nobody can sign in to the back office.')
    return false
  }
  if (!email) return false
  return email.toLowerCase().trim() === allowed
}

/**
 * Guard for every /api/admin/* route. Returns a response to send when the
 * caller is not the admin, or `null` when the request may proceed.
 *
 * When Supabase isn't configured there is no account to authenticate against.
 * In development the guard stands aside and reads serve the seed/mock data; in
 * production it fails closed (see below).
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  if (!isDatabaseConfigured()) {
    // Standing aside is a convenience for local development only. In
    // production a missing or misspelled env var must not quietly publish
    // orders and customer details, so refuse instead.
    if (process.env.NODE_ENV === 'production') {
      return fail(503, 'The back office is unavailable.')
    }
    return null
  }

  const token = (await cookies()).get(ADMIN_COOKIE)?.value
  if (!token) return fail(401, 'Sign in to the back office to do that.')
  if (!(await verifyToken(token))) return fail(401, 'Your session has expired. Sign in again.')
  return null
}
