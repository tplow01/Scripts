// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Node environment on purpose: the route reads multipart bodies through the
 * platform FormData/File, and jsdom's copies are not the ones Request uses.
 */

const { requireAdmin, uploadProductImage, configured } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  uploadProductImage: vi.fn(),
  configured: { value: true },
}))

vi.mock('@/lib/server/auth', () => ({ requireAdmin }))
vi.mock('@/lib/server/supabase', () => ({ isDatabaseConfigured: () => configured.value }))
vi.mock('@/lib/server/media', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server/media')>()),
  uploadProductImage,
}))

import { POST } from '@/app/api/admin/media/route'

const PID = '6c65bb89-ce1c-4c44-9fc4-4e93ad5aa1a4'
const STORED = 'https://abc.supabase.co/storage/v1/object/public/product-media/products/x/y.png'

function image(type = 'image/png', bytes = 16, name = 'shirt.png') {
  return new File([new Uint8Array(bytes)], name, { type })
}

function post(parts: { file?: File | string; productId?: string }) {
  const form = new FormData()
  if (parts.file !== undefined) form.append('file', parts.file)
  if (parts.productId !== undefined) form.append('productId', parts.productId)
  return new Request('http://localhost/api/admin/media', { method: 'POST', body: form })
}

describe('POST /api/admin/media', () => {
  beforeEach(() => {
    requireAdmin.mockReset().mockResolvedValue(null)
    uploadProductImage.mockReset().mockResolvedValue(STORED)
    configured.value = true
  })

  it('refuses without the admin session, before touching storage', async () => {
    requireAdmin.mockResolvedValue(new Response('{"error":{"message":"Sign in"}}', { status: 401 }))
    const res = await POST(post({ file: image(), productId: PID }))
    expect(res.status).toBe(401)
    expect(uploadProductImage).not.toHaveBeenCalled()
  })

  it('is unavailable until Supabase is configured', async () => {
    configured.value = false
    const res = await POST(post({ file: image(), productId: PID }))
    expect(res.status).toBe(503)
    expect(uploadProductImage).not.toHaveBeenCalled()
  })

  it('needs a file field that is actually a file', async () => {
    expect((await POST(post({ productId: PID }))).status).toBe(400)
    expect((await POST(post({ file: 'not-a-file', productId: PID }))).status).toBe(400)
    expect(uploadProductImage).not.toHaveBeenCalled()
  })

  it('needs a product id that can safely name a folder', async () => {
    expect((await POST(post({ file: image() }))).status).toBe(422)
    expect((await POST(post({ file: image(), productId: '../escape' }))).status).toBe(422)
    expect(uploadProductImage).not.toHaveBeenCalled()
  })

  it('refuses the wrong type and oversized files before upload', async () => {
    expect((await POST(post({ file: image('image/gif'), productId: PID }))).status).toBe(415)
    const big = image('image/png', 5 * 1024 * 1024 + 1)
    expect((await POST(post({ file: big, productId: PID }))).status).toBe(413)
    expect(uploadProductImage).not.toHaveBeenCalled()
  })

  it('stores a good image under its product and returns the public url', async () => {
    const res = await POST(post({ file: image(), productId: PID }))
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ url: STORED })

    expect(uploadProductImage).toHaveBeenCalledTimes(1)
    const [path, blob, contentType] = uploadProductImage.mock.calls[0]
    expect(path).toMatch(new RegExp(`^products/${PID}/[0-9a-f-]{36}\\.png$`))
    expect(blob).toBeInstanceOf(Blob)
    expect(contentType).toBe('image/png')
  })

  it('reports a storage failure instead of pretending the image was saved', async () => {
    uploadProductImage.mockRejectedValue(new Error('bucket missing'))
    const res = await POST(post({ file: image(), productId: PID }))
    expect(res.status).toBe(502)
  })
})
