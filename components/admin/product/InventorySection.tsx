'use client'
import { Section, inputCls, labelCls, type SectionProps } from './ProductForm'
import { generateSku } from '@/lib/admin/variants'
import type { ProductVariant } from '@/types/product'

export default function InventorySection({ product, onChange }: SectionProps) {
  const first = product.variants[0]
  const setAll = (patch: Partial<ProductVariant>) =>
    onChange({ ...product, variants: product.variants.map((v) => ({ ...v, ...patch })) })

  const regenerateSkus = () => {
    if (!window.confirm('Regenerate every SKU from the root? Hand-edited SKUs will be replaced. Stock and prices are not affected.')) return
    // SKU-only rebuild — the option grid is not changing, so this is not a
    // reconciliation. Walk variants in position order and mint a fresh sku
    // for each, with a `taken` set that starts empty and accumulates as we
    // go so the regenerated set is internally unique. Every other field on
    // the variant (stock, price, cost, barcode, imageId, position, ...)
    // must survive untouched.
    const taken = new Set<string>()
    const variants = [...product.variants]
      .sort((a, b) => a.position - b.position)
      .map((v) => {
        const sku = generateSku(product.skuRoot, v.optionValues, taken)
        taken.add(sku)
        return { ...v, sku }
      })
    onChange({ ...product, variants })
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
