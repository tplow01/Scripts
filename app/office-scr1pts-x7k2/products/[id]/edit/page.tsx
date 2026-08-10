'use client'

import { use } from 'react'
import Link from 'next/link'
import ProductForm from '@/components/admin/product/ProductForm'
import { adminPath } from '@/lib/admin/config'
import { useAdmin } from '@/lib/admin/store'

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { state, hydrated } = useAdmin()
  const product = state.products.find((p) => p.id === id)

  // ProductForm captures `initial` once into useState — mounting it before localStorage
  // rehydration lands would lock the form onto seed data and a Save would clobber persisted
  // inventory. Wait for rehydration to finish before the form ever mounts.
  if (!hydrated) {
    return (
      <div className="rounded-xl border border-grey/25 bg-[#141414] p-5">
        <p className="text-[11px] uppercase tracking-[0.14em] text-grey">Loading product…</p>
      </div>
    )
  }

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
