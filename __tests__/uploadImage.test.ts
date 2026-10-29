import { afterEach, describe, expect, it, vi } from 'vitest'

import { uploadProductImage } from '@/lib/admin/uploadImage'

/**
 * The browser helper's contract with the route and with storage. Both hops
 * are plain fetches, so a mocked fetch pins down the order, the payloads and
 * which message a failure surfaces.
 */

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const UPLOAD =
  'https://abc.supabase.co/storage/v1/object/upload/sign/product-media/products/p1/x.png?token=t'
const PUBLIC = 'https://abc.supabase.co/storage/v1/object/public/product-media/products/p1/x.png'

const png = () => new File([new Uint8Array(16)], 'shirt.png', { type: 'image/png' })

describe('uploadProductImage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('asks the server for an address, then sends the bytes straight there', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(200, { uploadUrl: UPLOAD, url: PUBLIC }))
      .mockResolvedValueOnce(json(200, { Key: 'product-media/products/p1/x.png' }))
    vi.stubGlobal('fetch', fetchMock)

    const file = png()
    await expect(uploadProductImage(file, 'p1')).resolves.toBe(PUBLIC)
    expect(fetchMock).toHaveBeenCalledTimes(2)

    const [prepUrl, prepInit] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(prepUrl).toBe('/api/admin/media')
    expect(prepInit.method).toBe('POST')
    expect(JSON.parse(prepInit.body as string)).toEqual({ productId: 'p1', type: 'image/png', size: 16 })

    const [putUrl, putInit] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(putUrl).toBe(UPLOAD)
    expect(putInit.method).toBe('PUT')
    expect((putInit.headers as Record<string, string>)['Content-Type']).toBe('image/png')
    expect(putInit.body).toBe(file)
  })

  it('surfaces the server refusal and never sends the bytes', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(413, { error: { message: 'Images must be 10 MB or smaller.' } }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(uploadProductImage(png(), 'p1')).rejects.toThrow('Images must be 10 MB or smaller.')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('surfaces a storage refusal with its own message', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(json(200, { uploadUrl: UPLOAD, url: PUBLIC }))
        .mockResolvedValueOnce(
          json(400, { statusCode: '400', error: 'InvalidRequest', message: 'mime type not supported' }),
        ),
    )
    await expect(uploadProductImage(png(), 'p1')).rejects.toThrow('mime type not supported')
  })

  it('falls back to the status when a refusal carries no message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(new Response('Request Entity Too Large', { status: 413 })),
    )
    await expect(uploadProductImage(png(), 'p1')).rejects.toThrow('(413)')
  })
})
