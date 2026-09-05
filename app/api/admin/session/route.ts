import { createClient } from '@supabase/supabase-js'

import { ADMIN_COOKIE } from '@/lib/server/auth'
import { supabaseAnonKey, supabaseUrl } from '@/lib/server/env'
import { fail, ok } from '@/lib/server/http'
import { isDatabaseConfigured } from '@/lib/server/supabase'

/**
 * POST — sign in.   DELETE — sign out.
 *
 * The password is posted here and exchanged with Supabase Auth server-side;
 * the access token comes back to the browser only as an httpOnly cookie, so no
 * script on the page can read it.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!isDatabaseConfigured()) {
    return fail(503, 'Supabase is not configured, so there is no account to sign in to yet.')
  }

  let body: { email?: unknown; password?: unknown }
  try {
    body = await req.json()
  } catch {
    return fail(400, 'Expected a JSON body.')
  }

  const email = typeof body.email === 'string' ? body.email : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (!email || !password) return fail(422, 'Enter your email and password.')

  const supabase = createClient(supabaseUrl()!, supabaseAnonKey()!)
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  // Deliberately vague: never reveal whether the address exists.
  if (error || !data.session) return fail(401, 'Those details did not match an account.')

  const res = ok({ email: data.user?.email ?? email })
  res.cookies.set(ADMIN_COOKIE, data.session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: data.session.expires_in ?? 3600,
  })
  return res
}

export async function DELETE() {
  const res = ok({ signedOut: true })
  res.cookies.set(ADMIN_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
