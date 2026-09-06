/**
 * Supabase configuration, read at runtime.
 *
 * These are deliberately NOT `NEXT_PUBLIC_*`. Next inlines `NEXT_PUBLIC_`
 * values into the bundle at build time, so a deployment built before a variable
 * was set keeps the old value forever and no amount of re-setting it in the
 * dashboard helps — a genuinely confusing failure, because the app looks fine
 * and silently serves fallback data.
 *
 * Nothing here belongs in the browser anyway: every consumer is server-side
 * (the API routes, the data layer, middleware and the seed script).
 *
 * The NEXT_PUBLIC_ names are still accepted so existing setups keep working.
 */

export function supabaseUrl(): string | undefined {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
}

export function supabaseAnonKey(): string | undefined {
  return process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
}

export function supabaseServiceKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY
}
