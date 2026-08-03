'use client'

import { ImageOff, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import Card from '@/components/admin/Card'
import { adminPath, LOW_STOCK_THRESHOLD } from '@/lib/admin/config'
import { useAdmin } from '@/lib/admin/store'
import { totalStock, variantCount } from '@/lib/admin/variants'
import type { Product, PublishedStatus } from '@/types/product'

function Thumb({ product }: { product: Product }) {
  const url = product.media[0]?.url
  return (
    <span className="w-11 h-11 rounded-lg bg-[#101010] border border-grey/20 flex items-center justify-center overflow-hidden shrink-0">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- object URLs need a plain img
        <img src={url} alt="" className="w-full h-full object-contain" />
      ) : (
        <ImageOff size={16} className="text-grey" />
      )}
    </span>
  )
}

function stockTone(stock: number): string {
  if (stock === 0) return 'text-pink-deep'
  if (stock <= LOW_STOCK_THRESHOLD) return 'text-amber-400'
  return 'text-paper'
}

function InventoryCell({ product }: { product: Product }) {
  const stock = totalStock(product)
  const count = variantCount(product)
  const tone = stockTone(stock)
  return (
    <span className={`text-[12px] ${tone}`}>
      {stock} in stock<span className="text-grey"> across {count} variant{count === 1 ? '' : 's'}</span>
    </span>
  )
}

function StatusBadge({ status }: { status: PublishedStatus }) {
  const tone = status === 'active' ? 'text-pink bg-pink/10 border-pink/30' : 'text-grey bg-grey/10 border-grey/30'
  return (
    <span className={`inline-block text-[10px] uppercase tracking-[0.1em] px-2 py-1 rounded-full border ${tone}`}>
      {status}
    </span>
  )
}

function PublishedToggle({ product, onToggle }: { product: Product; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={product.publishedStatus === 'active'}
      aria-label={`Published status: ${product.publishedStatus}. Toggle draft/active.`}
      onClick={onToggle}
      className="flex items-center gap-2"
    >
      <span className={`w-9 h-5 rounded-full p-0.5 transition-colors ${product.publishedStatus === 'active' ? 'bg-pink' : 'bg-grey/40'}`}>
        <span className={`block w-4 h-4 rounded-full bg-ink transition-transform ${product.publishedStatus === 'active' ? 'translate-x-4' : ''}`} />
      </span>
      <span className="text-[11px] uppercase tracking-[0.08em] text-grey">{product.publishedStatus}</span>
    </button>
  )
}

function DeleteControl({ product, confirming, onConfirm, onCancel, onAskDelete }: {
  product: Product
  confirming: boolean
  onConfirm: () => void
  onCancel: () => void
  onAskDelete: () => void
}) {
  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <button type="button" onClick={onConfirm} className="text-[11px] font-bold text-pink-deep px-2 py-2">Confirm</button>
        <button type="button" onClick={onCancel} className="text-[11px] text-grey px-2 py-2">Cancel</button>
      </div>
    )
  }
  return (
    <button
      type="button"
      aria-label={`Delete ${product.name}`}
      onClick={onAskDelete}
      className="p-2 text-grey hover:text-pink-deep"
    >
      <Trash2 size={15} />
    </button>
  )
}

