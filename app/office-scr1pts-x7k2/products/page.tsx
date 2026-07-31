'use client'

import { ImageOff, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import Card from '@/components/admin/Card'
import ProductDrawer from '@/components/admin/ProductDrawer'
import { useAdmin } from '@/lib/admin/store'
import type { Product } from '@/types/product'

function Thumb({ product }: { product: Product }) {
  return (
    <span className="w-11 h-11 rounded-lg bg-[#101010] border border-grey/20 flex items-center justify-center overflow-hidden shrink-0">
      {product.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- object URLs need a plain img
        <img src={product.image} alt="" className="w-full h-full object-contain" />
      ) : (
        <ImageOff size={16} className="text-grey" />
      )}
    </span>
  )
}

function StatusToggle({ product, onToggle }: { product: Product; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={product.status === 'available'}
      aria-label={`Status: ${product.status}. Toggle availability.`}
      onClick={onToggle}
      className="flex items-center gap-2"
    >
      <span className={`w-9 h-5 rounded-full p-0.5 transition-colors ${product.status === 'available' ? 'bg-pink' : 'bg-grey/40'}`}>
        <span className={`block w-4 h-4 rounded-full bg-ink transition-transform ${product.status === 'available' ? 'translate-x-4' : ''}`} />
      </span>
      <span className="text-[11px] uppercase tracking-[0.08em] text-grey">{product.status}</span>
    </button>
  )
}

function RowActions({ product, confirming, onConfirm, onCancel, onAskDelete, onEdit }: {
  product: Product
  confirming: boolean
  onConfirm: () => void
  onCancel: () => void
  onAskDelete: () => void
  onEdit: () => void
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
    <div className="flex items-center gap-1">
      <button type="button" aria-label={`Edit ${product.name}`} onClick={onEdit} className="p-2 text-grey hover:text-paper">
        <Pencil size={15} />
      </button>
      <button type="button" aria-label={`Delete ${product.name}`} onClick={onAskDelete} className="p-2 text-grey hover:text-pink-deep">
        <Trash2 size={15} />
      </button>
    </div>
  )
}

export default function ProductsPage() {
  const { state, remove, toggleStatus } = useAdmin()
  const [drawer, setDrawer] = useState<{ open: boolean; product: Product | null }>({ open: false, product: null })
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const empty = state.products.length === 0

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[32px] sm:text-[40px] leading-none uppercase tracking-[0.04em]" style={{ fontFamily: 'var(--font-bebas)' }}>
          Products
        </h1>
        <button
          type="button"
          onClick={() => setDrawer({ open: true, product: null })}
          className="flex items-center gap-2 shrink-0 rounded-lg bg-pink text-ink font-bold text-[13px] px-4 py-2.5 hover:bg-pink-deep transition-colors"
        >
          <Plus size={16} /> <span className="hidden sm:inline">Add Product</span><span className="sm:hidden">Add</span>
        </button>
      </div>

      <Card className="mt-6 !p-0 overflow-hidden">
        {/* Phone: stacked cards */}
        <div className="sm:hidden p-3 space-y-2">
          {empty && <p className="py-6 text-center text-[13px] text-grey">No products yet — add your first drop</p>}
          {state.products.map((p) => (
            <div key={p.id} className="rounded-lg border border-grey/20 bg-[#101010] p-3.5">
              <div className="flex items-center gap-3">
                <Thumb product={p} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-paper/90 font-medium truncate">{p.name}</p>
                  <p className="text-grey text-[11px] truncate">{p.emotion} · {p.colorway}</p>
                </div>
                <span className="text-[13px] text-paper/80 tabular-nums shrink-0">${p.price}</span>
              </div>
              <p className="mt-2 text-[11px] text-grey truncate">{p.collection}</p>
              <div className="mt-2.5 flex items-center justify-between gap-3">
                <StatusToggle product={p} onToggle={() => toggleStatus(p.id)} />
                <RowActions
                  product={p}
                  confirming={confirmId === p.id}
                  onConfirm={() => { remove(p.id); setConfirmId(null) }}
                  onCancel={() => setConfirmId(null)}
                  onAskDelete={() => setConfirmId(p.id)}
                  onEdit={() => setDrawer({ open: true, product: p })}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Tablet and desktop: table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-[13px] min-w-[640px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-[0.14em] text-grey border-b border-grey/25">
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 font-medium text-right">Price</th>
                <th className="px-5 py-3 font-medium">Collection</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {empty && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-grey">No products yet — add your first drop</td></tr>
              )}
              {state.products.map((p) => (
                <tr key={p.id} className="border-b border-grey/15 last:border-b-0">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Thumb product={p} />
                      <div className="min-w-0 max-w-[220px]">
                        <p className="text-paper/90 font-medium truncate">{p.name}</p>
                        <p className="text-grey text-[11px] truncate">{p.emotion} · {p.colorway}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-paper/80 text-right tabular-nums whitespace-nowrap">${p.price}</td>
                  <td className="px-5 py-3 text-grey max-w-[180px] truncate">{p.collection}</td>
                  <td className="px-5 py-3"><StatusToggle product={p} onToggle={() => toggleStatus(p.id)} /></td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end">
                      <RowActions
                        product={p}
                        confirming={confirmId === p.id}
                        onConfirm={() => { remove(p.id); setConfirmId(null) }}
                        onCancel={() => setConfirmId(null)}
                        onAskDelete={() => setConfirmId(p.id)}
                        onEdit={() => setDrawer({ open: true, product: p })}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {drawer.open && (
        <ProductDrawer key={drawer.product?.id ?? 'new'} product={drawer.product} onClose={() => setDrawer({ open: false, product: null })} />
      )}
    </div>
  )
}
