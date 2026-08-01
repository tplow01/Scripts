'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type React from 'react'
import { adminPath } from '@/lib/admin/config'
import { stableStringify } from '@/lib/admin/stableStringify'
import { useAdmin } from '@/lib/admin/store'
import { useIsPhone } from '@/lib/admin/useIsPhone'
import type { Product } from '@/types/product'
import InventorySection from './InventorySection'
import MediaSection from './MediaSection'
import OptionsEditor from './OptionsEditor'
import PricingSection from './PricingSection'
import SeoSection from './SeoSection'
import ShippingSection from './ShippingSection'
import SidebarSection from './SidebarSection'
import TitleSection from './TitleSection'
import VariantCards from './VariantCards'
import VariantTable from './VariantTable'

export interface SectionProps {
  product: Product
  onChange: (next: Product) => void
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-grey/25 bg-[#141414] p-5">
      <h2 className="text-[13px] uppercase tracking-[0.14em] text-grey mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

export const inputCls =
  'w-full rounded-lg border border-grey/30 bg-[#101010] px-3 py-2 text-[13px] text-paper placeholder:text-grey/60 focus:outline-none focus:border-pink'
export const labelCls = 'block text-[11px] uppercase tracking-[0.14em] text-grey mb-1.5'

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'product'

export default function ProductForm({ initial, mode }: { initial: Product; mode: 'create' | 'edit' }) {
  const { add, update } = useAdmin()
  const router = useRouter()
  const [product, setProduct] = useState<Product>(initial)
  const [errors, setErrors] = useState<{ name?: string }>({})
  const isPhone = useIsPhone()

  const dirty = useMemo(
    () => stableStringify(product) !== stableStringify(initial),
    [product, initial],
  )

  // Native "leave site?" guard for reload/close/back-nav while unsaved changes exist.
  // Client-side <Link> navigation is intentionally not intercepted here.
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

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
          <TitleSection product={product} onChange={onChange} />
          <MediaSection product={product} onChange={onChange} />
          <PricingSection product={product} onChange={onChange} />
          <InventorySection product={product} onChange={onChange} />
          <Section title="Variants">
            <OptionsEditor product={product} onChange={onChange} />
            {isPhone
              ? <VariantCards product={product} onChange={onChange} />
              : <VariantTable product={product} onChange={onChange} />}
          </Section>
          <ShippingSection product={product} onChange={onChange} />
          <SeoSection product={product} onChange={onChange} />
          {errors.name && <p className="text-[11px] text-pink-deep">{errors.name}</p>}
        </div>
        <div className="space-y-6">
          <SidebarSection product={product} onChange={onChange} />
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
