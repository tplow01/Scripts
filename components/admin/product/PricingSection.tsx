'use client'
import { Section, inputCls, labelCls, type SectionProps } from './ProductForm'
import type { ProductVariant } from '@/types/product'

const num = (s: string): number | null => {
  const n = Number(s)
  return s.trim() === '' || Number.isNaN(n) ? null : n
}

export default function PricingSection({ product, onChange }: SectionProps) {
  const first = product.variants[0]
  const setAll = (patch: Partial<ProductVariant>) =>
    onChange({ ...product, variants: product.variants.map((v) => ({ ...v, ...patch })) })

  const margin =
    first && first.cost != null && first.price > 0
      ? Math.round(((first.price - first.cost) / first.price) * 100)
      : null

  return (
    <Section title="Pricing">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className={labelCls} htmlFor="p-price">Price (USD)</label>
          <input id="p-price" inputMode="decimal" className={inputCls} value={first?.price ?? ''}
            onChange={(e) => setAll({ price: num(e.target.value) ?? 0 })} />
        </div>
        <div>
          <label className={labelCls} htmlFor="p-compare">Compare at</label>
          <input id="p-compare" inputMode="decimal" className={inputCls} value={first?.compareAtPrice ?? ''}
            onChange={(e) => setAll({ compareAtPrice: num(e.target.value) })} />
        </div>
        <div>
          <label className={labelCls} htmlFor="p-cost">Cost per item</label>
          <input id="p-cost" inputMode="decimal" className={inputCls} value={first?.cost ?? ''}
            onChange={(e) => setAll({ cost: num(e.target.value) })} />
        </div>
      </div>
      <p className="text-[12px] text-grey">
        ${(first?.price ?? 0).toFixed(2)}
        {margin != null && <> · {margin}% margin</>}
      </p>
      <p className="text-[11px] text-grey">Applies to every variant. Override individual rows in the variants table.</p>
    </Section>
  )
}
