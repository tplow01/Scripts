import type {
  Product,
  ProductMedia,
  ProductOption,
  ProductVariant,
  PublishedStatus,
} from '@/types/product'

/**
 * Pure translation between Postgres rows (snake_case) and the app's `Product`
 * (camelCase). Deliberately free of `server-only` and of any client import so
 * it can be unit-tested on its own — this is where field drift would bite.
 */

export interface OptionRow {
  name: string
  values: string[] | null
  position: number
}

export interface VariantRow {
  id: string
  product_id: string
  option_values: string[] | null
  sku: string
  barcode: string | null
  price: number | string
  compare_at_price: number | string | null
  cost: number | string | null
  stock: number
  track_inventory: boolean
  allow_backorder: boolean
  weight_grams: number | null
  image_id: string | null
  position: number
}

export interface MediaRow {
  id: string
  url: string
  alt: string
  position: number
}

export interface ProductRow {
  id: string
  name: string
  slug: string
  emotion: string
  description: string
  collection: string
  is_basement: boolean
  product_type: string
  vendor: string
  tags: string[] | null
  published_status: PublishedStatus
  sku_root: string
  ship_date: string
  requires_shipping: boolean
  seo_title: string
  seo_description: string
  fit: string
  fabric: string
  fabric_weight: string
  model_note: string
  care_instructions: string[] | null
  product_options?: OptionRow[] | null
  product_variants?: VariantRow[] | null
  product_media?: MediaRow[] | null
}

/**
 * Postgres `numeric` survives JSON as a string in some drivers and a number in
 * others. Coerce once here so prices are never accidentally concatenated.
 */
const num = (v: number | string): number => (typeof v === 'number' ? v : Number(v))
const numOrNull = (v: number | string | null): number | null =>
  v === null || v === '' ? null : num(v)

const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position

export function rowToProduct(row: ProductRow): Product {
  const options: ProductOption[] = (row.product_options ?? [])
    .slice()
    .sort(byPosition)
    .map((o) => ({ name: o.name, values: o.values ?? [], position: o.position }))

  const variants: ProductVariant[] = (row.product_variants ?? [])
    .slice()
    .sort(byPosition)
    .map((v) => ({
      id: v.id,
      productId: v.product_id,
      optionValues: v.option_values ?? [],
      sku: v.sku,
      barcode: v.barcode,
      price: num(v.price),
      compareAtPrice: numOrNull(v.compare_at_price),
      cost: numOrNull(v.cost),
      stock: v.stock,
      trackInventory: v.track_inventory,
      allowBackorder: v.allow_backorder,
      weightGrams: v.weight_grams,
      imageId: v.image_id,
      position: v.position,
    }))

  const media: ProductMedia[] = (row.product_media ?? [])
    .slice()
    .sort(byPosition)
    .map((m) => ({ id: m.id, url: m.url, alt: m.alt, position: m.position }))

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    emotion: row.emotion,
    description: row.description,
    collection: row.collection,
    isBasement: row.is_basement,
    productType: row.product_type,
    vendor: row.vendor,
    tags: row.tags ?? [],
    publishedStatus: row.published_status,
    skuRoot: row.sku_root,
    shipDate: row.ship_date,
    requiresShipping: row.requires_shipping,
    seo: { title: row.seo_title, description: row.seo_description },
    options,
    variants,
    media,
    fit: row.fit,
    fabric: row.fabric,
    fabricWeight: row.fabric_weight,
    modelNote: row.model_note,
    careInstructions: row.care_instructions ?? [],
  }
}

/** The `products` row only — children are written to their own tables. */
export function productToRow(p: Product): Omit<ProductRow, 'product_options' | 'product_variants' | 'product_media'> {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    emotion: p.emotion,
    description: p.description,
    collection: p.collection,
    is_basement: p.isBasement,
    product_type: p.productType,
    vendor: p.vendor,
    tags: p.tags,
    published_status: p.publishedStatus,
    sku_root: p.skuRoot,
    ship_date: p.shipDate,
    requires_shipping: p.requiresShipping,
    seo_title: p.seo.title,
    seo_description: p.seo.description,
    fit: p.fit,
    fabric: p.fabric,
    fabric_weight: p.fabricWeight,
    model_note: p.modelNote,
    care_instructions: p.careInstructions,
  }
}

export function optionRows(p: Product) {
  return p.options.map((o) => ({
    product_id: p.id,
    name: o.name,
    values: o.values,
    position: o.position,
  }))
}

export function variantRows(p: Product) {
  return p.variants.map((v) => ({
    id: v.id,
    product_id: p.id,
    option_values: v.optionValues,
    sku: v.sku,
    barcode: v.barcode,
    price: v.price,
    compare_at_price: v.compareAtPrice,
    cost: v.cost,
    stock: v.stock,
    track_inventory: v.trackInventory,
    allow_backorder: v.allowBackorder,
    weight_grams: v.weightGrams,
    image_id: v.imageId,
    position: v.position,
  }))
}

export function mediaRows(p: Product) {
  return p.media.map((m) => ({
    id: m.id,
    product_id: p.id,
    url: m.url,
    alt: m.alt,
    position: m.position,
  }))
}
