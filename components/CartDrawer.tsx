'use client'

import Image from 'next/image'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useCart } from '@/lib/cart'

export default function CartDrawer() {
  const { items, remove, increment, decrement, total, count, isOpen, closeCart } = useCart()
  const reduced = useReducedMotion()
  const router = useRouter()

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={closeCart}
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            className="fixed top-0 right-0 h-full z-50 bg-white text-[#0d0d0d] flex flex-col w-full md:w-[min(520px,90vw)]"
            initial={reduced ? {} : { x: '100%' }}
            animate={{ x: 0 }}
            exit={reduced ? {} : { x: '100%' }}
            transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] }}
          >
            {/* Header */}
            <div className="px-5 md:px-[40px] pt-6 md:pt-[40px] pb-[24px]">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-[32px] font-extrabold uppercase leading-none tracking-[0.01em]">
                    Your Cart
                  </h2>
                  <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#888] mt-[8px]">
                    {count} {count === 1 ? 'item' : 'items'}
                  </p>
                </div>
                <button
                  onClick={closeCart}
                  className="hover:opacity-50 transition-opacity mt-[4px]"
                  aria-label="Close cart"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M6 6L18 18M6 18L18 6" stroke="#0d0d0d" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-5 md:px-[40px]">
              {items.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-[13px] font-bold uppercase tracking-[0.06em] text-[#aaa]">
                    Your bag is empty.
                  </p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <motion.div
                      key={`${item.product.id}-${item.size}`}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 24, transition: { duration: 0.2 } }}
                      transition={{ duration: 0.28, ease: 'easeOut' }}
                      className="flex gap-[20px] py-[24px]"
                    >
                      {/* Thumbnail */}
                      <div className="relative w-[88px] h-[88px] shrink-0 bg-[#f5f5f5] rounded overflow-hidden">
                        {item.product.image && (
                          <Image src={item.product.image} alt={item.product.name} fill className="object-contain" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-[12px]">
                          <p className="text-[12px] font-extrabold uppercase tracking-[0.04em] leading-snug">
                            {item.product.name}
                          </p>
                          <p className="text-[13px] font-bold shrink-0">${item.product.price}.00</p>
                        </div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#888] mt-[4px]">
                          {item.size}
                        </p>
                        {item.product.shipDate && (
                          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#6F6F73] mt-[4px]">
                            Ships: {item.product.shipDate}
                          </p>
                        )}

                        {/* Qty + trash */}
                        <div className="flex items-center gap-[4px] mt-[12px]">
                          <button
                            onClick={() => decrement(item.product.id, item.size)}
                            className="w-[28px] h-[28px] flex items-center justify-center border border-[#d0d0d0] rounded text-[14px] font-bold leading-none hover:border-[#0d0d0d] transition-colors"
                          >
                            −
                          </button>
                          <span className="w-[32px] text-center text-[13px] font-bold">{item.quantity}</span>
                          <button
                            onClick={() => increment(item.product.id, item.size)}
                            className="w-[28px] h-[28px] flex items-center justify-center border border-[#d0d0d0] rounded text-[14px] font-bold leading-none hover:border-[#0d0d0d] transition-colors"
                          >
                            +
                          </button>
                          <button
                            onClick={() => remove(item.product.id, item.size)}
                            className="ml-[8px] hover:opacity-50 transition-opacity"
                            aria-label="Remove item"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="#0d0d0d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="px-5 md:px-[40px] pb-6 md:pb-[40px] pt-[24px]">
                <div className="flex justify-between items-baseline mb-[8px]">
                  <span className="text-[18px] font-extrabold uppercase tracking-[0.02em]">Subtotal:</span>
                  <span className="text-[22px] font-extrabold">${total.toFixed(2)}</span>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#888] mb-[20px]">
                  Shipping and taxes calculated at checkout
                </p>
                <motion.button
                  whileTap={reduced ? {} : { scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => { closeCart(); router.push('/checkout') }}
                  className="w-full py-[16px] bg-[#0d0d0d] text-white text-[13px] font-extrabold tracking-[0.1em] uppercase rounded border border-[#0d0d0d] hover:bg-white hover:text-[#0d0d0d] transition-colors duration-200"
                >
                  Checkout
                </motion.button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
