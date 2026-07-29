'use client'

import { useState } from 'react'
import { DMG_PILL_FACE, DMG_PILL_SHADOW, STRIP_BLACK, pressedStyle } from './theme'

/**
 * DMG-style utility unit: a small BLANK molded pill with its label printed on
 * the flat shell below it (or beside it on desktop) — like Start/Select on the
 * original Game Boy. The whole unit is the hit area (min 44px).
 */
export function DmgBtn({
  label, onPress, pillWidth = 44, labelBeside = false,
}: { label: string; onPress: () => void; pillWidth?: number; labelBeside?: boolean }) {
  const [pressed, setPressed] = useState(false)
  const pillHeight = Math.round(pillWidth * 0.34)
  return (
    <button
      aria-label={label}
      onPointerDown={(e) => { e.preventDefault(); setPressed(true); onPress() }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        border: 'none', background: 'transparent', padding: 0, cursor: 'pointer',
        display: 'flex', flexDirection: labelBeside ? 'row' : 'column',
        alignItems: 'center', gap: labelBeside ? 7 : 5,
        minWidth: 44, minHeight: 44, justifyContent: 'center',
        touchAction: 'manipulation',
      }}
    >
      <span style={{
        width: pillWidth, height: pillHeight, borderRadius: pillHeight / 2,
        background: DMG_PILL_FACE, boxShadow: DMG_PILL_SHADOW, display: 'block',
        transition: 'transform 60ms, box-shadow 60ms',
        ...(pressed ? pressedStyle(DMG_PILL_SHADOW) : null),
      }} />
      <span style={{
        fontFamily: 'sans-serif', fontWeight: 800, letterSpacing: 1.5,
        fontSize: Math.max(8, Math.round(pillWidth * 0.2)), color: STRIP_BLACK,
      }}>
        {label}
      </span>
    </button>
  )
}

/** Flat printed icon button — no 3D, just black marks on the shell. 44px hit area. */
export function FlatIconBtn({
  onPress, children, ariaLabel,
}: { onPress: () => void; children: React.ReactNode; ariaLabel: string }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      aria-label={ariaLabel}
      onPointerDown={(e) => { e.preventDefault(); setPressed(true); onPress() }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        border: 'none', background: 'transparent', cursor: 'pointer',
        width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 0, touchAction: 'manipulation',
        opacity: pressed ? 0.55 : 0.85, transition: 'opacity 60ms',
      }}
    >
      {children}
    </button>
  )
}

/** Speaker glyph; muted swaps the sound arc for a strike-through slash. */
export function SpeakerIcon({ size = 18, muted = false, color = STRIP_BLACK }: {
  size?: number; muted?: boolean; color?: string
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill={color} />
      {muted
        ? <path d="M15.5 9.5 21 15M21 9.5 15.5 15" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        : <path d="M16 9c1 .8 1.5 1.8 1.5 3s-.5 2.2-1.5 3" stroke={color} strokeWidth="1.8" strokeLinecap="round" />}
    </svg>
  )
}

/** Flat printed "?" mark. */
export function QuestionGlyph({ size = 17, color = STRIP_BLACK }: { size?: number; color?: string }) {
  return (
    <span style={{
      fontFamily: 'monospace', fontWeight: 800, fontSize: size, color, lineHeight: 1,
    }}>
      ?
    </span>
  )
}
