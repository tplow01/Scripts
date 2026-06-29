'use client'

import { motion, useReducedMotion } from 'framer-motion'
import ProductCard from '@/components/ProductCard'
import type { Product } from '@/types/product'
import { fadeIn, stagger } from '@/lib/motion'

export default function InventoryGrid({ products }: { products: Product[] }) {
  const reduced = useReducedMotion()

  const container = reduced ? {} : stagger(0.08)
  const item      = reduced ? {} : fadeIn

  return (
    <motion.div
      className="flex flex-wrap justify-center gap-x-4 gap-y-8 md:gap-y-[56px]"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {products.map((product) => (
        <motion.div
          key={product.id}
          variants={item}
          className="w-full sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)]"
        >
          <ProductCard product={product} />
        </motion.div>
      ))}
    </motion.div>
  )
}
