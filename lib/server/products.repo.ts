import 'server-only'

import type { Product } from '@/types/product'
import {
  ALL_PRODUCTS,
  BASEMENT_PRODUCTS,
  CYBER_LOVE_PRODUCTS,
  findProductBySlug as findSeedProductBySlug,
} from '@/lib/products'

import { isDatabaseConfigured, serverClient } from './supabase'
import {
  mediaRows,
  optionRows,
  productToRow,
  rowToProduct,
  variantRows,
  type ProductRow,
} from './mapping'

/**
 * The product data layer. Server components call these directly — there is no
 * HTTP hop into our own process just to read our own database.
 *
 * Until Supabase is configured, reads fall back to the seed catalog in
 * `lib/products.ts` so the app runs with no infrastructure. Writes never fall
 * back: `isDatabaseConfigured()` is false, the route returns 503, and nothing
 * pretends to have saved.
 */

const SELECT = `
  id, name, slug, emotion, description, collection, is_basement, product_type,
  vendor, tags, published_status, sku_root, ship_date, requires_shipping,
  seo_title, seo_description, fit, fabric, fabric_weight, model_note,
  care_instructions,
  product_options ( name, values, position ),
  product_variants ( id, product_id, option_values, sku, barcode, price,
                     compare_at_price, cost, stock, track_inventory,
                     allow_backorder, weight_grams, image_id, position ),
  product_media ( id, url, alt, position )
`

// ── Reads ───────────────────────────────────────────────────────────────────

/**
 * Reads degrade, writes don't. A configured-but-unreachable database — a bad
 * or future-dated service key, clock skew, a paused project — must not take the
 * whole site down at build or serve time. Every read falls back to the seed
 * catalog on failure, exactly as it does when no database is configured at all;
 * the cause is logged so it stays visible. Writes still throw (see below): we
 * never want to pretend a save happened.
 */
async function readOrSeed<T>(label: string, run: () => Promise<T>, seed: () => T): Promise<T> {
  try {
    return await run()
  } catch (err) {
    console.warn(`${label}: database read failed, falling back to seed catalog — ${(err as Error).message}`)
    return seed()
  }
}

/** Storefront listing: published, non-Basement. */
export async function listStorefrontProducts(): Promise<Product[]> {
  if (!isDatabaseConfigured()) return CYBER_LOVE_PRODUCTS
  return readOrSeed('listStorefrontProducts', async () => {
    const { data, error } = await serverClient()
      .from('products')
      .select(SELECT)
      .eq('is_basement', false)
      .eq('published_status', 'active')
      .order('id')
    if (error) throw new Error(error.message)
    return (data as unknown as ProductRow[]).map(rowToProduct)
  }, () => CYBER_LOVE_PRODUCTS)
}

/** The hidden pieces. Only ever called from server code. */
export async function listBasementProducts(): Promise<Product[]> {
  if (!isDatabaseConfigured()) return BASEMENT_PRODUCTS
  return readOrSeed('listBasementProducts', async () => {
    const { data, error } = await serverClient()
      .from('products')
      .select(SELECT)
      .eq('is_basement', true)
      .eq('published_status', 'active')
      .order('id')
    if (error) throw new Error(error.message)
    return (data as unknown as ProductRow[]).map(rowToProduct)
  }, () => BASEMENT_PRODUCTS)
}

/** Every product regardless of status or Basement flag — back office only. */
export async function listAllProducts(): Promise<Product[]> {
  if (!isDatabaseConfigured()) return ALL_PRODUCTS
  return readOrSeed('listAllProducts', async () => {
    const { data, error } = await serverClient().from('products').select(SELECT).order('id')
    if (error) throw new Error(error.message)
    return (data as unknown as ProductRow[]).map(rowToProduct)
  }, () => ALL_PRODUCTS)
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (!isDatabaseConfigured()) return findSeedProductBySlug(slug) ?? null
  return readOrSeed(`getProductBySlug(${slug})`, async () => {
    const { data, error } = await serverClient()
      .from('products')
      .select(SELECT)
      .eq('slug', slug)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data ? rowToProduct(data as unknown as ProductRow) : null
  }, () => findSeedProductBySlug(slug) ?? null)
}

export async function getProductById(id: string): Promise<Product | null> {
  if (!isDatabaseConfigured()) return ALL_PRODUCTS.find((p) => p.id === id) ?? null
  return readOrSeed(`getProductById(${id})`, async () => {
    const { data, error } = await serverClient()
      .from('products')
      .select(SELECT)
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data ? rowToProduct(data as unknown as ProductRow) : null
  }, () => ALL_PRODUCTS.find((p) => p.id === id) ?? null)
}

/**
 * Resolve stored cart variant ids to authoritative products, variants and
 * prices. The browser sends ids and quantities only — never a price.
 */
export async function resolveVariants(
  ids: string[],
): Promise<{ product: Product; variantId: string }[]> {
  if (!ids.length) return []

  const source = isDatabaseConfigured() ? await listAllProducts() : ALL_PRODUCTS
  const wanted = new Set(ids)
  const out: { product: Product; variantId: string }[] = []
  for (const product of source) {
    for (const variant of product.variants) {
      if (wanted.has(variant.id)) out.push({ product, variantId: variant.id })
    }
  }
  return out
}

// ── Writes ──────────────────────────────────────────────────────────────────

/**
 * Create-or-replace. PUT semantics: the incoming product is the whole truth,
 * so its options/variants/media replace whatever was stored.
 *
 * Note: supabase-js has no multi-statement transaction, so this is a sequence
 * of statements rather than one atomic unit. A failure midway can leave a
 * product with stale children. Moving this into a Postgres function would make
 * it atomic — worth doing before the admin is used in anger.
 */
export async function upsertProduct(product: Product): Promise<Product> {
  const db = serverClient()

  const { error: pErr } = await db.from('products').upsert(productToRow(product))
  if (pErr) throw new Error(`upsertProduct(${product.id}): ${pErr.message}`)

  for (const table of ['product_options', 'product_variants', 'product_media'] as const) {
    const { error } = await db.from(table).delete().eq('product_id', product.id)
    if (error) throw new Error(`upsertProduct(${product.id}) clearing ${table}: ${error.message}`)
  }

  const inserts: [string, object[]][] = [
    ['product_options', optionRows(product)],
    ['product_variants', variantRows(product)],
    ['product_media', mediaRows(product)],
  ]
  for (const [table, rows] of inserts) {
    if (!rows.length) continue
    const { error } = await db.from(table).insert(rows)
    if (error) throw new Error(`upsertProduct(${product.id}) inserting ${table}: ${error.message}`)
  }

  return product
}

export async function deleteProduct(id: string): Promise<void> {
  // Children cascade via the foreign keys.
  const { error } = await serverClient().from('products').delete().eq('id', id)
  if (error) throw new Error(`deleteProduct(${id}): ${error.message}`)
}

export async function setPublishedStatus(
  id: string,
  publishedStatus: Product['publishedStatus'],
): Promise<Product | null> {
  const { error } = await serverClient()
    .from('products')
    .update({ published_status: publishedStatus })
    .eq('id', id)
  if (error) throw new Error(`setPublishedStatus(${id}): ${error.message}`)
  return getProductById(id)
}
