'use client'
import { X } from 'lucide-react'
import { useState } from 'react'
import {
  MAX_OPTIONS, addOption, addOptionValue, impactOfRemoval,
  removeOption, removeOptionValue, renameOptionValue, type VariantDefaults,
} from '@/lib/admin/variants'
import { NEW_VARIANT_DEFAULTS } from '@/lib/admin/store'
import { inputCls, labelCls, type SectionProps } from './ProductForm'

/** New variants should inherit the product's own defaults (price, backorder, etc.), not the
 * generic new-product defaults — otherwise adding a size to a migrated pre-order product mints
 * a variant that silently reads as sold-out-and-not-backorderable next to its siblings. */
function defaultsFor(product: SectionProps['product']): VariantDefaults {
  const v = product.variants[0]
  if (!v) return NEW_VARIANT_DEFAULTS
  const { price, compareAtPrice, cost, barcode, trackInventory, allowBackorder, weightGrams } = v
  return { price, compareAtPrice, cost, barcode, trackInventory, allowBackorder, weightGrams }
}

export default function OptionsEditor({ product, onChange }: SectionProps) {
  const [drafts, setDrafts] = useState<Record<number, string>>({})
  const [editing, setEditing] = useState<{ axis: number; value: string } | null>(null)
  const D = defaultsFor(product)

  const confirmRemoveValue = (axis: number, value: string) => {
    const { variants, stock } = impactOfRemoval(product, axis, value)
    if (!window.confirm(`Remove "${value}"? This deletes ${variants} variant${variants === 1 ? '' : 's'} holding ${stock} in stock.`)) return
    onChange(removeOptionValue(product, axis, value, D))
  }

  return (
    <div className="space-y-3">
      {product.options.map((opt, axis) => (
        <div key={opt.name} className="rounded-lg border border-grey/25 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className={labelCls + ' mb-0'}>{opt.name}</span>
            <button type="button" className="text-[11px] text-grey hover:text-pink-deep"
              onClick={() => {
                const survivor = opt.values[0]
                const doomed = product.variants.filter((v) => v.optionValues[axis] !== survivor)
                const stock = doomed.reduce((n, v) => n + v.stock, 0)
                if (window.confirm(
                  `Remove the ${opt.name} axis? This deletes ${doomed.length} variant${doomed.length === 1 ? '' : 's'} holding ${stock} in stock. Only variants on "${survivor}" are kept.`,
                ))
                  onChange(removeOption(product, axis, D))
              }}>Remove axis</button>
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            {opt.values.map((v) =>
              editing?.axis === axis && editing.value === v ? (
                <input key={v} autoFocus defaultValue={v} className={inputCls + ' w-32'}
                  onBlur={(e) => {
                    const next = e.target.value.trim()
                    const collides = next !== v && opt.values.some(
                      (other) => other !== v && other.toLowerCase() === next.toLowerCase(),
                    )
                    if (collides) {
                      window.alert(`"${next}" already exists on ${opt.name}. Choose a different name.`)
                      return
                    }
                    onChange(renameOptionValue(product, axis, v, e.target.value, D))
                    setEditing(null)
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }} />
              ) : (
                <span key={v} className="inline-flex items-center gap-1 rounded-full border border-grey/30 px-3 py-1 text-[12px]">
                  <button type="button" onClick={() => setEditing({ axis, value: v })} className="hover:text-pink">{v}</button>
                  <button type="button" aria-label={`Remove ${v}`} onClick={() => confirmRemoveValue(axis, v)}
                    className="text-grey hover:text-pink-deep"><X size={12} /></button>
                </span>
              ))}
          </div>
          <input className={inputCls} placeholder={`Add a ${opt.name.toLowerCase()} value and press Enter`}
            value={drafts[axis] ?? ''}
            onChange={(e) => setDrafts({ ...drafts, [axis]: e.target.value })}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              onChange(addOptionValue(product, axis, drafts[axis] ?? '', D))
              setDrafts({ ...drafts, [axis]: '' })
            }} />
        </div>
      ))}

      {product.options.length < MAX_OPTIONS && (
        <button type="button" className="text-[12px] text-pink hover:underline"
          onClick={() => {
            const name = window.prompt('Option name (e.g. Colorway)')?.trim()
            if (name) onChange(addOption(product, name, ['Default'], D))
          }}>+ Add another option</button>
      )}
    </div>
  )
}
