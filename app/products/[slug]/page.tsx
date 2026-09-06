import { redirect, notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { LEGACY_SLUG_REDIRECTS } from '@/lib/products'
import {
  getProductBySlug,
  listBasementProducts,
  listStorefrontProducts,
} from '@/lib/server/products.repo'
import ProductDetail from './ProductDetail'

interface Props {
  // Next 15: dynamic route params are async.
  params: Promise<{ slug: string }>
}

export const revalidate = 60

export async function generateStaticParams() {
  // Basement pieces are prerendered too — they must be reachable by direct
  // link from inside the game — but `generateMetadata` below keeps them out of
  // every index. Reachable is not the same as discoverable.
  const [storefront, basement] = await Promise.all([
    listStorefrontProducts(),
    listBasementProducts(),
  ])
  return [...storefront, ...basement].map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) return {}

  return {
    title: `${product.name} — SCR!PTS`,
    // The PRD makes this a hard requirement: Basement pieces may not be
    // searched, recommended, or listed anywhere. Driven by the `isBasement`
    // column rather than a collection name, so renaming a collection can never
    // quietly publish a hidden piece.
    ...(product.isBasement ? { robots: { index: false, follow: false } } : {}),
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) {
    const merged = LEGACY_SLUG_REDIRECTS[slug]
    if (merged) redirect(`/products/${merged}`)
    notFound()
  }
  return <ProductDetail product={product} dark={product.isBasement} />
}
