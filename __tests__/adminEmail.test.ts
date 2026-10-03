import { afterEach, describe, expect, it, vi } from 'vitest'

import { isAdminEmail } from '@/lib/server/auth'

describe('isAdminEmail', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('accepts the configured admin, ignoring case and whitespace', () => {
    vi.stubEnv('ADMIN_EMAIL', '  Heath@Example.com ')
    expect(isAdminEmail('heath@example.com')).toBe(true)
    expect(isAdminEmail('HEATH@EXAMPLE.COM')).toBe(true)
  })

  it('rejects any other signed-in user', () => {
    vi.stubEnv('ADMIN_EMAIL', 'heath@example.com')
    expect(isAdminEmail('someone@example.com')).toBe(false)
  })

  it('rejects everyone when ADMIN_EMAIL is unset', () => {
    vi.stubEnv('ADMIN_EMAIL', '')
    expect(isAdminEmail('heath@example.com')).toBe(false)
  })

  it('rejects a missing email', () => {
    vi.stubEnv('ADMIN_EMAIL', 'heath@example.com')
    expect(isAdminEmail(undefined)).toBe(false)
    expect(isAdminEmail('')).toBe(false)
  })
})
