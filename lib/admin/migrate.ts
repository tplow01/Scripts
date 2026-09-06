import type { Product, ProductMedia, ProductOption } from '@/types/product'
import { reconcileVariants, type VariantDefaults } from './variants'

/** The pre-variant Product shape, as it exists in v2 localStorage payloads. */
export interface LegacyProduct {
  id: string
  name: string
  emotion: string
  colorway: string
  price: number
  collection: string
  status: 'available' | 'pre-order' | 'sold-out'
  image: string | null
  backImage: string | null
  galleryImages?: string[]
  slug: string
  description: string
  shipDate: string
  sizes: string[]
  careInstructions: string[]
  fit: string
  fabric: string
  fabricWeight: string
  modelNote: string
}

/** A v3 product has an options array; a v2 one has a colorway string. */
export function isMigrated(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const p = value as Partial<Product>
  return Array.isArray(p.options) && Array.isArray(p.variants) && Array.isArray(p.media)
}

/** First 3 alphanumeric characters, uppercased — the sku segment for one field. */
const alpha3 = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase()

/**
 * The one place the legacy 'Basement' collection string is interpreted.
 * Used only when seeding/migrating; afterwards `isBasement` is the truth.
 */
export const isBasementCollection = (collection: string) =>
  collection.toLowerCase().startsWith('basement')

const collectionCode = (collection: string) =>
  isBasementCollection(collection) ? 'BSM' : 'SCR'

/** Deterministic seed stock so tests and reloads agree. */
const seedStock = (index: number) => Math.max(0, 12 - (index % 5) * 3)

export function migrateProducts(legacy: LegacyProduct[]): Product[] {
  // Partition into already-migrated and legacy subsets
  const migrated: Product[] = []
  const toMigrate: LegacyProduct[] = []
  for (const item of legacy) {
    if (isMigrated(item)) {
      migrated.push(item as unknown as Product)
    } else {
      toMigrate.push(item)
    }
  }

  // If nothing to migrate, return the already-migrated items unchanged
  if (toMigrate.length === 0) return migrated

  const groups = new Map<string, LegacyProduct[]>()
  for (const p of toMigrate) {
    const key = `${p.collection}|${p.emotion}|${p.colorway}`
    groups.set(key, [...(groups.get(key) ?? []), p])
  }

  const newProducts = [...groups.values()].map((group) => {
    const head = group[0]
    const sizes = [...new Set(group.flatMap((p) => p.sizes))]

    // This colourway's own front shot first, then its back and any gallery
    // extras. No cross-colourway media, so the PDP gallery needs no filtering.
    const media: ProductMedia[] = []
    const pushMedia = (url: string | null | undefined, alt: string) => {
      if (!url || media.some((m) => m.url === url)) return
      media.push({ id: `${head.id}-m${media.length}`, url, alt, position: media.length })
    }
    pushMedia(head.image, `${head.emotion} — ${head.colorway}`)
    for (const p of group) {
      pushMedia(p.backImage, `${head.emotion} — back`)
      for (const url of p.galleryImages ?? []) pushMedia(url, `${head.emotion} — detail`)
    }

    const options: ProductOption[] = [{ name: 'Size', values: sizes, position: 1 }]

    const defaults: VariantDefaults = {
      price: head.price,
      compareAtPrice: null,
      cost: null,
      barcode: null,
      trackInventory: true,
      allowBackorder: head.status === 'pre-order',
      weightGrams: null,
    }

    const shell: Product = {
      id: head.id,
      name: head.name,
      slug: head.slug,
      emotion: head.emotion,
      description: head.description,
      collection: head.collection,
      isBasement: isBasementCollection(head.collection),
      productType: 'Tee',
      vendor: 'SCR!PTS',
      tags: [],
      publishedStatus: 'active',
      skuRoot: `${collectionCode(head.collection)}-${alpha3(head.emotion)}-${alpha3(head.colorway)}`,
      shipDate: head.shipDate,
      requiresShipping: true,
      seo: { title: head.name, description: head.description.slice(0, 155) },
      options,
      variants: [],
      media,
      fit: head.fit,
      fabric: head.fabric,
      fabricWeight: head.fabricWeight,
      modelNote: head.modelNote,
      careInstructions: head.careInstructions,
    }

    const variants = reconcileVariants(shell.id, shell.skuRoot, options, [], defaults).map((v, i) => ({
      ...v,
      stock: seedStock(i),
      imageId: media[0]?.id ?? null,
    }))

    return { ...shell, variants }
  })

  // Return newly migrated products followed by already-migrated ones
  return [...newProducts, ...migrated]
}