export default function ProductsPage() {
  const { state, remove, togglePublished } = useAdmin()
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | PublishedStatus>('all')
  const [collection, setCollection] = useState('all')
  const [productType, setProductType] = useState('all')
  const [tag, setTag] = useState('all')
  const [lowOnly, setLowOnly] = useState(false)

  const collections = useMemo(
    () => [...new Set(state.products.map((p) => p.collection))],
    [state.products],
  )
  const productTypes = useMemo(
    () => [...new Set(state.products.map((p) => p.productType))],
    [state.products],
  )
  const tags = useMemo(
    () => [...new Set(state.products.flatMap((p) => p.tags))],
    [state.products],
  )

  const visible = useMemo(() => state.products.filter((p) => {
    if (status !== 'all' && p.publishedStatus !== status) return false
    if (collection !== 'all' && p.collection !== collection) return false
    if (productType !== 'all' && p.productType !== productType) return false
    if (tag !== 'all' && !p.tags.includes(tag)) return false
    if (lowOnly && totalStock(p) > LOW_STOCK_THRESHOLD) return false
    const q = query.trim().toLowerCase()
    if (!q) return true
    return p.name.toLowerCase().includes(q)
      || p.tags.some((t) => t.toLowerCase().includes(q))
      || p.variants.some((v) => v.sku.toLowerCase().includes(q))
  }), [state.products, status, collection, productType, tag, lowOnly, query])

  const empty = state.products.length === 0
  const noMatches = !empty && visible.length === 0

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[32px] sm:text-[40px] leading-none uppercase tracking-[0.04em]" style={{ fontFamily: 'var(--font-bebas)' }}>
          Products
        </h1>
        <Link
          href={adminPath('products/new')}
          className="flex items-center gap-2 shrink-0 rounded-lg bg-pink text-ink font-bold text-[13px] px-4 py-2.5 hover:bg-pink-deep transition-colors"
        >
          <Plus size={16} /> <span className="hidden sm:inline">Add Product</span><span className="sm:hidden">Add</span>
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, tag or SKU…"
          className="min-w-[220px] flex-1 rounded-lg bg-[#101010] border border-grey/20 px-3 py-2 text-[13px] text-paper placeholder:text-grey focus:outline-none focus:border-pink/50"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value as 'all' | PublishedStatus)}
          className="rounded-lg bg-[#101010] border border-grey/20 px-3 py-2 text-[13px] text-paper">
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
        <select value={collection} onChange={(e) => setCollection(e.target.value)}
          className="rounded-lg bg-[#101010] border border-grey/20 px-3 py-2 text-[13px] text-paper">
          <option value="all">All collections</option>
          {collections.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={productType} onChange={(e) => setProductType(e.target.value)}
          className="rounded-lg bg-[#101010] border border-grey/20 px-3 py-2 text-[13px] text-paper">
          <option value="all">All types</option>
          {productTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={tag} onChange={(e) => setTag(e.target.value)}
          className="rounded-lg bg-[#101010] border border-grey/20 px-3 py-2 text-[13px] text-paper">
          <option value="all">All tags</option>
          {tags.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button
          type="button"
          onClick={() => setLowOnly((v) => !v)}
          aria-pressed={lowOnly}
          className={`rounded-lg border px-3 py-2 text-[13px] transition-colors ${lowOnly ? 'bg-amber-400/10 border-amber-400/50 text-amber-400' : 'bg-[#101010] border-grey/20 text-grey'}`}
        >
          Low stock
        </button>
      </div>

      <Card className="mt-4 !p-0 overflow-hidden">
        {/* Phone: stacked cards */}
        <div className="sm:hidden p-3 space-y-2">
          {empty && <p className="py-6 text-center text-[13px] text-grey">No products yet — add your first drop</p>}
          {noMatches && <p className="py-6 text-center text-[13px] text-grey">No products match your filters</p>}
          {visible.map((p) => {
            const stock = totalStock(p)
            const count = variantCount(p)
            const price = p.variants[0]?.price
            return (
              <div key={p.id} className="rounded-lg border border-grey/20 bg-[#101010] p-3.5">
                <Link href={adminPath(`products/${p.id}/edit`)} className="flex items-center gap-3">
                  <Thumb product={p} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-paper/90 font-medium truncate">{p.name}</p>
                    <p className={`text-[11px] truncate ${stockTone(stock)}`}>{stock} in stock · {count} variant{count === 1 ? '' : 's'}</p>
                    <p className="text-grey text-[11px] truncate">{p.collection}{price !== undefined ? ` · $${price}` : ''}</p>
                  </div>
                  <StatusBadge status={p.publishedStatus} />
                </Link>
                <div className="mt-2.5 flex items-center justify-between gap-3">
                  <PublishedToggle product={p} onToggle={() => togglePublished(p.id)} />
                  <DeleteControl
                    product={p}
                    confirming={confirmId === p.id}
                    onConfirm={() => { remove(p.id); setConfirmId(null) }}
                    onCancel={() => setConfirmId(null)}
                    onAskDelete={() => setConfirmId(p.id)}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Tablet and desktop: table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-[13px] min-w-[880px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-[0.14em] text-grey border-b border-grey/25">
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Inventory</th>
                <th className="px-5 py-3 font-medium">Collection</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Vendor</th>
                <th className="px-5 py-3 font-medium">Published</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {empty && (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-grey">No products yet — add your first drop</td></tr>
              )}
              {noMatches && (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-grey">No products match your filters</td></tr>
              )}
              {visible.map((p) => (
                <tr key={p.id} className="relative border-b border-grey/15 last:border-b-0 hover:bg-white/[0.02]">
                  <td className="p-0">
                    <Link
                      href={adminPath(`products/${p.id}/edit`)}
                      className="flex items-center gap-3 px-5 py-3 after:absolute after:inset-0"
                    >
                      <Thumb product={p} />
                      <div className="min-w-0 max-w-[220px]">
                        <p className="text-paper/90 font-medium truncate">{p.name}</p>
                        <p className="text-grey text-[11px] truncate">{p.emotion}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={p.publishedStatus} /></td>
                  <td className="px-5 py-3">
                    <InventoryCell product={p} />
                  </td>
                  <td className="px-5 py-3 text-grey max-w-[160px] truncate">
                    {p.collection}
                  </td>
                  <td className="px-5 py-3 text-grey max-w-[140px] truncate">
                    {p.productType}
                  </td>
                  <td className="px-5 py-3 text-grey max-w-[140px] truncate">
                    {p.vendor}
                  </td>
                  <td className="relative z-10 px-5 py-3"><PublishedToggle product={p} onToggle={() => togglePublished(p.id)} /></td>
                  <td className="relative z-10 px-5 py-3">
                    <div className="flex justify-end">
                      <DeleteControl
                        product={p}
                        confirming={confirmId === p.id}
                        onConfirm={() => { remove(p.id); setConfirmId(null) }}
                        onCancel={() => setConfirmId(null)}
                        onAskDelete={() => setConfirmId(p.id)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
