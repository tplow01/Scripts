import { NextResponse, type NextRequest } from 'next/server'

import { ADMIN_COOKIE } from '@/lib/server/authConstants'
import { ADMIN_SLUG } from '@/lib/admin/config'

/**
 * Redirects signed-out visitors away from the back office.
 *
 * This is a UX gate, not the security boundary: it only checks that a session
 * cookie is present, because middleware runs on the edge and cannot verify the
 * token. The real check is `requireAdmin()` inside every /api/admin/* route,
 * which is where the data actually lives.
 *
 * With Supabase unconfigured there is no account to sign in to, so the gate
 * stands aside and the admin keeps working on seed data.
 */
export function middleware(req: NextRequest) {
  const configured = Boolean(
    (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  )
  if (!configured) return NextResponse.next()

  const { pathname } = req.nextUrl
  const loginPath = `/${ADMIN_SLUG}/login`
  if (pathname === loginPath) return NextResponse.next()

  if (req.cookies.get(ADMIN_COOKIE)?.value) return NextResponse.next()

  const url = req.nextUrl.clone()
  url.pathname = loginPath
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/office-scr1pts-x7k2/:path*'],
}
