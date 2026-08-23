'use client'

import { motion, useReducedMotion } from 'framer-motion'
import ProductCard from '@/components/ProductCard'
import type { Product } from '@/types/product'
import { fadeIn, stagger } from '@/lib/motion'

const CONTAINER_CLASS = {
  3: 'flex flex-wrap justify-center gap-x-3 gap-y-8 md:gap-y-[56px]',
  2: 'grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-8 md:gap-y-[56px] max-w-2xl mx-auto w-full',
} as const

const ITEM_CLASS = {
  3: 'w-full sm:w-[calc(50%-6px)] lg:w-[calc(33.333%-8px)]',
  2: '',
} as const

interface ProductGridProps {
  products: Product[]
  theme: 'light' | 'dark'
  columns: 2 | 3
}

export default function ProductGrid({ products, theme, columns }: ProductGridProps) {
  const reduced = useReducedMotion()

  const container = reduced ? {} : stagger(0.08)
  const item      = reduced ? {} : fadeIn

  return (
    <motion.div
      className={CONTAINER_CLASS[columns]}
      variants={container}
      initial="hidden"
      animate="show"
    >
      {products.map((product) => (
        <motion.div key={product.id} variants={item} className={ITEM_CLASS[columns]}>
          <ProductCard product={product} theme={theme} />
        </motion.div>
      ))}
    </motion.div>
  )
}
