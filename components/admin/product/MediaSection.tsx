'use client'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import ImageDrop from '../ImageDrop'
import { Section, inputCls, type SectionProps } from './ProductForm'
import type { ProductMedia } from '@/types/product'

const renumber = (media: ProductMedia[]) => media.map((m, i) => ({ ...m, position: i }))
const labelFor = (i: number) => (i === 0 ? 'Front' : i === 1 ? 'Back' : `Shot ${i + 1}`)

export default function MediaSection({ product, onChange }: SectionProps) {
  const set = (media: ProductMedia[]) => onChange({ ...product, media: renumber(media) })

  const move = (i: number, by: number) => {
    const next = [...product.media]
    const j = i + by
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    set(next)
  }

  const removeAt = (i: number) => {
    const gone = product.media[i]
    onChange({
      ...product,
      media: renumber(product.media.filter((_, idx) => idx !== i)),
      // Any variant pointing at the deleted image falls back to unset.
      variants: product.variants.map((v) => (v.imageId === gone.id ? { ...v, imageId: null } : v)),
    })
  }

  return (
    <Section title="Media">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {product.media.map((m, i) => (
          <div key={m.id} className="space-y-1.5">
            <ImageDrop label={labelFor(i)} value={m.url} compact
              onChange={(url) => (url ? set(product.media.map((x) => (x.id === m.id ? { ...x, url } : x))) : removeAt(i))} />
            <input className={inputCls} value={m.alt} placeholder="Alt text" aria-label={`Alt text for ${labelFor(i)}`}
              onChange={(e) => set(product.media.map((x) => (x.id === m.id ? { ...x, alt: e.target.value } : x)))} />
            <div className="flex gap-1">
              <button type="button" aria-label={`Move ${labelFor(i)} earlier`} onClick={() => move(i, -1)}
                className="p-1.5 text-grey hover:text-paper"><ArrowLeft size={14} /></button>
              <button type="button" aria-label={`Move ${labelFor(i)} later`} onClick={() => move(i, 1)}
                className="p-1.5 text-grey hover:text-paper"><ArrowRight size={14} /></button>
            </div>
          </div>
        ))}
        <ImageDrop label="Add" value={null} compact
          onChange={(url) => url && set([...product.media, {
            id: `${product.id}-m${Date.now()}`, url, alt: '', position: product.media.length,
          }])} />
      </div>
      <p className="text-[11px] text-grey">
        Images are session-only object URLs — they do not survive a reload. Positions 1 and 2 are the front and back shots the shop grid uses.
      </p>
    </Section>
  )
}
