import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * The privileged database client.
 *
 * `import 'server-only'` above is the guard that matters: importing this file
 * from a client component becomes a BUILD ERROR rather than silently shipping
 * the service-role key — which bypasses every RLS policy — to the browser.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * False until a Supabase project exists. Read paths fall back to the seed
 * catalog so the app still runs; write paths refuse with a clear 503 rather
 * than pretending to have saved something.
 */
export function isDatabaseConfigured(): boolean {
  return Boolean(url && serviceKey)
}

let cached: SupabaseClient | null = null

export function serverClient(): SupabaseClient {
  if (!url || !serviceKey) {
    throw new Error(
      'Supabase is not configured. Copy .env.example to .env.local and fill in ' +
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    )
  }
  if (!cached) {
    cached = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return cached
}
