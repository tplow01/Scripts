/**
 * Seed the database from the catalog that currently ships in the bundle.
 *
 *   npm run seed
 *
 * Idempotent: every write is an upsert keyed on id, so running it twice is
 * harmless. It is the bridge from "products are a TypeScript file" to
 * "products are rows", and it deliberately reuses `migrateProducts()` so the
 * seeded catalog is identical to what the storefront serves today.
 *
 * Note this does NOT import lib/server/products.repo — that module is marked
 * `server-only` and would refuse to load outside Next. The pure mapping in
 * lib/server/mapping.ts is shared instead, which is why it was kept separate.
 */

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

import { BASEMENT_PRODUCTS, CYBER_LOVE_PRODUCTS } from '@/lib/products'
import { mediaRows, optionRows, productToRow, variantRows } from '@/lib/server/mapping'

/** Minimal .env.local reader — avoids a dependency for a one-off script. */
function loadEnv(file = '.env.local'): void {
  let raw: string
  try {
    raw = readFileSync(file, 'utf8')
  } catch {
    return
  }
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = value
  }
}

async function main() {
  loadEnv()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Copy .env.example to .env.local and fill them in first.',
    )
    process.exit(1)
  }

  const db = createClient(url, key, { auth: { persistSession: false } })
  const products = [...CYBER_LOVE_PRODUCTS, ...BASEMENT_PRODUCTS]

  console.log(`Seeding ${products.length} products…`)

  for (const product of products) {
    const { error } = await db.from('products').upsert(productToRow(product))
    if (error) throw new Error(`products/${product.id}: ${error.message}`)

    for (const table of ['product_options', 'product_variants', 'product_media'] as const) {
      const { error: delErr } = await db.from(table).delete().eq('product_id', product.id)
      if (delErr) throw new Error(`${table}/${product.id}: ${delErr.message}`)
    }

    const children: [string, object[]][] = [
      ['product_options', optionRows(product)],
      ['product_variants', variantRows(product)],
      ['product_media', mediaRows(product)],
    ]
    for (const [table, rows] of children) {
      if (!rows.length) continue
      const { error: insErr } = await db.from(table).insert(rows)
      if (insErr) throw new Error(`${table}/${product.id}: ${insErr.message}`)
    }

    const where = product.isBasement ? 'basement' : 'storefront'
    console.log(`  ✓ ${product.slug.padEnd(20)} ${String(product.variants.length).padStart(2)} variants  (${where})`)
  }

  // Optional: create the single back-office account.
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (email && password) {
    const { error } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (error && !/already been registered/i.test(error.message)) {
      throw new Error(`admin user: ${error.message}`)
    }
    console.log(`\nAdmin account ready: ${email}`)
  } else {
    console.log('\nNo ADMIN_EMAIL/ADMIN_PASSWORD set — create the back-office user in Supabase.')
  }

  const storefront = products.filter((p) => !p.isBasement).length
  console.log(`\nDone. ${storefront} storefront, ${products.length - storefront} basement.`)
}

main().catch((err) => {
  console.error('\nSeed failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
