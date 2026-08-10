'use client'
import { Section, inputCls, labelCls, type SectionProps } from './ProductForm'

export default function SeoSection({ product, onChange }: SectionProps) {
  return (
    <Section title="Search engine listing">
      <div>
        <label className={labelCls} htmlFor="p-slug">URL handle</label>
        <input id="p-slug" className={inputCls} value={product.slug}
          onChange={(e) => onChange({ ...product, slug: e.target.value })} placeholder="anxiety-tee" />
      </div>
      <div>
        <label className={labelCls} htmlFor="p-seo-title">SEO title</label>
        <input id="p-seo-title" className={inputCls} value={product.seo.title}
          onChange={(e) => onChange({ ...product, seo: { ...product.seo, title: e.target.value } })} />
      </div>
      <div>
        <label className={labelCls} htmlFor="p-seo-desc">SEO description</label>
        <textarea id="p-seo-desc" rows={3} className={inputCls} value={product.seo.description}
          onChange={(e) => onChange({ ...product, seo: { ...product.seo, description: e.target.value } })} />
      </div>
      <div className="rounded-lg border border-grey/25 bg-[#101010] p-3 space-y-1">
        <p className="text-[12px] text-emerald-400 truncate">scripts.store/products/{product.slug || 'product'}</p>
        <p className="text-[14px] text-sky-400 truncate">{product.seo.title || product.name || 'Untitled product'}</p>
        <p className="text-[12px] text-grey line-clamp-2">{product.seo.description || product.description}</p>
      </div>
    </Section>
  )
}
