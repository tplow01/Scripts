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

export default function BasementProductCard({ product }: { product: Product }) {
  const reduced = useReducedMotion()

  return (
    <Link href={`/products/${product.slug}`} className="group block w-full">

      <motion.div
        className="relative w-full aspect-square"
        whileHover={reduced ? {} : { scale: 1.02 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        {product.image && (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-contain transition-opacity duration-300 group-hover:opacity-0"
          />
        )}
        {product.backImage && (
          <Image
            src={product.backImage}
            alt={`${product.name} — back`}
            fill
            className="absolute inset-0 object-contain opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
        )}
      </motion.div>

      {/* Pills */}
      <div className="flex flex-wrap gap-[8px] mt-[8px] justify-center">
        <span className="inline-flex items-center bg-[#f7f7f5] text-[#0d0d0d] text-[12px] font-bold px-[12px] py-[4px] rounded whitespace-nowrap leading-normal tracking-[0.04em]">
          {product.collection}
        </span>
        {product.status !== 'available' && (
          <span className="inline-flex items-center bg-[#f7f7f5] text-[#0d0d0d] text-[12px] font-bold px-[12px] py-[4px] rounded whitespace-nowrap leading-normal tracking-[0.04em]">
            {STATUS_LABELS[product.status]}
          </span>
        )}
      </div>

      {/* Name + price */}
      <div className="mt-[16px] text-center">
        <p className="text-[13px] font-bold text-[#f7f7f5] uppercase leading-snug">
          {product.name}
        </p>
        <p className="text-[13px] font-bold text-[#f7f7f5] leading-snug mt-[4px]">
          ${product.price}.00
        </p>
      </div>

    </Link>
  )
}
