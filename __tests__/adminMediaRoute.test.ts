// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requireAdmin, createSignedUpload, configured } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  createSignedUpload: vi.fn(),
  configured: { value: true },
}))

vi.mock('@/lib/server/auth', () => ({ requireAdmin }))
vi.mock('@/lib/server/supabase', () => ({ isDatabaseConfigured: () => configured.value }))
vi.mock('@/lib/server/env', () => ({
  supabaseUrl: () => 'https://abc.supabase.co',
  supabaseAnonKey: () => 'anon',
  supabaseServiceKey: () => 'service',
}))
vi.mock('@/lib/server/media', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server/media')>()),
  createSignedUpload,
}))

import { POST } from '@/app/api/admin/media/route'

const PID = '6c65bb89-ce1c-4c44-9fc4-4e93ad5aa1a4'
const SIGNED =
  'https://abc.supabase.co/storage/v1/object/upload/sign/product-media/products/x/y.png?token=t'

function post(body: unknown) {
  return new Request('http://localhost/api/admin/media', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

const plan = (over: Partial<{ productId: string; type: string; size: number }> = {}) => ({
  productId: PID,
  type: 'image/png',
  size: 16,
  ...over,
})

describe('POST /api/admin/media', () => {
  beforeEach(() => {
    requireAdmin.mockReset().mockResolvedValue(null)
    createSignedUpload.mockReset().mockResolvedValue(SIGNED)
    configured.value = true
  })

  it('refuses without the admin session, before minting anything', async () => {
    requireAdmin.mockResolvedValue(new Response('{"error":{"message":"Sign in"}}', { status: 401 }))
    expect((await POST(post(plan()))).status).toBe(401)
    expect(createSignedUpload).not.toHaveBeenCalled()
  })

  it('is unavailable until Supabase is configured', async () => {
    configured.value = false
    expect((await POST(post(plan()))).status).toBe(503)
    expect(createSignedUpload).not.toHaveBeenCalled()
  })

  it('needs a JSON body with the product id, type and size', async () => {
    expect((await POST(post('not json'))).status).toBe(400)
    expect((await POST(post({}))).status).toBe(422)
    expect((await POST(post({ productId: PID, type: 'image/png' }))).status).toBe(422)
    expect(createSignedUpload).not.toHaveBeenCalled()
  })

  it('needs a product id that can safely name a folder', async () => {
    expect((await POST(post(plan({ productId: '../escape' })))).status).toBe(422)
    expect(createSignedUpload).not.toHaveBeenCalled()
  })

  it('refuses the wrong type, an empty file and an oversized file before minting', async () => {
    expect((await POST(post(plan({ type: 'image/gif' })))).status).toBe(415)
    expect((await POST(post(plan({ size: 0 })))).status).toBe(422)
    expect((await POST(post(plan({ size: 10 * 1024 * 1024 + 1 })))).status).toBe(413)
    expect(createSignedUpload).not.toHaveBeenCalled()
  })

  it('words the size refusal for a person, not a log', async () => {
    const res = await POST(post(plan({ size: 10 * 1024 * 1024 + 1 })))
    expect(await res.json()).toEqual({ error: { message: 'Images must be 10 MB or smaller.' } })
  })

  it('mints a signed address under the product and names the public url', async () => {
    const res = await POST(post(plan()))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { uploadUrl: string; url: string }
    expect(body.uploadUrl).toBe(SIGNED)
    expect(body.url).toMatch(
      new RegExp(
        `^https://abc\\.supabase\\.co/storage/v1/object/public/product-media/products/${PID}/[0-9a-f-]{36}\\.png$`,
      ),
    )

    expect(createSignedUpload).toHaveBeenCalledTimes(1)
    const [path] = createSignedUpload.mock.calls[0]
    expect(path).toMatch(new RegExp(`^products/${PID}/[0-9a-f-]{36}\\.png$`))
    // The public url points at exactly the object that was minted.
    expect(body.url.endsWith(path)).toBe(true)
  })

  it('reports a storage failure instead of pretending', async () => {
    createSignedUpload.mockRejectedValue(new Error('bucket missing'))
    expect((await POST(post(plan()))).status).toBe(502)
  })
})
