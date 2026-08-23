'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import NavBar from '@/components/NavBar'
import BasementNavBar from '@/components/BasementNavBar'
import FooterLinks from '@/components/FooterLinks'
import BasementFooter from '@/components/BasementFooter'
import PageEdgeArt from '@/components/PageEdgeArt'
import type { Product, ProductVariant } from '@/types/product'
import { fadeIn, stagger } from '@/lib/motion'
import { useCart } from '@/lib/cart'
import { useToast } from '@/lib/toast'
import { variantTitle, deriveAvailability } from '@/lib/admin/variants'
import { LOW_STOCK_THRESHOLD } from '@/lib/admin/config'
import { colorwayLabel } from '@/lib/products'

const STATUS_LABEL: Record<string, string> = {
  'pre-order': 'PRE-ORDER',
  'sold-out': 'SOLD OUT',
}

export default function ProductDetail({ product, dark = false }: { product: Product; dark?: boolean }) {
  const sizeAxis = product.options.findIndex((o) => o.name === 'Size')

  const [size, setSize] = useState<string | null>(null)
  const [activeImage, setActiveImage] = useState(0)
  const [added, setAdded] = useState(false)
  const reduced = useReducedMotion()
  const { add, openCart } = useCart()
  const { notify } = useToast()
  const availability = deriveAvailability(product)
  const isSoldOut = availability === 'sold-out'

  const variantFor = (s: string) =>
    product.variants.find((v) => sizeAxis < 0 || v.optionValues[sizeAxis] === s)

  const selected = size ? variantFor(size) : undefined
  const sellable = (v: ProductVariant | undefined) =>
    !!v && (!v.trackInventory || v.stock > 0 || v.allowBackorder)

  // One colourway per product, so the gallery is simply this product's media
  // in position order — no filtering needed.
  const images = product.media.map((m) => m.url)

  const heroUrl =
    product.media.find((m) => m.id === variantFor(size ?? product.options[sizeAxis]?.values[0] ?? '')?.imageId)?.url
    ?? images[0]
    ?? null

  useEffect(() => {
    const idx = heroUrl ? images.indexOf(heroUrl) : -1
    setActiveImage(idx >= 0 ? idx : 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroUrl])

  function handleAddToBag() {
    if (!selected || !sellable(selected)) return
    try {
      add(product, selected)
      setAdded(true)
      notify(`${product.emotion} (${variantTitle(selected.optionValues)}) added to bag`, 'success')
      setTimeout(() => {
        setAdded(false)
        openCart()
      }, 800)
    } catch {
      notify('Could not add to bag — try again', 'error')
    }
  }

  const panelStagger = reduced ? {} : stagger(0.09)
  const item         = reduced ? {} : fadeIn
  const imgVariant   = reduced ? {} : fadeIn

  // Theme tokens
  const bg          = dark ? 'bg-[#0d0d0d]'   : 'bg-white'
  const text        = dark ? 'text-[#f7f7f5]' : 'text-[#0d0d0d]'
  const border      = dark ? 'border-[#f7f7f5]' : 'border-[#0d0d0d]'
  const borderMuted = dark ? 'border-[#333]'    : 'border-[#e5e5e5]'
  const textMuted   = dark ? 'text-[#aaa]'      : 'text-[#888]'
  const textSubtle  = dark ? 'text-[#aaa]'      : 'text-[#444]'
  const chevron     = dark ? '#f7f7f5'           : '#0d0d0d'
  const thumbActive = dark ? 'border-[#f7f7f5]' : 'border-[#0d0d0d]'
  const thumbInact  = dark ? 'border-[#333]'    : 'border-[#e5e5e5]'

  // Size button states
  const sizeSelected   = dark
    ? 'bg-[#f7f7f5] text-[#0d0d0d] border-[#f7f7f5]'
    : 'bg-[#0d0d0d] text-white border-[#0d0d0d]'
  const sizeUnselected = dark
    ? 'bg-[#0d0d0d] text-[#f7f7f5] border-[#f7f7f5] hover:bg-[#f7f7f5] hover:text-[#0d0d0d]'
    : 'bg-white text-[#0d0d0d] border-[#0d0d0d] hover:bg-[#0d0d0d] hover:text-white'

  // Add to bag button
  const btnActive   = dark
    ? 'bg-[#f7f7f5] text-[#0d0d0d] border-[#f7f7f5] hover:bg-[#0d0d0d] hover:text-[#f7f7f5]'
    : 'bg-[#0d0d0d] text-white border-[#0d0d0d] hover:bg-white hover:text-[#0d0d0d]'
  const btnAdded    = dark
    ? 'bg-[#0d0d0d] text-[#f7f7f5] border-[#f7f7f5]'
    : 'bg-white text-[#0d0d0d] border-[#0d0d0d]'
  const btnDisabled = 'bg-[#6f6f73] text-white border-transparent cursor-not-allowed'

  // Pills
  const pill = dark
    ? 'bg-[#f7f7f5] text-[#0d0d0d]'
    : 'bg-[#0d0d0d] text-white'

  return (
    <div className={`min-h-screen ${bg} ${text} flex flex-col`}>

      <PageEdgeArt
        left={dark ? '/decor/basement-left.png' : '/decor/inventory-left.png'}
        right={dark ? '/decor/basement-right.png' : '/decor/inventory-right.png'}
        leftAlt=""
        rightAlt=""
        mobile={dark ? '/decor/phone-basement.png' : '/decor/phone-inventory.png'}
        mobileAlt=""
      />

      {dark ? <BasementNavBar backHref="/basement" /> : <NavBar showBack backHref="/inventory" />}

      <main className="relative z-10 px-4 md:px-16 lg:px-[200px] pb-[120px] flex-1">
        <div className="flex flex-col md:flex-row gap-[48px] lg:gap-[80px] items-start">

          {/* Left — image */}
          <motion.div
            className="w-full mt-[140px] md:mt-0 md:flex-[55] min-w-0"
            variants={imgVariant}
            initial="hidden"
            animate="show"
          >
            <div className="relative w-full aspect-[87/61]">
              <AnimatePresence mode="wait">
                {images[activeImage] && (
                  <motion.div
                    key={activeImage}
                    className="absolute inset-0"
                    initial={reduced ? {} : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reduced ? {} : { opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  >
                    <Image
                      src={images[activeImage]}
                      alt={product.name}
                      fill
                      className="object-contain"
                      priority
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImage((i) => (i - 1 + images.length) % images.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center hover:opacity-60 transition-opacity"
                    aria-label="Previous image"
                  >
                    <svg width="10" height="18" viewBox="0 0 10 18" fill="none">
                      <path d="M9 1L1 9L9 17" stroke={chevron} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => setActiveImage((i) => (i + 1) % images.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center hover:opacity-60 transition-opacity"
                    aria-label="Next image"
                  >
                    <svg width="10" height="18" viewBox="0 0 10 18" fill="none">
                      <path d="M1 1L9 9L1 17" stroke={chevron} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex justify-center gap-[8px] mt-[16px]">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`relative w-[80px] h-[80px] border rounded transition-colors ${i === activeImage ? thumbActive : thumbInact}`}
                    aria-label={i === 0 ? 'Front' : 'Back'}
                  >
                    <Image src={img} alt="" fill className="object-contain" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Right — info panel */}
          <motion.div
            className="w-full md:flex-[45] min-w-0 flex flex-col items-center text-center pt-[8px]"
            variants={panelStagger}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={item} className="flex flex-wrap justify-center gap-[8px] mb-[12px]">
              <span className={`inline-flex items-center text-[12px] font-bold px-[12px] py-[4px] rounded tracking-[0.04em] ${pill}`}>
                {product.collection}
              </span>
              {availability !== 'available' && (
                <span className={`inline-flex items-center text-[12px] font-bold px-[12px] py-[4px] rounded tracking-[0.04em] ${pill}`}>
                  {STATUS_LABEL[availability]}
                </span>
              )}
            </motion.div>

            <motion.h1
              variants={item}
              className="text-[28px] font-extrabold leading-[1.2] tracking-[0.02em] uppercase mb-[12px]"
            >
              {product.name}
            </motion.h1>

            <motion.p variants={item} className="text-[22px] font-bold mb-[28px]">
              ${(selected?.price ?? product.variants[0]?.price ?? 0).toFixed(2)}
            </motion.p>

            <motion.p variants={item} className={`text-[11px] font-bold tracking-[0.1em] uppercase ${textMuted} mb-[12px]`}>
              Size
            </motion.p>

            <motion.div variants={item} className="flex flex-wrap justify-center gap-[8px] mb-[8px]">
              {(sizeAxis >= 0 ? product.options[sizeAxis].values : []).map((s) => {
                const v = variantFor(s)
                const ok = sellable(v)
                return (
                  <motion.button
                    key={s}
                    type="button"
                    disabled={!ok}
                    aria-disabled={!ok}
                    onClick={() => setSize(s === size ? null : s)}
                    whileHover={reduced || !ok ? {} : { scale: 1.05 }}
                    whileTap={reduced || !ok ? {} : { scale: 0.97 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className={`w-[64px] h-[44px] flex items-center justify-center text-[12px] font-bold tracking-[0.04em] border rounded transition-colors duration-150 ${
                      size === s ? sizeSelected : sizeUnselected
                    } ${ok ? '' : 'opacity-40 line-through cursor-not-allowed'}`}
                  >
                    {s}
                  </motion.button>
                )
              })}
            </motion.div>

            {selected && selected.trackInventory && selected.stock > 0 && selected.stock <= LOW_STOCK_THRESHOLD && (
              <motion.p variants={item} className="text-[11px] text-pink-deep mb-[12px]">
                Only {selected.stock} left
              </motion.p>
            )}

            <motion.div variants={item} className="w-full mt-[12px]">
              {isSoldOut ? (
                <p className="text-[13px] font-bold tracking-[0.1em] uppercase mb-[24px]">
                  Sorry Sold Out
                </p>
              ) : (
                <motion.button
                  onClick={handleAddToBag}
                  whileTap={reduced ? {} : { scale: 0.98 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  disabled={!selected || !sellable(selected)}
                  className={`w-full py-[14px] text-[13px] font-bold tracking-[0.06em] uppercase border rounded mb-[24px] transition-colors duration-200 ${
                    added ? btnAdded : selected ? btnActive : btnDisabled
                  }`}
                >
                  {added ? 'Added ✓' : selected ? 'Add to Bag' : 'Select a Size'}
                </motion.button>
              )}
            </motion.div>

            <motion.p
              variants={item}
              className={`text-[12px] font-bold tracking-[0.04em] uppercase leading-relaxed mb-[32px] ${text}`}
            >
              {colorwayLabel(product) && `${colorwayLabel(product)} colorway. `}{product.fit} {product.fabric}, {product.fabricWeight}. Printed graphic on front. Part of the &ldquo;{product.collection}&rdquo; collection. {product.modelNote}
            </motion.p>

            <motion.div variants={item} className={`border-t ${borderMuted} pt-[24px]`}>
              <p className={`text-[11px] font-bold tracking-[0.08em] uppercase ${textMuted} mb-[12px]`}>Care</p>
              <ul className={`text-[12px] ${textSubtle} space-y-[4px]`}>
                {product.careInstructions.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </motion.div>

          </motion.div>
        </div>
      </main>

      <footer className="relative z-10">
        {dark ? <BasementFooter /> : <FooterLinks />}
      </footer>

    </div>
  )
}
