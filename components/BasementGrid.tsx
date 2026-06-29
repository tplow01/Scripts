'use client'

import { motion, useReducedMotion } from 'framer-motion'
import BasementProductCard from '@/components/BasementProductCard'
import type { Product } from '@/types/product'
import { fadeIn, stagger } from '@/lib/motion'

export default function BasementGrid({ products }: { products: Product[] }) {
  const reduced = useReducedMotion()

  const container = reduced ? {} : stagger(0.08)
  const item      = reduced ? {} : fadeIn

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-8 md:gap-y-[56px] max-w-2xl mx-auto w-full"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {products.map((product) => (
        <motion.div key={product.id} variants={item}>
          <BasementProductCard product={product} />
        </motion.div>
      ))}
    </motion.div>
  )
}
