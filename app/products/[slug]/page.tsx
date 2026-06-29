import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { CYBER_LOVE_PRODUCTS, BASEMENT_PRODUCTS } from '@/lib/products'
import ProductDetail from './ProductDetail'

const ALL_PRODUCTS = [...CYBER_LOVE_PRODUCTS, ...BASEMENT_PRODUCTS]

interface Props {
  // Next 15: dynamic route params are async.
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return ALL_PRODUCTS.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = ALL_PRODUCTS.find((p) => p.slug === slug)
  if (!product) return {}
  return { title: `${product.name} — SCR!PTS` }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const product = ALL_PRODUCTS.find((p) => p.slug === slug)
  if (!product) notFound()
  const dark = BASEMENT_PRODUCTS.some((p) => p.slug === slug)
  return <ProductDetail product={product} dark={dark} />
}
