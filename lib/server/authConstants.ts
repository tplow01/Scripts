/**
 * Shared between `lib/server/auth.ts` (server) and `middleware.ts` (edge).
 * Kept out of auth.ts because that file is `server-only`, which middleware
 * may not import.
 */
export const ADMIN_COOKIE = 'scripts_admin'
