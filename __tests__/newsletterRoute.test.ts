import { beforeEach, describe, expect, it, vi } from 'vitest'

import { newsletterSchema } from '@/lib/schemas/product'

const { addSignup } = vi.hoisted(() => ({ addSignup: vi.fn() }))

vi.mock('@/lib/server/newsletter.repo', () => ({ addSignup }))
vi.mock('@/lib/server/supabase', () => ({ isDatabaseConfigured: () => true }))

import { POST } from '@/app/api/newsletter/route'

function signup(email: string, ip = '203.0.113.7') {
  return new Request('http://localhost/api/newsletter', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-real-ip': ip },
    body: JSON.stringify({ email }),
  })
}

describe('newsletterSchema', () => {
  it('caps an email at 254 characters, the longest a real address can be', () => {
    const local = 'a'.repeat(64)
    const ok = `${local}@${'b'.repeat(254 - 64 - 1 - 4)}.com`
    expect(ok).toHaveLength(254)
    expect(newsletterSchema.safeParse({ email: ok }).success).toBe(true)
    expect(newsletterSchema.safeParse({ email: `${'a'.repeat(5000)}@x.com` }).success).toBe(false)
  })

  it('trims and lowercases before storing', () => {
    const parsed = newsletterSchema.parse({ email: '  Heath@Example.COM ' })
    expect(parsed.email).toBe('heath@example.com')
  })
})

describe('POST /api/newsletter', () => {
  beforeEach(() => addSignup.mockReset().mockResolvedValue(undefined))

  it('signs up a valid address', async () => {
    const res = await POST(signup('fan@example.com', '198.51.100.1'))
    expect(res.status).toBe(201)
    expect(addSignup).toHaveBeenCalledWith('fan@example.com', undefined)
  })

  it('never writes an oversized address', async () => {
    const res = await POST(signup(`${'a'.repeat(5000)}@x.com`, '198.51.100.2'))
    expect(res.status).toBe(422)
    expect(addSignup).not.toHaveBeenCalled()
  })

  it('rate-limits one IP hammering the form', async () => {
    const ip = '198.51.100.3'
    const statuses: number[] = []
    for (let i = 0; i < 7; i++) statuses.push((await POST(signup(`fan${i}@example.com`, ip))).status)
    expect(statuses.slice(0, 5)).toEqual([201, 201, 201, 201, 201])
    expect(statuses.slice(5)).toEqual([429, 429])
    expect(addSignup).toHaveBeenCalledTimes(5)
  })

  it('keeps a separate allowance per IP', async () => {
    for (let i = 0; i < 5; i++) await POST(signup(`a${i}@example.com`, '198.51.100.4'))
    const res = await POST(signup('b@example.com', '198.51.100.5'))
    expect(res.status).toBe(201)
  })
})
