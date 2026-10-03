import { describe, expect, it } from 'vitest'

import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MEDIA_BUCKET,
  isSafeProductId,
  objectPath,
  publicMediaUrl,
  validateImage,
} from '@/lib/server/media'

/**
 * The upload route trusts nothing about a file except what these checks
 * establish. They run before any byte reaches storage, so a bad request costs
 * one function call, not a round trip to Supabase.
 */
describe('validateImage', () => {
  it('accepts png, jpeg and webp under the size cap, naming the extension', () => {
    expect(validateImage({ type: 'image/png', size: 10 })).toEqual({ ok: true, ext: 'png' })
    expect(validateImage({ type: 'image/jpeg', size: 10 })).toEqual({ ok: true, ext: 'jpg' })
    expect(validateImage({ type: 'image/webp', size: 10 })).toEqual({ ok: true, ext: 'webp' })
    expect(validateImage({ type: 'image/png', size: MAX_IMAGE_BYTES })).toEqual({ ok: true, ext: 'png' })
  })

  it('refuses every other type, including svg, which can carry script', () => {
    for (const type of ['image/gif', 'image/svg+xml', 'text/plain', 'application/pdf', '']) {
      const result = validateImage({ type, size: 10 })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.status).toBe(415)
    }
  })

  it('refuses a file over the cap before it is read', () => {
    const result = validateImage({ type: 'image/png', size: MAX_IMAGE_BYTES + 1 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.status).toBe(413)
  })

  it('refuses an empty file', () => {
    const result = validateImage({ type: 'image/png', size: 0 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.status).toBe(422)
  })

  it('caps at 5 MB and lists exactly the three web image types', () => {
    expect(MAX_IMAGE_BYTES).toBe(5 * 1024 * 1024)
    expect([...ALLOWED_IMAGE_TYPES].sort()).toEqual(['image/jpeg', 'image/png', 'image/webp'])
  })
})

describe('isSafeProductId', () => {
  it('accepts the ids the admin generates and the seeded numeric ones', () => {
    expect(isSafeProductId('6c65bb89-ce1c-4c44-9fc4-4e93ad5aa1a4')).toBe(true)
    expect(isSafeProductId('1')).toBe(true)
  })

  it('refuses anything that could escape the product folder or is junk', () => {
    for (const id of ['', '../etc', 'a/b', 'a b', 'x'.repeat(65), 'id?x=1', '.']) {
      expect(isSafeProductId(id)).toBe(false)
    }
  })
})

describe('objectPath', () => {
  it('files the image under its product with a fresh random name', () => {
    const a = objectPath('6c65bb89-ce1c-4c44-9fc4-4e93ad5aa1a4', 'png')
    const b = objectPath('6c65bb89-ce1c-4c44-9fc4-4e93ad5aa1a4', 'png')
    expect(a).toMatch(/^products\/6c65bb89-ce1c-4c44-9fc4-4e93ad5aa1a4\/[0-9a-f-]{36}\.png$/)
    expect(b).not.toBe(a)
  })
})

describe('publicMediaUrl', () => {
  it('points at the public object endpoint of the bucket', () => {
    expect(publicMediaUrl('https://abc.supabase.co', 'products/1/x.png')).toBe(
      `https://abc.supabase.co/storage/v1/object/public/${MEDIA_BUCKET}/products/1/x.png`,
    )
  })

  it('tolerates a trailing slash on the project url', () => {
    expect(publicMediaUrl('https://abc.supabase.co/', 'products/1/x.png')).toBe(
      `https://abc.supabase.co/storage/v1/object/public/${MEDIA_BUCKET}/products/1/x.png`,
    )
  })
})
