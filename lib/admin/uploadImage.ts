/**
 * Browser side of product image upload, in two steps:
 *
 *   1. Ask /api/admin/media to check the file's type and size and mint a
 *      short-lived signed address in the storage bucket.
 *   2. PUT the bytes straight to that address. Nothing passes through our
 *      server, so Vercel's 4.5 MB function-body cap does not apply.
 *
 * Resolves with the permanent public URL to keep on the product. Rejects
 * with the server's or storage's message, which the drop zone shows as-is.
 */
export async function uploadProductImage(file: File, productId: string): Promise<string> {
  const prep = await fetch('/api/admin/media', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, type: file.type, size: file.size }),
  })
  const plan = (await prep.json().catch(() => null)) as
    | { uploadUrl?: string; url?: string; error?: { message?: string } }
    | null
  if (!prep.ok || !plan?.uploadUrl || !plan.url) {
    throw new Error(plan?.error?.message ?? `The image could not be uploaded (${prep.status}).`)
  }

  const put = await fetch(plan.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
      'Cache-Control': 'max-age=31536000',
      'x-upsert': 'false',
    },
    body: file,
  })
  if (!put.ok) {
    // Storage answers { statusCode, error, message }.
    const detail = (await put.json().catch(() => null)) as { message?: string } | null
    throw new Error(detail?.message ?? `The image could not be stored (${put.status}).`)
  }
  return plan.url
}
