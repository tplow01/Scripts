'use client'

import { useSFX } from '@/lib/sfx'

const ICON_CLS = 'flex items-center justify-center w-[36px] h-[36px] hover:opacity-60 transition-opacity'

/** Accessible sound preference toggle. Shares the nav bars' icon-button footprint. */
export default function SoundToggle({ dark = false }: { dark?: boolean }) {
  const { enabled, setEnabled } = useSFX()
  const stroke = dark ? '#f7f7f5' : '#0d0d0d'

  return (
    <button
      type="button"
      onClick={() => setEnabled(!enabled)}
      aria-pressed={enabled}
      aria-label={enabled ? 'Mute sound' : 'Unmute sound'}
      className={ICON_CLS}
    >
      {enabled ? (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M4 9v6h4l5 4V5L8 9H4Z" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M17 8.5c1 1 1.5 2.2 1.5 3.5s-.5 2.5-1.5 3.5" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M19.3 6c1.8 1.7 2.7 3.8 2.7 6s-.9 4.3-2.7 6" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
        </svg>
      ) : (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M4 9v6h4l5 4V5L8 9H4Z" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M16.5 9.5l5 5M21.5 9.5l-5 5" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )}
    </button>
  )
}
