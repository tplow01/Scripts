import { NextResponse } from 'next/server'

/**
 * One response shape for every route, so clients only ever parse two things:
 * the payload on success, or `{ error: { message, details } }` on failure.
 */

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status })
}

export function fail(status: number, message: string, details?: unknown): NextResponse {
  return NextResponse.json({ error: { message, details } }, { status })
}

/** The database isn't set up yet — a configuration problem, not a bad request. */
export function notConfigured(): NextResponse {
  return fail(
    503,
    'The database is not configured yet, so this change was not saved. ' +
    'Add the Supabase keys to .env.local and run the migration.',
  )
}

/** Body wasn't valid JSON at all. */
export async function readJson(req: Request): Promise<unknown | typeof INVALID> {
  try {
    return await req.json()
  } catch {
    return INVALID
  }
}

export const INVALID = Symbol('invalid-json')
