'use client'

import { ImageOff, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import ProductDrawer from '@/components/admin/ProductDrawer'
import { useAdmin } from '@/lib/admin/store'
import type { Product } from '@/types/product'

export default function ProductsPage() {
  const { state, remove, toggleStatus } = useAdmin()
  const [drawer, setDrawer] = useState<{ open: boolean; product: Product | null }>({ open: false, product: null })
  const [confirmId, setConfirmId] = useState<string | null>(null)

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-[40px] leading-none uppercase tracking-[0.04em]" style={{ fontFamily: 'var(--font-bebas)' }}>
          Products
        </h1>
        <button
          type="button"
          onClick={() => setDrawer({ open: true, product: null })}
          className="flex items-center gap-2 rounded-lg bg-pink text-ink font-bold text-[13px] px-4 py-2.5 hover:bg-pink-deep transition-colors"
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      <div className="mt-6 rounded-xl border border-grey/25 bg-[#141414] overflow-x-auto">
        <table className="w-full text-left text-[13px] min-w-[640px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.14em] text-grey border-b border-grey/25">
              <th className="px-5 py-3 font-medium">Product</th>
              <th className="px-5 py-3 font-medium">Price</th>
              <th className="px-5 py-3 font-medium">Collection</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {state.products.map((p) => (
              <tr key={p.id} className="border-b border-grey/15 last:border-b-0">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-11 h-11 rounded-lg bg-[#101010] border border-grey/20 flex items-center justify-center overflow-hidden shrink-0">
                      {p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element -- object URLs need a plain img
                        <img src={p.image} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <ImageOff size={16} className="text-grey" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-paper/90 font-medium truncate">{p.name}</p>
                      <p className="text-grey text-[11px]">{p.emotion} · {p.colorway}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 text-paper/80">${p.price}</td>
                <td className="px-5 py-3 text-grey">{p.collection}</td>
                <td className="px-5 py-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={p.status === 'available'}
                    aria-label={`Status: ${p.status}. Toggle availability.`}
                    onClick={() => toggleStatus(p.id)}
                    className="flex items-center gap-2"
                  >
                    <span className={`w-9 h-5 rounded-full p-0.5 transition-colors ${p.status === 'available' ? 'bg-pink' : 'bg-grey/40'}`}>
                      <span className={`block w-4 h-4 rounded-full bg-ink transition-transform ${p.status === 'available' ? 'translate-x-4' : ''}`} />
                    </span>
                    <span className="text-[11px] uppercase tracking-[0.08em] text-grey">{p.status}</span>
                  </button>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {confirmId === p.id ? (
                      <>
                        <button type="button" onClick={() => { remove(p.id); setConfirmId(null) }} className="text-[11px] font-bold text-pink-deep px-2 py-1">
                          Confirm
                        </button>
                        <button type="button" onClick={() => setConfirmId(null)} className="text-[11px] text-grey px-2 py-1">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button type="button" aria-label={`Edit ${p.name}`} onClick={() => setDrawer({ open: true, product: p })} className="p-2 text-grey hover:text-paper">
                          <Pencil size={15} />
                        </button>
                        <button type="button" aria-label={`Delete ${p.name}`} onClick={() => setConfirmId(p.id)} className="p-2 text-grey hover:text-pink-deep">
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {drawer.open && (
        <ProductDrawer key={drawer.product?.id ?? 'new'} product={drawer.product} onClose={() => setDrawer({ open: false, product: null })} />
      )}
    </div>
  )
}
