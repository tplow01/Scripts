import 'server-only'

import { randomUUID } from 'node:crypto'

import { serverClient } from './supabase'

/**
 * Product images live in one public Supabase Storage bucket (migration 0010).
 *
 * The file never passes through our server. Vercel caps what a function may
 * receive at 4.5 MB and a phone photo is often larger, so the browser asks
 * /api/admin/media to check the file's type and size and mint a short-lived
 * signed address in the bucket, then PUTs the bytes straight to storage. What
 * the product row keeps is the permanent public URL.
 */

export const MEDIA_BUCKET = 'product-media'

/** 10 MB, matching the bucket's own cap (migration 0011). Room for a phone photo. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024

// Browser image types we will serve back out. SVG is deliberately absent: it
// can carry script, and nothing in the shop needs it.
const EXTENSION_FOR: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

export const ALLOWED_IMAGE_TYPES: readonly string[] = Object.keys(EXTENSION_FOR)

export type ImageCheck =
  | { ok: true; ext: string }
  | { ok: false; status: 413 | 415 | 422; message: string }

/**
 * Everything we decide about a file before a signed address is minted. The
 * bucket enforces the same limits, so this is the fast, well-worded refusal,
 * not the only line of defence.
 */
export function validateImage(file: { type: string; size: number }): ImageCheck {
  const ext = EXTENSION_FOR[file.type]
  if (!ext) return { ok: false, status: 415, message: 'Use a PNG, JPEG or WebP image.' }
  if (file.size <= 0) return { ok: false, status: 422, message: 'That file is empty.' }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, status: 413, message: 'Images must be 10 MB or smaller.' }
  }
  return { ok: true, ext }
}

// The id becomes a folder name in the bucket, so it must not be able to climb
// out of products/ or smuggle in separators. Admin ids are UUIDs; the seeded
// catalog uses short numerics.
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/

export const isSafeProductId = (id: string): boolean => SAFE_ID.test(id)

/** One folder per product, one random name per upload, so nothing ever overwrites. */
export const objectPath = (productId: string, ext: string): string =>
  `products/${productId}/${randomUUID()}.${ext}`

/** The bucket is public, so its objects have stable, cacheable URLs. */
export function publicMediaUrl(projectUrl: string, path: string): string {
  return `${projectUrl.replace(/\/+$/, '')}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`
}

/**
 * Mint the address the browser PUTs the file to. Valid for two hours, usable
 * once per path, and no other credential is needed to use it. Throws if
 * storage refuses, which the route reports rather than swallows.
 */
export async function createSignedUpload(path: string): Promise<string> {
  const { data, error } = await serverClient()
    .storage.from(MEDIA_BUCKET)
    .createSignedUploadUrl(path)
  if (error || !data) throw new Error(`createSignedUpload(${path}): ${error?.message ?? 'no data'}`)
  return data.signedUrl
}
