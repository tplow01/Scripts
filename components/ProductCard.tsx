'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import type { Product } from '@/types/product'

const STATUS_LABELS: Record<Product['status'], string> = {
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

  return (
    <Link href={`/products/${product.slug}`} className="block w-full">

      <motion.div
        className="peer relative w-full aspect-square"
        whileHover={reduced ? {} : { scale: 1.05 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        {product.image && (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-contain"
          />
        )}
      </motion.div>

      {/* Pills */}
      <div className="flex flex-wrap gap-[8px] mt-[8px] justify-center peer-hover:[&>span]:bg-[#FF8AC7] peer-hover:[&>span]:text-[#0d0d0d]">
        <span className={`inline-flex items-center ${pill} text-[12px] font-bold px-[12px] py-[4px] rounded whitespace-nowrap leading-normal tracking-[0.04em] transition-colors duration-300`}>
          {product.collection}
        </span>
        {product.status !== 'available' && (
          <span className={`inline-flex items-center ${pill} text-[12px] font-bold px-[12px] py-[4px] rounded whitespace-nowrap leading-normal tracking-[0.04em] transition-colors duration-300`}>
            {STATUS_LABELS[product.status]}
          </span>
        )}
      </div>

      {/* Name + price */}
      <div className="mt-[16px] text-center">
        <p className={`text-[13px] font-bold ${text} uppercase leading-snug`}>
          {product.name}
        </p>
        <p className={`text-[13px] font-bold ${text} leading-snug mt-[4px]`}>
          ${product.price}.00
        </p>
      </div>

    </Link>
  )
}
