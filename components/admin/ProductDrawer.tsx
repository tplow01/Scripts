'use client'

import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NEW_PRODUCT_DEFAULTS, useAdmin } from '@/lib/admin/store'
import type { Product, ProductStatus } from '@/types/product'
import ImageDrop from './ImageDrop'

const ALL_SIZES = ['S', 'M', 'L', 'XL']

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'product'
}

const inputCls =
  'w-full rounded-lg border border-grey/30 bg-[#101010] px-3 py-2 text-[13px] text-paper placeholder:text-grey/60 focus:outline-none focus:border-pink'
const labelCls = 'block text-[11px] uppercase tracking-[0.14em] text-grey mb-1.5'

/** Slide-over Add/Edit form. product === null → create mode. */
export default function ProductDrawer({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const { state, add, update } = useAdmin()
  const collections = [...new Set(state.products.map((p) => p.collection))]

  const [name, setName] = useState(product?.name ?? '')
  const [emotion, setEmotion] = useState(product?.emotion ?? '')
  const [colorway, setColorway] = useState(product?.colorway ?? '')
  const [price, setPrice] = useState(product ? String(product.price) : '')
  const [collection, setCollection] = useState(product?.collection ?? collections[0] ?? '')
  const [newCollection, setNewCollection] = useState('')
  const [status, setStatus] = useState<ProductStatus>(product?.status ?? 'available')
  const [shipDate, setShipDate] = useState(product?.shipDate ?? '')
  const [sizes, setSizes] = useState<string[]>(product?.sizes ?? ['S', 'M', 'L', 'XL'])
  const [description, setDescription] = useState(product?.description ?? '')
  const [image, setImage] = useState<string | null>(product?.image ?? null)
  const [backImage, setBackImage] = useState<string | null>(product?.backImage ?? null)
  const [galleryImages, setGalleryImages] = useState<string[]>(product?.galleryImages ?? [])
  const [errors, setErrors] = useState<{ name?: string; price?: string }>({})

  // Escape closes the drawer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const toggleSize = (s: string) =>
    setSizes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const priceNum = Number(price)
    const errs: typeof errors = {}
    if (!name.trim()) errs.name = 'Name is required'
    if (!price.trim() || Number.isNaN(priceNum) || priceNum <= 0) errs.price = 'Enter a price above 0'
    setErrors(errs)
    if (Object.keys(errs).length) return

    const chosenCollection = collection === '__new__' ? newCollection.trim() || 'Uncategorized' : collection
    const built: Product = {
      ...NEW_PRODUCT_DEFAULTS,
      careInstructions: [...NEW_PRODUCT_DEFAULTS.careInstructions],
      ...(product ?? {}),
      id: product?.id ?? crypto.randomUUID(),
      slug: product?.slug ?? slugify(name),
      name: name.trim(),
      emotion: emotion.trim().toUpperCase(),
      colorway: colorway.trim(),
      price: priceNum,
      collection: chosenCollection,
      status,
      shipDate: shipDate.trim(),
      sizes,
      description: description.trim(),
      image,
      backImage,
      galleryImages,
    }
    if (product) update(built)
    else add(built)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-none sm:max-w-md bg-[#141414] border-l border-grey/25 overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-grey/25 sticky top-0 bg-[#141414]">
          <h2 className="text-[22px] uppercase tracking-[0.04em]" style={{ fontFamily: 'var(--font-bebas)' }}>
            {product ? 'Edit Product' : 'Add Product'}
          </h2>
          <button type="button" aria-label="Close" onClick={onClose} className="-mr-2 p-2.5 text-grey hover:text-paper"><X size={18} /></button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className={labelCls} htmlFor="p-name">Product Name</label>
            <input id="p-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder='"ANXIETY" — White' />
            {errors.name && <p className="mt-1 text-[11px] text-pink-deep">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="p-emotion">Emotion</label>
              <input id="p-emotion" className={inputCls} value={emotion} onChange={(e) => setEmotion(e.target.value)} placeholder="ANXIETY" />
            </div>
            <div>
              <label className={labelCls} htmlFor="p-colorway">Colorway</label>
              <input id="p-colorway" className={inputCls} value={colorway} onChange={(e) => setColorway(e.target.value)} placeholder="White" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="p-price">Price (USD)</label>
              <input id="p-price" className={inputCls} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="44" />
              {errors.price && <p className="mt-1 text-[11px] text-pink-deep">{errors.price}</p>}
            </div>
            <div>
              <label className={labelCls} htmlFor="p-status">Status</label>
              <select id="p-status" className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as ProductStatus)}>
                <option value="available">Available</option>
                <option value="pre-order">Pre-order</option>
                <option value="sold-out">Sold out</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="p-collection">Collection</label>
            <select id="p-collection" className={inputCls} value={collection} onChange={(e) => setCollection(e.target.value)}>
              {collections.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="__new__">New collection…</option>
            </select>
            {collection === '__new__' && (
              <input
                className={`${inputCls} mt-2`} value={newCollection}
                onChange={(e) => setNewCollection(e.target.value)} placeholder="New collection name"
              />
            )}
          </div>
          <div>
            <label className={labelCls} htmlFor="p-ship">Ship Date</label>
            <input id="p-ship" className={inputCls} value={shipDate} onChange={(e) => setShipDate(e.target.value)} placeholder="July 2026" />
          </div>
          <div>
            <span className={labelCls}>Sizes</span>
            <div className="flex gap-2">
              {ALL_SIZES.map((s) => (
                <button
                  key={s} type="button" onClick={() => toggleSize(s)}
                  className={`px-3 py-1.5 rounded-lg border text-[12px] font-semibold transition-colors ${
                    sizes.includes(s) ? 'border-pink text-pink bg-pink/10' : 'border-grey/30 text-grey hover:text-paper'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="p-desc">Description</label>
            <textarea id="p-desc" rows={4} className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ImageDrop label="Front Image" value={image} onChange={setImage} />
            <ImageDrop label="Back Image" value={backImage} onChange={setBackImage} />
          </div>
          <div>
            <span className={labelCls}>More images ({galleryImages.length}/6)</span>
            <div className="grid grid-cols-3 gap-2">
              {galleryImages.map((url, i) => (
                <ImageDrop
                  key={`${url}-${i}`}
                  compact
                  label={`Gallery image ${i + 1}`}
                  value={url}
                  onChange={(next) =>
                    setGalleryImages((prev) =>
                      next === null ? prev.filter((_, j) => j !== i) : prev.map((u, j) => (j === i ? next : u)))}
                />
              ))}
              {galleryImages.length < 6 && (
                <ImageDrop
                  compact
                  label="Add gallery image"
                  value={null}
                  onChange={(next) => { if (next) setGalleryImages((prev) => [...prev, next]) }}
                />
              )}
            </div>
          </div>
          <div className="pt-2 flex gap-3">
            <button type="submit" className="flex-1 rounded-lg bg-pink text-ink font-bold text-[13px] py-2.5 hover:bg-pink-deep transition-colors">
              {product ? 'Save Changes' : 'Add Product'}
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-grey/30 px-4 text-[13px] text-grey hover:text-paper">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
