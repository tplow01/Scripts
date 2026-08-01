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

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'product'

const collectionCode = (collection: string) =>
  collection.toLowerCase().startsWith('basement') ? 'BSM' : 'SCR'

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
    const key = `${p.collection}|${p.emotion}`
    groups.set(key, [...(groups.get(key) ?? []), p])
  }

  const newProducts = [...groups.values()].map((group) => {
    const head = group[0]
    const colorways = [...new Set(group.map((p) => p.colorway))]
    const sizes = [...new Set(group.flatMap((p) => p.sizes))]

    // One front image per colorway, then every distinct back/gallery shot.
    const media: ProductMedia[] = []
    const mediaIdByColorway = new Map<string, string>()
    group.forEach((p) => {
      if (!p.image || mediaIdByColorway.has(p.colorway)) return
      const id = `${head.id}-m${media.length}`
      media.push({ id, url: p.image, alt: `${head.emotion} — ${p.colorway}`, position: media.length })
      mediaIdByColorway.set(p.colorway, id)
    })
    const extras = [...new Set(group.flatMap((p) => [p.backImage, ...(p.galleryImages ?? [])]))]
    for (const url of extras) {
      if (!url || media.some((m) => m.url === url)) continue
      media.push({ id: `${head.id}-m${media.length}`, url, alt: `${head.emotion} — back`, position: media.length })
    }

    const options: ProductOption[] = [
      { name: 'Size', values: sizes, position: 1 },
      { name: 'Colorway', values: colorways, position: 2 },
    ]

    const defaults: VariantDefaults = {
      price: head.price,
      compareAtPrice: null,
      cost: null,
      barcode: null,
      trackInventory: true,
      allowBackorder: head.status === 'pre-order',
      weightGrams: null,
    }

    const name = `"${head.emotion}"`
    const shell: Product = {
      id: head.id,
      name,
      slug: slugify(head.emotion),
      emotion: head.emotion,
      description: head.description,
      collection: head.collection,
      productType: 'Tee',
      vendor: 'SCR!PTS',
      tags: [],
      publishedStatus: 'active',
      skuRoot: `${collectionCode(head.collection)}-${head.emotion.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase()}`,
      shipDate: head.shipDate,
      requiresShipping: true,
      seo: { title: name, description: head.description.slice(0, 155) },
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
      imageId: mediaIdByColorway.get(v.optionValues[1]) ?? media[0]?.id ?? null,
    }))

    return { ...shell, variants }
  })

  // Return newly migrated products followed by already-migrated ones
  return [...newProducts, ...migrated]
}
