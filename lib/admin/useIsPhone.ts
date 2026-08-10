'use client'

import { useEffect, useState } from 'react'

/**
 * True below the `sm` breakpoint (640px). Returns false on the server and on the
 * first client render, then updates after mount — so it never causes a hydration
 * mismatch. Use ONLY where a numeric value is needed (chart height); prefer
 * Tailwind `sm:` classes for anything expressible in CSS.
 */
export function useIsPhone(): boolean {
  const [isPhone, setIsPhone] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const update = () => setIsPhone(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return isPhone
}
