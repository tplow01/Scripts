'use client'

import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

/**
 * Lightweight toast system for the editorial shop.
 * Brand tokens only (#0d0d0d / #f7f7f5 / #FF4FA3). Sits above the cart
 * drawer (z-40/z-50) on a semantic toast layer.
 */

type ToastVariant = 'success' | 'error'

interface Toast {
  id: number
  message: string
  variant: ToastVariant
}

interface ToastCtx {
  notify: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastCtx | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)
  const reduced = useReducedMotion()

  const notify = useCallback((message: string, variant: ToastVariant = 'success') => {
    const id = ++idRef.current
    setToasts((prev) => [...prev, { id, message, variant }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3200)
  }, [])

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}

      {/* Toast layer — fixed, escapes any overflow context */}
      <div className="pointer-events-none fixed bottom-5 left-1/2 z-[60] flex w-[calc(100%-32px)] max-w-[380px] -translate-x-1/2 flex-col gap-[10px]">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto flex items-center gap-[12px] rounded-[10px] bg-[#0d0d0d] px-[18px] py-[14px] text-[#f7f7f5] shadow-[0_12px_32px_rgba(0,0,0,0.28)]"
            >
              <span
                className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold leading-none"
                style={{ background: t.variant === 'success' ? '#FF4FA3' : '#f7f7f5', color: t.variant === 'success' ? '#0d0d0d' : '#0d0d0d' }}
              >
                {t.variant === 'success' ? '✓' : '!'}
              </span>
              <span className="text-[12px] font-bold uppercase leading-snug tracking-[0.06em]">
                {t.message}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
