'use client'

import { useEffect, useState } from 'react'

export type ShellLayout = 'desktop' | 'portrait' | 'landscape'

/**
 * Which Game Boy shell layout to render. Touch devices (or narrow viewports)
 * get a handheld layout picked by orientation; mouse-driven desktops keep the
 * full-bleed bezel. null until mounted (avoid a hydration flash).
 */
export function useShellLayout(): ShellLayout | null {
  const [layout, setLayout] = useState<ShellLayout | null>(null)
  useEffect(() => {
    const touch = window.matchMedia('(max-width: 1024px), (pointer: coarse)')
    const portrait = window.matchMedia('(orientation: portrait)')
    const update = () =>
      setLayout(!touch.matches ? 'desktop' : portrait.matches ? 'portrait' : 'landscape')
    update()
    touch.addEventListener('change', update)
    portrait.addEventListener('change', update)
    return () => {
      touch.removeEventListener('change', update)
      portrait.removeEventListener('change', update)
    }
  }, [])
  return layout
}
