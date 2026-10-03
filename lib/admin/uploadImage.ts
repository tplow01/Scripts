/**
 * Browser side of product image upload. Posts the file to the admin media
 * route and resolves with the permanent public URL to keep on the product.
 * Rejects with the server's message, which the drop zone shows as-is.
 */
export async function uploadProductImage(file: File, productId: string): Promise<string> {
  const body = new FormData()
  body.append('file', file)
  body.append('productId', productId)

  const res = await fetch('/api/admin/media', { method: 'POST', body })
  const json = (await res.json().catch(() => null)) as
    | { url?: string; error?: { message?: string } }
    | null

  if (!res.ok || !json?.url) {
    throw new Error(json?.error?.message ?? `The image could not be uploaded (${res.status}).`)
  }
  return json.url
}
