'use client'
import { Section, inputCls, labelCls, type SectionProps } from './ProductForm'

export default function TitleSection({ product, onChange }: SectionProps) {
  return (
    <Section title="Title & description">
      <div>
        <label className={labelCls} htmlFor="p-name">Product name</label>
        <input id="p-name" className={inputCls} value={product.name}
          onChange={(e) => onChange({ ...product, name: e.target.value })} placeholder='"ANXIETY"' />
      </div>
      <div>
        <label className={labelCls} htmlFor="p-emotion">Emotion</label>
        <input id="p-emotion" className={inputCls} value={product.emotion}
          onChange={(e) => onChange({ ...product, emotion: e.target.value.toUpperCase() })} placeholder="ANXIETY" />
      </div>
      <div>
        <label className={labelCls} htmlFor="p-desc">Description</label>
        <textarea id="p-desc" rows={5} className={inputCls} value={product.description}
          onChange={(e) => onChange({ ...product, description: e.target.value })} />
      </div>
    </Section>
  )
}
