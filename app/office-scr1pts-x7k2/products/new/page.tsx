'use client'

import { useMemo } from 'react'
import ProductForm from '@/components/admin/product/ProductForm'
import { blankProduct } from '@/lib/admin/store'

export default function NewProductPage() {
  const initial = useMemo(() => blankProduct(crypto.randomUUID()), [])
  return <ProductForm initial={initial} mode="create" />
}
