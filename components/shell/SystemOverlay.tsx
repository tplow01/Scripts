'use client'

import { Press_Start_2P } from 'next/font/google'

const pressStart = Press_Start_2P({ weight: '400', subsets: ['latin'], display: 'swap' })

const SOCIALS = [
  { label: 'Instagram', href: 'https://www.instagram.com/scripts.studio/' },
  { label: 'YouTube', href: 'https://youtube.com' },
  { label: 'TikTok', href: 'https://www.tiktok.com/@scripts.studio' },
]

/**
 * Pause-menu-style overlay rendered INSIDE the LCD (same host as the game
 * canvas / start screen): dimmed screen + pixel-frame panel. Socials list or
 * the platform-aware key legend. Tap outside (or B/X/Escape, handled by the
 * shell) closes it.
 */
export default function SystemOverlay({
  kind, mobile, onClose,
}: { kind: 'social' | 'help'; mobile: boolean; onClose: () => void }) {
  const keys: [string, string][] = mobile
    ? [['D-PAD', 'Walk (hold)'], ['A', 'Interact / Confirm'], ['B', 'Back / Cancel']]
    : [['ARROWS', 'Walk (hold)'], ['Z', 'Interact / Confirm'], ['X', 'Back / Cancel']]
  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 8,
        background: 'rgba(13,13,13,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0D0D0D', border: '3px solid #F7F7F5', borderRadius: 4,
          boxShadow: '0 0 0 3px #0D0D0D',
          padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10,
        }}
      >
        <span className={pressStart.className} style={{ fontSize: 7, color: '#FF8AC7', letterSpacing: 1 }}>
          {kind === 'social' ? 'SOCIALS' : 'HOW TO PLAY'}
        </span>
        {kind === 'social'
          ? SOCIALS.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                 className={pressStart.className}
                 style={{ fontSize: 8, color: '#F7F7F5', letterSpacing: 0.5 }}>
                {s.label}
              </a>
            ))
          : keys.map(([k, v]) => (
              <div key={k} className={pressStart.className}
                   style={{ fontSize: 7, color: '#F7F7F5', display: 'flex', gap: 16, justifyContent: 'space-between' }}>
                <span style={{ color: '#FF8AC7' }}>{k}</span><span>{v}</span>
              </div>
            ))}
      </div>
    </div>
  )
}
