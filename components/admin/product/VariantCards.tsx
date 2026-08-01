'use client'
import { LOW_STOCK_THRESHOLD } from '@/lib/admin/config'
import { variantTitle } from '@/lib/admin/variants'
import { inputCls, labelCls, type SectionProps } from './ProductForm'
import type { ProductVariant } from '@/types/product'

/** Phone view: one card per variant, tap-target-sized stock/price inputs. No selection or bulk edit. */
export default function VariantCards({ product, onChange }: SectionProps) {
  const patch = (id: string, p: Partial<ProductVariant>) =>
    onChange({ ...product, variants: product.variants.map((v) => (v.id === id ? { ...v, ...p } : v)) })

  return (
    <div className="space-y-3">
      <div className="text-[12px] text-grey">{product.variants.length} variants</div>
      {product.variants.map((v) => (
        <div key={v.id} className="rounded-lg border border-grey/25 p-3 space-y-2">
          <div className="text-[15px] font-bold" style={{ fontFamily: 'var(--font-bebas)' }}>
            {variantTitle(v.optionValues)}
          </div>
          <div className="text-[11px] font-mono text-grey">{v.sku}</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className={labelCls}>Stock</span>
              <input
                className={`${inputCls} min-h-[44px] ${v.stock === 0 ? 'text-pink-deep' : v.stock <= LOW_STOCK_THRESHOLD ? 'text-amber-400' : ''}`}
                inputMode="numeric" value={v.stock} aria-label={`Stock for ${variantTitle(v.optionValues)}`}
                onChange={(e) => patch(v.id, { stock: Math.max(0, Number(e.target.value) || 0) })} />
            </div>
            <div>
              <span className={labelCls}>Price</span>
              <input className={`${inputCls} min-h-[44px]`} inputMode="decimal" value={v.price}
                aria-label={`Price for ${variantTitle(v.optionValues)}`}
                onChange={(e) => patch(v.id, { price: Math.max(0, Number(e.target.value) || 0) })} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
