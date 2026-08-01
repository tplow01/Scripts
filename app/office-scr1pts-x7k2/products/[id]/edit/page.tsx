'use client'

import { use } from 'react'
import Link from 'next/link'
import ProductForm from '@/components/admin/product/ProductForm'
import { adminPath } from '@/lib/admin/config'
import { useAdmin } from '@/lib/admin/store'

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { state } = useAdmin()
  const product = state.products.find((p) => p.id === id)

  if (!product) {
    return (
      <div className="py-16 text-center">
        <p className="text-grey text-[13px] mb-4">That product no longer exists.</p>
        <Link href={adminPath('products')} className="text-pink text-[13px] underline">Back to products</Link>
      </div>
    )
  }
  return <ProductForm initial={product} mode="edit" />
}
