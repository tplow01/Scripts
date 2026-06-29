import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { CYBER_LOVE_PRODUCTS, BASEMENT_PRODUCTS } from '@/lib/products'
import ProductDetail from './ProductDetail'

const ALL_PRODUCTS = [...CYBER_LOVE_PRODUCTS, ...BASEMENT_PRODUCTS]

interface Props {
  params: { slug: string }
}

export async function generateStaticParams() {
  return ALL_PRODUCTS.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = ALL_PRODUCTS.find((p) => p.slug === params.slug)
  if (!product) return {}
  return { title: `${product.name} — SCR!PTS` }
}

export default function ProductPage({ params }: Props) {
  const product = ALL_PRODUCTS.find((p) => p.slug === params.slug)
  if (!product) notFound()
  const dark = BASEMENT_PRODUCTS.some((p) => p.slug === params.slug)
  return <ProductDetail product={product} dark={dark} />
}
