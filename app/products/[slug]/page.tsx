import { redirect, notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ALL_PRODUCTS, BASEMENT_PRODUCTS, LEGACY_SLUG_REDIRECTS, findProductBySlug } from '@/lib/products'
import ProductDetail from './ProductDetail'

interface Props {
  // Next 15: dynamic route params are async.
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return ALL_PRODUCTS.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = findProductBySlug(slug)
  if (!product) return {}
  return { title: `${product.name} — SCR!PTS` }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const product = findProductBySlug(slug)
  if (!product) {
    const merged = LEGACY_SLUG_REDIRECTS[slug]
    if (merged) redirect(`/products/${merged}`)
    notFound()
  }
  const dark = BASEMENT_PRODUCTS.some((p) => p.slug === slug)
  return <ProductDetail product={product} dark={dark} />
}
