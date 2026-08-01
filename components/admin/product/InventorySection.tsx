'use client'
import { Section, inputCls, labelCls, type SectionProps } from './ProductForm'
import { reconcileVariants } from '@/lib/admin/variants'
import type { ProductVariant } from '@/types/product'

export default function InventorySection({ product, onChange }: SectionProps) {
  const first = product.variants[0]
  const setAll = (patch: Partial<ProductVariant>) =>
    onChange({ ...product, variants: product.variants.map((v) => ({ ...v, ...patch })) })

  const regenerateSkus = () => {
    if (!window.confirm('Regenerate every SKU from the root? Hand-edited SKUs will be replaced.')) return
    const defaults = {
      price: first?.price ?? 0,
      compareAtPrice: first?.compareAtPrice ?? null,
      cost: first?.cost ?? null,
      barcode: first?.barcode ?? null,
      trackInventory: first?.trackInventory ?? true,
      allowBackorder: first?.allowBackorder ?? false,
      weightGrams: first?.weightGrams ?? null,
    }
    onChange({
      ...product,
      variants: reconcileVariants(product.id, product.skuRoot, product.options, [], defaults),
    })
  }

  return (
    <Section title="Inventory">
      <div>
        <label className={labelCls} htmlFor="p-sku-root">SKU root</label>
        <input id="p-sku-root" className={inputCls} value={product.skuRoot}
          onChange={(e) => onChange({ ...product, skuRoot: e.target.value })} placeholder="ANX" />
      </div>
      <label className="flex items-center gap-2 text-[13px] text-paper">
        <input type="checkbox" checked={first?.trackInventory ?? true}
          onChange={(e) => setAll({ trackInventory: e.target.checked })} />
        Track inventory
      </label>
      <label className="flex items-center gap-2 text-[13px] text-paper">
        <input type="checkbox" checked={first?.allowBackorder ?? false}
          onChange={(e) => setAll({ allowBackorder: e.target.checked })} />
        Allow backorders
      </label>
      <button type="button" onClick={regenerateSkus}
        className="px-3 py-2 rounded-lg border border-grey/30 text-[12px] text-grey hover:text-paper">
        Regenerate SKUs
      </button>
      <p className="text-[11px] text-grey">Applies to every variant. Override individual rows in the variants table.</p>
    </Section>
  )
}
