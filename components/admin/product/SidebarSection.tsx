'use client'
import { useEffect, useState } from 'react'
import { Section, inputCls, labelCls, type SectionProps } from './ProductForm'
import { deriveAvailability } from '@/lib/admin/variants'
import { useAdmin } from '@/lib/admin/store'
import type { PublishedStatus } from '@/types/product'

const parseTags = (raw: string) => raw.split(',').map((t) => t.trim()).filter(Boolean)

const AVAILABILITY_LABEL: Record<ReturnType<typeof deriveAvailability>, string> = {
  available: 'Available',
  'pre-order': 'Pre-order',
  'sold-out': 'Sold out',
}

export default function SidebarSection({ product, onChange }: SectionProps) {
  const { state } = useAdmin()
  const collections = Array.from(new Set(state.products.map((p) => p.collection).filter(Boolean)))
  const availability = deriveAvailability(product)

  // Buffered so a comma-separated tag list can be typed freely (with
  // trailing spaces/commas mid-entry) while still committing every
  // keystroke to `product.tags` — no blur required to save on-close.
  const [tagsText, setTagsText] = useState(product.tags.join(', '))
  useEffect(() => {
    // Only resync from outside edits (discard/undo), not from our own commits.
    if (parseTags(tagsText).join(',') !== product.tags.join(',')) {
      setTagsText(product.tags.join(', '))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.tags])

  return (
    <Section title="Status">
      <div>
        <label className={labelCls} htmlFor="p-status">Status</label>
        <select id="p-status" className={inputCls} value={product.publishedStatus}
          onChange={(e) => onChange({ ...product, publishedStatus: e.target.value as PublishedStatus })}>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      <div>
        <span className={labelCls}>Availability</span>
        <span className="inline-block rounded-full border border-grey/30 px-2.5 py-1 text-[11px] uppercase tracking-[0.1em] text-grey">
          {AVAILABILITY_LABEL[availability]}
        </span>
      </div>
      <div>
        <label className={labelCls} htmlFor="p-collection">Collection</label>
        <input id="p-collection" list="collections-list" className={inputCls} value={product.collection}
          onChange={(e) => onChange({ ...product, collection: e.target.value })} />
        <datalist id="collections-list">
          {collections.map((c) => <option key={c} value={c} />)}
        </datalist>
      </div>
      <div>
        <label className={labelCls} htmlFor="p-type">Product type</label>
        <input id="p-type" className={inputCls} value={product.productType}
          onChange={(e) => onChange({ ...product, productType: e.target.value })} />
      </div>
      <div>
        <label className={labelCls} htmlFor="p-vendor">Vendor</label>
        <input id="p-vendor" className={inputCls} value={product.vendor}
          onChange={(e) => onChange({ ...product, vendor: e.target.value })} />
      </div>
      <div>
        <label className={labelCls} htmlFor="p-tags">Tags</label>
        <input id="p-tags" className={inputCls} value={tagsText}
          onChange={(e) => {
            setTagsText(e.target.value)
            onChange({ ...product, tags: parseTags(e.target.value) })
          }} placeholder="anxiety, drop-1" />
      </div>
      <div>
        <label className={labelCls} htmlFor="p-ship-date">Ship date</label>
        <input id="p-ship-date" type="date" className={inputCls} value={product.shipDate}
          onChange={(e) => onChange({ ...product, shipDate: e.target.value })} />
      </div>
    </Section>
  )
}
