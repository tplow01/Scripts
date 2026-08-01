'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { adminPath } from '@/lib/admin/config'
import { useAdmin } from '@/lib/admin/store'
import type { Product } from '@/types/product'

export interface SectionProps {
  product: Product
  onChange: (next: Product) => void
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'product'

export default function ProductForm({ initial, mode }: { initial: Product; mode: 'create' | 'edit' }) {
  const { add, update } = useAdmin()
  const router = useRouter()
  const [product, setProduct] = useState<Product>(initial)
  const [errors, setErrors] = useState<{ name?: string }>({})

  const dirty = useMemo(() => JSON.stringify(product) !== JSON.stringify(initial), [product, initial])

  const onChange = useCallback((next: Product) => setProduct(next), [])

  const save = () => {
    if (!product.name.trim()) { setErrors({ name: 'Name is required' }); return }
    const built: Product = {
      ...product,
      name: product.name.trim(),
      slug: product.slug.trim() || slugify(product.emotion || product.name),
    }
    if (mode === 'create') add(built)
    else update(built)
    router.push(adminPath('products'))
  }

  const discard = () => {
    if (dirty && !window.confirm('Discard unsaved changes?')) return
    router.push(adminPath('products'))
  }

  return (
    <div className="pb-28">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[28px] uppercase tracking-[0.04em]" style={{ fontFamily: 'var(--font-bebas)' }}>
          {mode === 'create' ? 'New Product' : product.name || 'Edit Product'}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="space-y-6">
          {/* Sections 1-7 mount here in Tasks 10-11 */}
          {errors.name && <p className="text-[11px] text-pink-deep">{errors.name}</p>}
        </div>
        <div className="space-y-6">
          {/* SidebarSection mounts here in Task 10 */}
        </div>
      </div>

      {dirty && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-grey/25 bg-[#141414]/95 backdrop-blur px-5 py-3 flex items-center justify-end gap-3">
          <span className="mr-auto text-[12px] text-grey">Unsaved changes</span>
          <button type="button" onClick={discard} className="px-4 py-2 rounded-lg border border-grey/30 text-[13px] text-grey hover:text-paper">
            Discard
          </button>
          <button type="button" onClick={save} className="px-4 py-2 rounded-lg bg-pink text-[13px] font-bold text-black">
            Save
          </button>
        </div>
      )}
    </div>
  )
}
