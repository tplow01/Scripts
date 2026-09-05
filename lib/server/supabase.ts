import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { supabaseServiceKey, supabaseUrl } from './env'

/**
 * The privileged database client.
 *
 * `import 'server-only'` above is the guard that matters: importing this file
 * from a client component becomes a BUILD ERROR rather than silently shipping
 * the service-role key — which bypasses every RLS policy — to the browser.
 */


/**
 * False until a Supabase project exists. Read paths fall back to the seed
 * catalog so the app still runs; write paths refuse with a clear 503 rather
 * than pretending to have saved something.
 */
export function isDatabaseConfigured(): boolean {
  return Boolean(supabaseUrl() && supabaseServiceKey())
}

let cached: SupabaseClient | null = null

export function serverClient(): SupabaseClient {
  const url = supabaseUrl()
  const serviceKey = supabaseServiceKey()
  if (!url || !serviceKey) {
    throw new Error(
      'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY ' +
      '(in .env.local locally, or the host\'s environment settings when deployed).',
    )
  }
  if (!cached) {
    cached = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return cached
}
