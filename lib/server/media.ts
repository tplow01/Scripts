import 'server-only'

import { randomUUID } from 'node:crypto'

import { supabaseUrl } from './env'
import { serverClient } from './supabase'

/**
 * Product images live in one public Supabase Storage bucket (migration 0010).
 * The browser never writes to it: the admin posts a file to /api/admin/media,
 * which checks it here and uploads with the service key. What the product
 * row then stores is the permanent public URL, not a session-only blob: URL.
 */

export const MEDIA_BUCKET = 'product-media'

/** 5 MB. A product cutout PNG is well under 1 MB; this is headroom, not a target. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

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

/** Everything we decide about a file before a single byte goes to storage. */
export function validateImage(file: { type: string; size: number }): ImageCheck {
  const ext = EXTENSION_FOR[file.type]
  if (!ext) return { ok: false, status: 415, message: 'Use a PNG, JPEG or WebP image.' }
  if (file.size <= 0) return { ok: false, status: 422, message: 'That file is empty.' }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, status: 413, message: 'Images must be 5 MB or smaller.' }
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

/** Store one checked image and return its public URL. Throws if storage refuses. */
export async function uploadProductImage(path: string, file: Blob, contentType: string): Promise<string> {
  const { error } = await serverClient()
    .storage.from(MEDIA_BUCKET)
    .upload(path, file, { contentType, cacheControl: '31536000', upsert: false })
  if (error) throw new Error(`uploadProductImage(${path}): ${error.message}`)
  return publicMediaUrl(supabaseUrl()!, path)
}
