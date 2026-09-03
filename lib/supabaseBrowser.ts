'use client'

import { createClient } from '@supabase/supabase-js'

/**
 * Browser-side Supabase client, used only for the admin login form.
 *
 * This carries the ANON key, which is public by design — every table it can
 * reach is fenced by Row Level Security. The service-role key must never
 * appear in this file; see `lib/server/supabase.ts`.
 */
export function browserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error(
      'Supabase is not configured. Copy .env.example to .env.local and fill in ' +
      'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    )
  }
  return createClient(url, anon)
}
