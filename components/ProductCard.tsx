'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import type { Product, Availability } from '@/types/product'
import { deriveAvailability } from '@/lib/admin/variants'

const STATUS_LABELS: Record<Availability, string> = {
  'pre-order': 'PRE-ORDER',
  'sold-out':  'SOLD OUT',
  'available': '',
}

const THEME = {
  light: {
    pill: 'bg-[#0d0d0d] text-[#f7f7f5]',
    text: 'text-[#0d0d0d]',
  },
  dark: {
    pill: 'bg-[#f7f7f5] text-[#0d0d0d]',
    text: 'text-[#f7f7f5]',
  },
} as const

interface ProductCardProps {
  product: Product
  theme: 'light' | 'dark'
}

export default function ProductCard({ product, theme }: ProductCardProps) {
  const reduced = useReducedMotion()
  const { pill, text } = THEME[theme]
  const availability = deriveAvailability(product)
  const image = product.media[0]?.url ?? null
  const backImage = product.media[1]?.url ?? null
  const price = product.variants[0]?.price ?? 0
  // Pointer-driven flip — CSS :hover can stick on mount if the cursor already
  // sits over a card when the inventory grid fades in.
  const [flipped, setFlipped] = useState(false)

  return (
    <Link
      href={`/products/${product.slug}`}
      className="block w-full"
      onPointerEnter={() => setFlipped(true)}
      onPointerLeave={() => setFlipped(false)}
    >

      <motion.div
        className="relative w-full aspect-square"
        animate={reduced ? undefined : { scale: flipped ? 1.02 : 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        {image && (
          <Image
            src={image}
            alt={product.name}
            fill
            className={`object-contain transition-opacity duration-300 ${flipped && backImage ? 'opacity-0' : 'opacity-100'}`}
          />
        )}
        {backImage && (
          <Image
            src={backImage}
            alt={`${product.name} — back`}
            fill
            className={`absolute inset-0 object-contain transition-opacity duration-300 ${flipped ? 'opacity-100' : 'opacity-0'}`}
          />
        )}
      </motion.div>

      {/* Pills */}
      <div className="flex flex-wrap gap-[8px] mt-[8px] justify-center">
        <span className={`inline-flex items-center ${pill} text-[12px] font-bold px-[12px] py-[4px] rounded whitespace-nowrap leading-normal tracking-[0.04em]`}>
          {product.collection}
        </span>
        {availability !== 'available' && (
          <span className={`inline-flex items-center ${pill} text-[12px] font-bold px-[12px] py-[4px] rounded whitespace-nowrap leading-normal tracking-[0.04em]`}>
            {STATUS_LABELS[availability]}
          </span>
        )}
      </div>

      {/* Name + price */}
      <div className="mt-[16px] text-center">
        <p className={`text-[13px] font-bold ${text} uppercase leading-snug`}>
          {product.name}
        </p>
        <p className={`text-[13px] font-bold ${text} leading-snug mt-[4px]`}>
          ${price}.00
        </p>
      </div>

    </Link>
  )
}
