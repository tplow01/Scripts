'use client'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { LOW_STOCK_THRESHOLD } from '@/lib/admin/config'
import { variantTitle } from '@/lib/admin/variants'
import { inputCls, type SectionProps } from './ProductForm'
import type { ProductVariant } from '@/types/product'

export default function VariantTable({ product, onChange }: SectionProps) {
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const patch = (id: string, p: Partial<ProductVariant>) =>
    onChange({ ...product, variants: product.variants.map((v) => (v.id === id ? { ...v, ...p } : v)) })

  const bulk = (p: Partial<ProductVariant>) =>
    onChange({ ...product, variants: product.variants.map((v) => (selected.has(v.id) ? { ...v, ...p } : v)) })

  const groups = new Map<string, ProductVariant[]>()
  for (const v of product.variants) {
    const key = v.optionValues[0] ?? 'All'
    groups.set(key, [...(groups.get(key) ?? []), v])
  }

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  return (
    <div>
      <div className="flex items-center gap-3 mb-3 text-[12px] text-grey">
        <span>{product.variants.length} variants</span>
        {selected.size > 0 && (
          <>
            <span>· {selected.size} selected</span>
            <button type="button" className="text-pink hover:underline" onClick={() => {
              const v = window.prompt('Set stock for selected variants')
              if (v != null && !Number.isNaN(Number(v))) bulk({ stock: Math.max(0, Number(v)) })
            }}>Set stock</button>
            <button type="button" className="text-pink hover:underline" onClick={() => {
              const v = window.prompt('Set price for selected variants')
              if (v != null && !Number.isNaN(Number(v))) bulk({ price: Math.max(0, Number(v)) })
            }}>Set price</button>
          </>
        )}
      </div>

      <div className="rounded-lg border border-grey/25 overflow-hidden">
        {[...groups.entries()].map(([key, rows]) => {
          const shown = open[key] ?? true
          return (
            <div key={key} className="border-b border-grey/20 last:border-0">
              <button type="button" onClick={() => setOpen({ ...open, [key]: !shown })}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-white/[0.03]">
                {shown ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span className="font-bold">{key}</span>
                <span className="text-grey text-[12px]">({rows.length})</span>
                <span className="ml-auto text-grey text-[12px]">
                  {rows.reduce((n, v) => n + v.stock, 0)} in stock
                </span>
              </button>
              {shown && rows.map((v) => (
                <div key={v.id} className="grid grid-cols-[24px_1fr_140px_80px_90px] gap-2 items-center px-3 py-2 border-t border-grey/15">
                  <input type="checkbox" aria-label={`Select ${variantTitle(v.optionValues)}`}
                    checked={selected.has(v.id)} onChange={() => toggle(v.id)} />
                  <span className="text-[13px] truncate">{variantTitle(v.optionValues)}</span>
                  <input className={inputCls + ' py-1'} value={v.sku} aria-label={`SKU for ${variantTitle(v.optionValues)}`}
                    onChange={(e) => patch(v.id, { sku: e.target.value })} />
                  <input className={`${inputCls} py-1 ${v.stock === 0 ? 'text-pink-deep' : v.stock <= LOW_STOCK_THRESHOLD ? 'text-amber-400' : ''}`}
                    inputMode="numeric" value={v.stock} aria-label={`Stock for ${variantTitle(v.optionValues)}`}
                    onChange={(e) => patch(v.id, { stock: Math.max(0, Number(e.target.value) || 0) })} />
                  <input className={inputCls + ' py-1'} inputMode="decimal" value={v.price}
                    aria-label={`Price for ${variantTitle(v.optionValues)}`}
                    onChange={(e) => patch(v.id, { price: Math.max(0, Number(e.target.value) || 0) })} />
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
