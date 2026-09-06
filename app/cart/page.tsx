'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import NavBar from '@/components/NavBar'
import FooterLinks from '@/components/FooterLinks'
import { useCart } from '@/lib/cart'
import { useStripeCheckout } from '@/lib/checkout'
import { fadeUp, stagger } from '@/lib/motion'
import { variantTitle } from '@/lib/admin/variants'

export default function CartPage() {
  const { items, remove, increment, decrement, total } = useCart()
  const { start: startCheckout, busy: payBusy, error: payError } = useStripeCheckout()
  const reduced = useReducedMotion()

  const listVariants = reduced ? {} : stagger(0.06)
  const itemVariants = reduced ? {} : fadeUp

  return (
    <div className="min-h-screen bg-white text-[#0d0d0d] flex flex-col">
      <NavBar showBack />

      <main className="px-4 md:px-16 lg:px-[120px] pb-[120px] flex-1">

        {/* Heading */}
        <motion.div
          variants={reduced ? {} : fadeUp}
          initial="hidden"
          animate="show"
          className="mb-[48px]"
        >
          <h1 className="text-[52px] leading-none tracking-[0.06em] uppercase" style={{ fontFamily: 'var(--font-bebas)' }}>
            Your Bag
          </h1>
          {items.length > 0 && (
            <p className="text-[12px] font-bold tracking-[0.08em] uppercase text-[#6F6F73] mt-[8px]">
              {items.reduce((s, i) => s + i.quantity, 0)} item{items.reduce((s, i) => s + i.quantity, 0) !== 1 ? 's' : ''}
            </p>
          )}
        </motion.div>

        {items.length === 0 ? (
          <motion.div
            variants={reduced ? {} : fadeUp}
            initial="hidden"
            animate="show"
            className="flex flex-col items-start gap-[16px]"
          >
            <p className="text-[14px] font-bold uppercase tracking-[0.04em] text-[#6F6F73]">Your bag is empty.</p>
            <Link
              href="/inventory"
              className="text-[13px] font-bold tracking-[0.06em] uppercase underline underline-offset-4 hover:opacity-50 transition-opacity"
            >
              Continue Shopping
            </Link>
          </motion.div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-[40px] lg:gap-[80px] items-start">

            {/* Item list */}
            <motion.div
              className="flex-1 flex flex-col divide-y divide-[#e5e5e5]"
              variants={listVariants}
              initial="hidden"
              animate="show"
            >
              <AnimatePresence>
                {items.map((item) => {
                  const image =
                    item.product.media.find((m) => m.id === item.variant.imageId)?.url ??
                    item.product.media[0]?.url

                  return (
                    <motion.div
                      key={item.variant.id}
                      variants={itemVariants}
                      exit={{ opacity: 0, x: -16, transition: { duration: 0.25, ease: 'easeOut' } }}
                      className="flex gap-[24px] py-[24px]"
                    >
                      {/* Thumbnail */}
                      <Link href={`/products/${item.product.slug}`} className="shrink-0">
                        <div className="relative w-[100px] h-[100px] bg-[#f7f7f5] rounded overflow-hidden">
                          {image && (
                            <Image src={image} alt={item.product.name} fill className="object-contain" />
                          )}
                        </div>
                      </Link>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <Link href={`/products/${item.product.slug}`}>
                          <p className="text-[13px] font-bold uppercase tracking-[0.04em] leading-snug hover:opacity-60 transition-opacity">
                            {item.product.name}
                          </p>
                        </Link>
                        <p className="text-[12px] font-bold text-[#6F6F73] uppercase tracking-[0.04em] mt-[4px]">
                          {variantTitle(item.variant.optionValues)}
                        </p>
                        <p className="text-[13px] font-bold mt-[8px]">
                          ${item.variant.price}.00
                        </p>

                        {/* Qty controls */}
                        <div className="flex items-center gap-[12px] mt-[12px]">
                          <button
                            onClick={() => decrement(item.variant.id)}
                            className="w-[28px] h-[28px] flex items-center justify-center border border-[#0d0d0d] rounded text-[14px] font-bold hover:bg-[#0d0d0d] hover:text-white transition-colors duration-150"
                          >
                            −
                          </button>
                          <span className="text-[13px] font-bold w-[16px] text-center">{item.quantity}</span>
                          <button
                            onClick={() => increment(item.variant.id)}
                            className="w-[28px] h-[28px] flex items-center justify-center border border-[#0d0d0d] rounded text-[14px] font-bold hover:bg-[#0d0d0d] hover:text-white transition-colors duration-150"
                          >
                            +
                          </button>
                          <button
                            onClick={() => remove(item.variant.id)}
                            className="ml-[4px] text-[11px] font-bold uppercase tracking-[0.06em] text-[#aaa] hover:text-[#0d0d0d] transition-colors duration-150"
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      {/* Line total */}
                      <div className="shrink-0 text-right">
                        <p className="text-[13px] font-bold">${(item.variant.price * item.quantity).toFixed(2)}</p>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </motion.div>

            {/* Order summary */}
            <motion.div
              variants={reduced ? {} : fadeUp}
              initial="hidden"
              animate="show"
              className="w-full lg:w-[320px] shrink-0 border border-[#e5e5e5] rounded p-[32px]"
            >
              <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#6F6F73] mb-[20px]">Order Summary</p>

              <div className="flex justify-between mb-[12px]">
                <span className="text-[13px] font-bold">Subtotal</span>
                <span className="text-[13px] font-bold">${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-[24px]">
                <span className="text-[12px] text-[#6F6F73]">Shipping</span>
                <span className="text-[12px] text-[#6F6F73]">Calculated at checkout</span>
              </div>

              <div className="border-t border-[#e5e5e5] pt-[20px] mb-[24px] flex justify-between">
                <span className="text-[14px] font-extrabold uppercase tracking-[0.04em]">Total</span>
                <span className="text-[14px] font-extrabold">${total.toFixed(2)}</span>
              </div>

              <motion.button
                whileTap={reduced ? {} : { scale: 0.98 }}
                onClick={() => startCheckout(items)}
                disabled={payBusy}
                className="w-full py-[14px] bg-[#0d0d0d] text-white text-[13px] font-bold tracking-[0.06em] uppercase border border-[#0d0d0d] rounded hover:bg-white hover:text-[#0d0d0d] transition-colors duration-200 mb-[12px] disabled:opacity-60"
              >
                {payBusy ? 'Taking you to checkout…' : 'Checkout'}
              </motion.button>

              {payError && (
                <p role="alert" className="mb-[12px] text-[12px] font-bold tracking-[0.04em] text-[#c0392b] text-center">
                  {payError}
                </p>
              )}

              <Link
                href="/inventory"
                className="block text-center text-[12px] font-bold tracking-[0.06em] uppercase text-[#6F6F73] hover:text-[#0d0d0d] transition-colors duration-150"
              >
                Continue Shopping
              </Link>
            </motion.div>

          </div>
        )}
      </main>

      <footer>
        <FooterLinks />
      </footer>
    </div>
  )
}
