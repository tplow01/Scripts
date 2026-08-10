'use client'
import { Section, inputCls, labelCls, type SectionProps } from './ProductForm'
import type { ProductVariant } from '@/types/product'

export default function ShippingSection({ product, onChange }: SectionProps) {
  const first = product.variants[0]
  const setAll = (patch: Partial<ProductVariant>) =>
    onChange({ ...product, variants: product.variants.map((v) => ({ ...v, ...patch })) })

  return (
    <Section title="Shipping">
      <label className="flex items-center gap-2 text-[13px] text-paper">
        <input type="checkbox" checked={product.requiresShipping}
          onChange={(e) => onChange({ ...product, requiresShipping: e.target.checked })} />
        This product requires shipping
      </label>
      <div>
        <label className={labelCls} htmlFor="p-weight">Weight (grams)</label>
        <input id="p-weight" inputMode="numeric" className={inputCls} value={first?.weightGrams ?? ''}
          onChange={(e) => {
            const n = Number(e.target.value)
            setAll({ weightGrams: e.target.value.trim() === '' || Number.isNaN(n) ? null : n })
          }} />
      </div>
      <p className="text-[11px] text-grey">Applies to every variant. Override individual rows in the variants table.</p>
    </Section>
  )
}
