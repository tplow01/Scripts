import type { Variants } from 'framer-motion'

// Soft opacity fade — Supreme-style, no translate
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.6, ease: 'easeOut' } },
}

// Stagger container
export const stagger = (delay = 0.1): Variants => ({
  hidden: {},
  show:   { transition: { staggerChildren: delay } },
})

// Slight fade-up only for fine detail elements (pills, labels)
export const fadeUp: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } },
}

// Cart drawer slide — keeps slide behaviour for the panel
export const slideIn: Variants = {
  hidden: { x: '100%' },
  show:   { x: 0, transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] } },
  exit:   { x: '100%', transition: { duration: 0.32, ease: [0.4, 0, 1, 1] as [number,number,number,number] } },
}
