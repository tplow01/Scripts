# Console Shell Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the Game Boy shell to a flat `#FF4FA3` pink body with molded black controls across portrait, landscape, and desktop, per `docs/superpowers/specs/2026-07-29-console-shell-redesign-design.md`.

**Architecture:** All colour recipes live in `components/shell/theme.ts`; each control is its own component in `components/shell/`; `GameBoyShell.tsx` owns the three layout blocks. Behaviour (input plumbing, overlays, hold-to-walk) is untouched — this is a visual/layout change only.

**Tech Stack:** Next.js 15 + React 19 + TypeScript, inline styles (existing pattern), vitest for token tests. Test command: `npx vitest run`. Verify UI with `npm run dev` + browser devtools device emulation.

## Global Constraints

- Shell fill is exactly `#FF4FA3`, flat — no gradients/creases/vignettes on the body.
- Strip is `#0D0D0D`; wordmark and A/B letters are `#FF8AC7` in Press Start 2P.
- Controls (D-pad, A/B, DMG pills) keep molded-rubber 3D treatment; MUTE and ? are flat printed icons.
- Utility actions stay exactly `social`, `inventory`, `mute`, `help` (`lib/controls.ts` unchanged). No cart on the shell.
- The `Dots` speaker motif is deleted; no dot pattern anywhere.
- All utility hit areas ≥ 44×44 px even where the visual is smaller.
- Do not modify `lib/controls.ts`, `lib/useShellLayout.ts`, `components/shell/SystemOverlay.tsx`, or anything under `src/game/`.

---

### Task 1: Theme tokens

**Files:**
- Modify: `components/shell/theme.ts`
- Test: `__tests__/shellTheme.test.ts`

**Interfaces:**
- Produces: `SHELL_PINK: string` (`'#FF4FA3'`), `STRIP_BLACK: string` (`'#0D0D0D'`), `WORDMARK_PINK: string` (`'#FF8AC7'`), `RUBBER_FACE`, `RUBBER_SHADOW`, `DMG_PILL_FACE`, `DMG_PILL_SHADOW`, `SCREEN_GLASS`, `pressedStyle(baseShadow)` — consumed by Tasks 2–7.
- Removes: `INK_BODY`, `INK_CREASES`, `PINK_FACE`, `PINK_SHADOW`, `PILL_FACE`, `PILL_SHADOW` (later tasks delete their usages; the build stays broken only within this branch until Task 7 — acceptable, tests still run per-file).

- [ ] **Step 1: Rewrite the theme test to describe the new palette**

Replace the entire contents of `__tests__/shellTheme.test.ts` with:

```ts
import { describe, expect, it } from 'vitest'
import * as T from '@/components/shell/theme'

describe('shell theme', () => {
  it('shell is one flat brand pink, strip is brand black', () => {
    expect(T.SHELL_PINK).toBe('#FF4FA3')
    expect(T.STRIP_BLACK).toBe('#0D0D0D')
  })
  it('wordmark is Primary Pink', () => {
    expect(T.WORDMARK_PINK).toBe('#FF8AC7')
  })
  it('rubber and DMG pill faces are molded (gradients), never pink', () => {
    expect(T.RUBBER_FACE).toContain('gradient')
    expect(T.DMG_PILL_FACE).toContain('gradient')
    expect(T.RUBBER_FACE.toLowerCase()).not.toContain('#ff4fa3')
    expect(T.DMG_PILL_FACE.toLowerCase()).not.toContain('#ff4fa3')
  })
  it('retired ink/pink-face tokens are gone', () => {
    const t = T as Record<string, unknown>
    for (const dead of ['INK_BODY', 'INK_CREASES', 'PINK_FACE', 'PINK_SHADOW', 'PILL_FACE', 'PILL_SHADOW']) {
      expect(t[dead], dead).toBeUndefined()
    }
  })
  it('pressedStyle sinks the control and shrinks its shadow', () => {
    const p = T.pressedStyle('0 4px 6px rgba(0,0,0,.5)')
    expect(p.transform).toContain('translateY')
    expect(p.boxShadow).not.toBe('0 4px 6px rgba(0,0,0,.5)')
  })
})
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run __tests__/shellTheme.test.ts`
Expected: FAIL (`SHELL_PINK` undefined, retired tokens still exported).

- [ ] **Step 3: Rewrite `components/shell/theme.ts`**

Replace the entire file with:

```ts
/** Material recipes for the SCR!PTS console — the ONLY place shell colours live. */

/** Flat pink shell. One fill, no gradients, no creases — the body is a solid. */
export const SHELL_PINK = '#FF4FA3'

/** Wordmark strip and flat printed labels/icons. */
export const STRIP_BLACK = '#0D0D0D'
export const WORDMARK_PINK = '#FF8AC7'

/** Matte rubber — A/B buttons and D-pad. Light only from above. */
export const RUBBER_FACE = 'radial-gradient(circle at 36% 28%, #2e2e31 0%, #1b1b1e 55%, #101012 100%)'
export const RUBBER_SHADOW =
  '0 4px 6px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.1), inset 0 3px 4px rgba(255,255,255,0.12), inset 0 -5px 8px rgba(0,0,0,0.6)'

/** DMG utility pill — small blank molded pill, label printed on the shell beside/below it. */
export const DMG_PILL_FACE = 'radial-gradient(ellipse at 38% 25%, #3a3a3e 0%, #141416 100%)'
export const DMG_PILL_SHADOW =
  '0 2px 3px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.08), inset 0 1px 2px rgba(255,255,255,0.15), inset 0 -2px 3px rgba(0,0,0,0.6)'

/** Glass sheen swept across the LCD's top corner. */
export const SCREEN_GLASS =
  'linear-gradient(115deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.05) 18%, transparent 30%)'

/** Press feedback: the control sinks and its drop shadow tightens. */
export function pressedStyle(baseShadow: string): { transform: string; boxShadow: string } {
  return {
    transform: 'translateY(2px)',
    boxShadow: baseShadow.replace(/0 [234]px [3456]px/, '0 1px 2px'),
  }
}
```

- [ ] **Step 4: Run the test and make sure it passes**

Run: `npx vitest run __tests__/shellTheme.test.ts`
Expected: PASS. (Full `npx vitest run` also passes — other test files don't import the shell theme. `tsc`/build will be red until Tasks 2–7 land; that's expected inside this plan.)

- [ ] **Step 5: Commit**

```bash
git add components/shell/theme.ts __tests__/shellTheme.test.ts
git commit -m "feat(shell): flat pink theme tokens, retire ink/pink-face materials"
```

---

### Task 2: Seamless symmetric D-pad

**Files:**
- Modify: `components/shell/DPad.tsx`

**Interfaces:**
- Consumes: `RUBBER_SHADOW` idea only (self-contained gradients inline); `HoldHandlers` type unchanged.
- Produces: `DPad({ size, hold })` — same public props as today (`size: number`, `hold: (b: Btn) => HoldHandlers`). Layout tasks keep calling it identically.

- [ ] **Step 1: Rewrite `components/shell/DPad.tsx`**

Replace the entire file with:

```tsx
'use client'

import type { Btn } from '@/lib/controls'

export type HoldHandlers = {
  onPointerDown: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  onPointerCancel: (e: React.PointerEvent) => void
}

/**
 * One seamless symmetric cross (single SVG path — never two overlapping bars):
 * all four lobes identical, rounded corners, molded-rubber shading, rounded
 * embossed arrows, dished centre. Four hold-to-walk pointer zones on top.
 */
export default function DPad({ size, hold }: { size: number; hold: (b: Btn) => HoldHandlers }) {
  return (
    <div style={{
      position: 'relative', width: size, height: size, touchAction: 'none',
      filter: 'drop-shadow(0 5px 7px rgba(0,0,0,0.4))',
    }}>
      <svg width={size} height={size} viewBox="0 0 84 84">
        <defs>
          <linearGradient id="dpad-rubber" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2c2c2f" />
            <stop offset="1" stopColor="#101012" />
          </linearGradient>
        </defs>
        {/* Symmetric cross: both arms 28 units wide, spanning 4→80. */}
        <path
          d="M35 4 h14 a7 7 0 0 1 7 7 v17 h17 a7 7 0 0 1 7 7 v14 a7 7 0 0 1 -7 7 h-17 v17 a7 7 0 0 1 -7 7 h-14 a7 7 0 0 1 -7 -7 v-17 h-17 a7 7 0 0 1 -7 -7 v-14 a7 7 0 0 1 7 -7 h17 v-17 a7 7 0 0 1 7 -7 z"
          fill="url(#dpad-rubber)"
        />
        {/* Rounded embossed arrows — round stroke joins soften the points. */}
        <g fill="#0a0a0b" stroke="#0a0a0b" strokeWidth="3.5" strokeLinejoin="round">
          <polygon points="42,12 46.5,18.5 37.5,18.5" />
          <polygon points="42,72 46.5,65.5 37.5,65.5" />
          <polygon points="12,42 18.5,37.5 18.5,46.5" />
          <polygon points="72,42 65.5,37.5 65.5,46.5" />
        </g>
        {/* Dished centre */}
        <circle cx="42" cy="42" r="9.5" fill="#0e0e10" />
        <circle cx="42" cy="42" r="9.5" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      </svg>
      {/* Hold zones (unchanged behaviour) */}
      <div {...hold('up')} style={{ position: 'absolute', top: 0, left: '28%', width: '44%', height: '40%' }} />
      <div {...hold('down')} style={{ position: 'absolute', bottom: 0, left: '28%', width: '44%', height: '40%' }} />
      <div {...hold('left')} style={{ position: 'absolute', left: 0, top: '28%', width: '40%', height: '44%' }} />
      <div {...hold('right')} style={{ position: 'absolute', right: 0, top: '28%', width: '40%', height: '44%' }} />
    </div>
  )
}
```

- [ ] **Step 2: Type-check the file compiles**

Run: `npx tsc --noEmit 2>&1 | grep DPad`
Expected: no output (other files may still error against the new theme — that's later tasks).

- [ ] **Step 3: Commit**

```bash
git add components/shell/DPad.tsx
git commit -m "feat(shell): seamless symmetric D-pad with rounded arrows"
```

---

### Task 3: A/B buttons — black rubber, pink letters

**Files:**
- Modify: `components/shell/RoundBtn.tsx`

**Interfaces:**
- Consumes: `RUBBER_FACE`, `RUBBER_SHADOW`, `WORDMARK_PINK`, `pressedStyle` from Task 1.
- Produces: `RoundBtn({ label, onPress, size })` — same public props (`label: 'A' | 'B'`).

- [ ] **Step 1: Rewrite `components/shell/RoundBtn.tsx`**

Replace the entire file with:

```tsx
'use client'

import { Press_Start_2P } from 'next/font/google'
import { useState } from 'react'
import type { Btn } from '@/lib/controls'
import { RUBBER_FACE, RUBBER_SHADOW, WORDMARK_PINK, pressedStyle } from './theme'

const pressStart = Press_Start_2P({ weight: '400', subsets: ['latin'], display: 'swap' })

/** Big matte-rubber round face button. Both A and B are black with pink letters. */
export default function RoundBtn({
  label, onPress, size = 92,
}: { label: 'A' | 'B'; onPress: (b: Btn) => void; size?: number }) {
  const [pressed, setPressed] = useState(false)
  return (
    <div
      onPointerDown={(e) => { e.preventDefault(); setPressed(true); onPress(label) }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        width: size, height: size, borderRadius: '50%',
        background: RUBBER_FACE,
        boxShadow: RUBBER_SHADOW,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', touchAction: 'none',
        transition: 'transform 60ms, box-shadow 60ms',
        ...(pressed ? pressedStyle(RUBBER_SHADOW) : null),
      }}
    >
      <span className={pressStart.className} style={{
        fontSize: size * 0.33,
        color: WORDMARK_PINK,
        textShadow: '0 2px 2px rgba(0,0,0,0.35), 0 -1px 1px rgba(255,255,255,0.05)',
        transform: 'translateY(1px)',
      }}>
        {label}
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Type-check the file compiles**

Run: `npx tsc --noEmit 2>&1 | grep RoundBtn`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add components/shell/RoundBtn.tsx
git commit -m "feat(shell): A/B both black rubber with pink letters"
```

---

### Task 4: DMG utility unit + flat icon buttons (replaces PillBtn)

**Files:**
- Create: `components/shell/UtilityBtn.tsx`
- Delete: `components/shell/PillBtn.tsx` (in Task 7, once GameBoyShell stops importing it)

**Interfaces:**
- Consumes: `DMG_PILL_FACE`, `DMG_PILL_SHADOW`, `STRIP_BLACK`, `pressedStyle` from Task 1.
- Produces (used by Tasks 5–7):
  - `DmgBtn({ label, onPress, pillWidth?, labelBeside? })` — `label: string`, `onPress: () => void`, `pillWidth?: number` (default 44), `labelBeside?: boolean` (default false → label below).
  - `FlatIconBtn({ onPress, children, ariaLabel })` — flat printed icon, 44×44 hit area.
  - `SpeakerIcon({ size?, muted?, color? })` and `QuestionGlyph({ size?, color? })` icon helpers.

- [ ] **Step 1: Create `components/shell/UtilityBtn.tsx`**

```tsx
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
```

- [ ] **Step 2: Type-check the file compiles**

Run: `npx tsc --noEmit 2>&1 | grep UtilityBtn`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add components/shell/UtilityBtn.tsx
git commit -m "feat(shell): DMG utility unit and flat icon buttons"
```

---

### Task 5: GameBoyShell — shared frame + portrait layout

**Files:**
- Modify: `components/GameBoyShell.tsx`

**Interfaces:**
- Consumes: `DPad`, `RoundBtn` (unchanged APIs), `DmgBtn`, `FlatIconBtn`, `SpeakerIcon`, `QuestionGlyph` from Task 4; `SHELL_PINK`, `STRIP_BLACK`, `SCREEN_GLASS`, `WORDMARK_PINK` from Task 1.
- Produces: `GameBoyShell` public props unchanged. Internal `ScreenModule({ children, overlay, stripHeight, framePad, lcdRadius, style })` where `framePad: string` is CSS padding for the black frame on the sides that get one (portrait: none — strip only below).

This task rewrites the whole file (imports, `ScreenModule`, `Dots` removal, portrait block) and stubs landscape/desktop to keep compiling; Tasks 6 and 7 replace the stubs. Replace the entire file with the code below.

- [ ] **Step 1: Rewrite `components/GameBoyShell.tsx`**

```tsx
'use client'

import { Press_Start_2P } from 'next/font/google'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { Btn, UtilityAction } from '@/lib/controls'
import { UTILITY_LABELS } from '@/lib/controls'
import type { ShellLayout } from '@/lib/useShellLayout'
import DPad from './shell/DPad'
import RoundBtn from './shell/RoundBtn'
import SystemOverlay from './shell/SystemOverlay'
import { DmgBtn, FlatIconBtn, QuestionGlyph, SpeakerIcon } from './shell/UtilityBtn'
import { SCREEN_GLASS, SHELL_PINK, STRIP_BLACK, WORDMARK_PINK } from './shell/theme'

export type { Btn }

const pressStart = Press_Start_2P({ weight: '400', subsets: ['latin'], display: 'swap' })

/**
 * LCD with the flat SCR!PTS strip as its bottom band. `framePad` is the black
 * frame shown around the LCD (CSS padding shorthand): desktop frames every
 * edge, landscape only left/right, portrait none — the strip itself is always
 * the bottom border.
 */
function ScreenModule({ children, overlay, stripHeight = 26, framePad = '0', lcdRadius = 0, style = {} }: {
  children: ReactNode; overlay: ReactNode; stripHeight?: number; framePad?: string; lcdRadius?: number; style?: React.CSSProperties
}) {
  return (
    <div style={{ background: STRIP_BLACK, display: 'flex', flexDirection: 'column', padding: framePad, paddingBottom: 0, ...style }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', borderRadius: lcdRadius, background: 'linear-gradient(160deg, #E2E2DE 0%, #D6D6D2 100%)' }}>
        {children}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: SCREEN_GLASS }} />
        {overlay}
      </div>
      <div style={{ height: stripHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span className={pressStart.className} style={{
          fontSize: Math.round(stripHeight * 0.34), color: WORDMARK_PINK, letterSpacing: 5,
          textShadow: '0 0 6px rgba(255,138,199,0.35)',
        }}>
          SCR!PTS
        </span>
      </div>
    </div>
  )
}

/** Live viewport size — used to size controls proportionally to the screen. */
function useViewport(): [number, number] {
  const [size, setSize] = useState<[number, number]>(() =>
    typeof window === 'undefined' ? [390, 750] : [window.innerWidth, window.innerHeight])
  useEffect(() => {
    const update = () => setSize([window.innerWidth, window.innerHeight])
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return size
}

export default function GameBoyShell({
  screen, onPress, onRelease, layout, onInventory, muted, onToggleMute, onOverlayChange,
}: {
  screen: ReactNode
  onPress: (b: Btn) => void
  /** Fired when a held button is let go (D-pad hold-to-walk). */
  onRelease?: (b: Btn) => void
  layout: ShellLayout
  onInventory: () => void
  muted: boolean
  onToggleMute: () => void
  /** SystemOverlay open/close — the page freezes Phaser input while open. */
  onOverlayChange?: (open: boolean) => void
}) {
  const [overlayKind, setOverlayKind] = useState<'social' | 'help' | null>(null)
  const [vw, vh] = useViewport()

  const setOverlay = useCallback((k: 'social' | 'help' | null) => {
    setOverlayKind((prev) => {
      const next = prev === k ? null : k
      onOverlayChange?.(next !== null)
      return next
    })
  }, [onOverlayChange])

  const closeOverlay = useCallback(() => {
    setOverlayKind((prev) => {
      if (prev !== null) onOverlayChange?.(false)
      return null
    })
  }, [onOverlayChange])

  // Desktop keys close an open overlay (X / Escape), matching B on touch.
  useEffect(() => {
    if (!overlayKind) return
    const onKey = (e: KeyboardEvent) => {
      if (['KeyX', 'Escape'].includes(e.code)) { e.preventDefault(); closeOverlay() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [overlayKind, closeOverlay])

  // Spec: overlays close on layout change (rotation would strand a stale overlay).
  useEffect(() => { closeOverlay() }, [layout, closeOverlay])

  const press = (b: Btn) => (e: React.PointerEvent) => {
    e.preventDefault()
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* noop */ }
    if (overlayKind && (b === 'B' || b === 'A')) { closeOverlay(); return }
    onPress(b)
  }
  const release = (b: Btn) => (e: React.PointerEvent) => { e.preventDefault(); onRelease?.(b) }
  const hold = (b: Btn) => ({
    onPointerDown: press(b),
    onPointerUp: release(b),
    onPointerCancel: release(b),
  })
  const pressPlain = (b: Btn) => {
    if (overlayKind && (b === 'B' || b === 'A')) { closeOverlay(); return }
    onPress(b)
  }

  const onUtility = (a: UtilityAction) => {
    if (a === 'inventory') { closeOverlay(); onInventory(); return }
    if (a === 'mute') { onToggleMute(); return }
    setOverlay(a === 'social' ? 'social' : 'help')
  }

  const overlay = overlayKind
    ? <SystemOverlay kind={overlayKind} mobile={layout !== 'desktop'} onClose={closeOverlay} />
    : null

  const rootStyle: React.CSSProperties = {
    background: SHELL_PINK, userSelect: 'none', WebkitUserSelect: 'none',
    WebkitTouchCallout: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'none',
  }

  // ── DESKTOP (Task 7 replaces this stub with the framed 16:9 layout)
  if (layout === 'desktop') {
    return (
      <div className="w-screen flex flex-col" style={{ ...rootStyle, height: '100dvh' }}>
        <ScreenModule overlay={overlay} stripHeight={26} framePad="14px" style={{ flex: 1 }}>{screen}</ScreenModule>
      </div>
    )
  }

  // ── LANDSCAPE (Task 6 replaces this stub)
  if (layout === 'landscape') {
    return (
      <div style={{ ...rootStyle, position: 'relative', height: '100dvh' }}>
        <ScreenModule overlay={overlay} stripHeight={22} framePad="0 14px" style={{ position: 'absolute', left: '15%', right: '15%', top: 0, bottom: 0 }}>{screen}</ScreenModule>
      </div>
    )
  }

  // ── PORTRAIT: full-bleed LCD top 50%, flat pink deck below.
  const portraitDpadSize = Math.min(0.36 * vw, 150)
  const portraitAbsSize = Math.min(0.22 * vw, 96)
  const dmgPillWidth = Math.max(38, Math.min(0.12 * vw, 48))
  return (
    <div className="w-screen flex flex-col" style={{ ...rootStyle, height: '100dvh' }}>
      <div style={{ height: '50%', overflow: 'hidden' }}>
        <ScreenModule overlay={overlay} stripHeight={24} style={{ width: '100%', height: '100%' }}>{screen}</ScreenModule>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        {/* Control clusters */}
        <div style={{ position: 'absolute', left: '7%', top: '10%' }}>
          <DPad size={portraitDpadSize} hold={hold} />
        </div>
        <div style={{
          position: 'absolute', right: '6%', top: '12%',
          width: portraitAbsSize * 2.1, height: portraitAbsSize * 1.8, touchAction: 'none',
        }}>
          <div style={{ position: 'absolute', top: 0, right: 0 }}><RoundBtn label="A" onPress={pressPlain} size={portraitAbsSize} /></div>
          <div style={{ position: 'absolute', bottom: 0, left: 0 }}><RoundBtn label="B" onPress={pressPlain} size={portraitAbsSize} /></div>
        </div>
        {/* SOCIALS + INVENTORY centred in the space below the clusters */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: '62%',
          display: 'flex', justifyContent: 'center', gap: 20,
        }}>
          <DmgBtn label={UTILITY_LABELS.social} pillWidth={dmgPillWidth} onPress={() => onUtility('social')} />
          <DmgBtn label={UTILITY_LABELS.inventory} pillWidth={dmgPillWidth} onPress={() => onUtility('inventory')} />
        </div>
        {/* Flat icons in the bottom corners */}
        <div style={{ position: 'absolute', left: 'calc(10px + env(safe-area-inset-left))', bottom: 'calc(6px + env(safe-area-inset-bottom))' }}>
          <FlatIconBtn ariaLabel={muted ? 'Unmute' : 'Mute'} onPress={() => onUtility('mute')}>
            <SpeakerIcon size={20} muted={muted} />
          </FlatIconBtn>
        </div>
        <div style={{ position: 'absolute', right: 'calc(10px + env(safe-area-inset-right))', bottom: 'calc(6px + env(safe-area-inset-bottom))' }}>
          <FlatIconBtn ariaLabel="Help" onPress={() => onUtility('help')}>
            <QuestionGlyph size={19} />
          </FlatIconBtn>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Full type-check**

Run: `npx tsc --noEmit`
Expected: clean — nothing imports `PillBtn` or the retired tokens any more except `PillBtn.tsx` itself (delete comes in Task 7; if `PillBtn.tsx` errors on the removed tokens, that confirms the ordering — note it and continue).

- [ ] **Step 3: Visual check — portrait**

Run: `npm run dev`, open http://localhost:3000 in devtools iPhone emulation (portrait).
Expected: screen edge-to-edge top 50%, black strip, flat pink deck; D-pad/A/B; two DMG units centred on one line below them; speaker bottom-left, ? bottom-right. D-pad walks, A/B work, mute icon toggles slash, ? opens help overlay.

- [ ] **Step 4: Commit**

```bash
git add components/GameBoyShell.tsx
git commit -m "feat(shell): portrait layout — full-bleed screen, flat pink deck, DMG utilities"
```

---

### Task 6: Landscape layout

**Files:**
- Modify: `components/GameBoyShell.tsx` (replace the landscape stub from Task 5)

**Interfaces:**
- Consumes: everything already imported in Task 5. No new exports.

- [ ] **Step 1: Replace the landscape block**

In `components/GameBoyShell.tsx`, replace the `if (layout === 'landscape') { ... }` stub with:

```tsx
  // ── LANDSCAPE: LCD centre with strip below; controls ride high on flat pink
  // flanks, each flank's utility stack beneath its cluster.
  if (layout === 'landscape') {
    const dpadSize = Math.max(96, Math.min(0.20 * vh, 0.115 * vw))
    const absSize = Math.max(56, Math.min(0.13 * vh, 0.075 * vw))
    // Flank must contain the clamped D-pad / A-B cluster — on small viewports
    // the clamp floors win over 13vw, so the flank grows to avoid clipping.
    const flankW = Math.max(0.13 * vw, dpadSize + 12, absSize * 2.1 + 12)
    return (
      <div style={{ ...rootStyle, position: 'relative', height: '100dvh' }}>
        <div style={{ position: 'absolute', left: flankW, right: flankW, top: 0, bottom: 0 }}>
          <ScreenModule overlay={overlay} stripHeight={22} framePad="0 14px" style={{ width: '100%', height: '100%' }}>{screen}</ScreenModule>
        </div>
        {/* Left flank: D-pad high, SOCIALS + speaker below it */}
        <div style={{
          position: 'absolute', left: 0, width: flankW, top: 0, bottom: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          paddingTop: 'max(6vh, env(safe-area-inset-top))', paddingLeft: 'env(safe-area-inset-left)',
          paddingBottom: 'calc(6px + env(safe-area-inset-bottom))',
        }}>
          <div style={{ flexBasis: '18%' }} />
          <DPad size={dpadSize} hold={hold} />
          <div style={{ flex: 1 }} />
          <DmgBtn label={UTILITY_LABELS.social} pillWidth={40} onPress={() => onUtility('social')} />
          <FlatIconBtn ariaLabel={muted ? 'Unmute' : 'Mute'} onPress={() => onUtility('mute')}>
            <SpeakerIcon size={18} muted={muted} />
          </FlatIconBtn>
        </div>
        {/* Right flank: A/B high, INVENTORY + ? below */}
        <div style={{
          position: 'absolute', right: 0, width: flankW, top: 0, bottom: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          paddingTop: 'max(6vh, env(safe-area-inset-top))', paddingRight: 'env(safe-area-inset-right)',
          paddingBottom: 'calc(6px + env(safe-area-inset-bottom))',
        }}>
          <div style={{ flexBasis: '18%' }} />
          <div style={{ position: 'relative', width: absSize * 2.1, height: absSize * 1.8, touchAction: 'none' }}>
            <div style={{ position: 'absolute', top: 0, right: 0 }}><RoundBtn label="A" onPress={pressPlain} size={absSize} /></div>
            <div style={{ position: 'absolute', bottom: 0, left: 0 }}><RoundBtn label="B" onPress={pressPlain} size={absSize} /></div>
          </div>
          <div style={{ flex: 1 }} />
          <DmgBtn label={UTILITY_LABELS.inventory} pillWidth={40} onPress={() => onUtility('inventory')} />
          <FlatIconBtn ariaLabel="Help" onPress={() => onUtility('help')}>
            <QuestionGlyph size={17} />
          </FlatIconBtn>
        </div>
      </div>
    )
  }
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: same state as Task 5 Step 2 (only `PillBtn.tsx` may error).

- [ ] **Step 3: Visual check — landscape**

Run: `npm run dev`, devtools iPhone emulation rotated to landscape.
Expected: screen centred with black side frame + strip; D-pad and A/B in the upper third of pink flanks; SOCIALS→speaker stacked under the D-pad, INVENTORY→? under A/B. On a very short viewport (e.g. 568×320) nothing overlaps — flex spacers collapse before controls clip.

- [ ] **Step 4: Commit**

```bash
git add components/GameBoyShell.tsx
git commit -m "feat(shell): landscape layout — controls high, utilities under each flank"
```

---

### Task 7: Desktop layout + delete PillBtn

**Files:**
- Modify: `components/GameBoyShell.tsx` (replace the desktop stub)
- Delete: `components/shell/PillBtn.tsx`

**Interfaces:**
- Consumes: `DmgBtn` with `labelBeside`, `FlatIconBtn`, `SpeakerIcon`, `QuestionGlyph`.

- [ ] **Step 1: Replace the desktop block**

In `components/GameBoyShell.tsx`, replace the `if (layout === 'desktop') { ... }` stub with:

```tsx
  // ── DESKTOP: 16:9 LCD wrapped by the black strip on all four sides,
  // wordmark in the bottom band, utility row below the frame on flat pink.
  if (layout === 'desktop') {
    const stripH = 28
    const frame = 16
    const railH = 56
    // Largest 16:9 screen that fits beside slim margins and the utility rail.
    const margin = 0.025 * Math.min(vw, vh)
    const maxW = vw - 2 * margin - 2 * frame
    const maxH = vh - 2 * margin - railH - stripH - frame
    const lcdW = Math.min(maxW, maxH * (16 / 9))
    const lcdH = lcdW * (9 / 16)
    return (
      <div className="w-screen flex flex-col items-center justify-center" style={{ ...rootStyle, height: '100dvh', gap: 6 }}>
        <div style={{
          background: STRIP_BLACK, borderRadius: 10, padding: frame, paddingBottom: 0,
          boxShadow: '0 10px 26px rgba(0,0,0,0.35)',
        }}>
          <div style={{ width: lcdW, height: lcdH, position: 'relative', overflow: 'hidden', borderRadius: 4, background: 'linear-gradient(160deg, #E2E2DE 0%, #D6D6D2 100%)' }}>
            {screen}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: SCREEN_GLASS }} />
            {overlay}
          </div>
          <div style={{ height: stripH, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className={pressStart.className} style={{
              fontSize: Math.round(stripH * 0.34), color: WORDMARK_PINK, letterSpacing: 5,
              textShadow: '0 0 6px rgba(255,138,199,0.35)',
            }}>
              SCR!PTS
            </span>
          </div>
        </div>
        <div style={{ height: railH, display: 'flex', alignItems: 'center', gap: 26 }}>
          <DmgBtn label={UTILITY_LABELS.social} pillWidth={40} labelBeside onPress={() => onUtility('social')} />
          <DmgBtn label={UTILITY_LABELS.inventory} pillWidth={40} labelBeside onPress={() => onUtility('inventory')} />
          <FlatIconBtn ariaLabel={muted ? 'Unmute' : 'Mute'} onPress={() => onUtility('mute')}>
            <SpeakerIcon size={19} muted={muted} />
          </FlatIconBtn>
          <FlatIconBtn ariaLabel="Help" onPress={() => onUtility('help')}>
            <QuestionGlyph size={18} />
          </FlatIconBtn>
        </div>
      </div>
    )
  }
```

Note: this block renders the LCD directly (not via `ScreenModule`) because the desktop frame is sized from the LCD out, not from a container in. `ScreenModule` remains used by portrait and landscape; its `framePad` prop is now only used by landscape — if after this task no caller passes a non-`'0'` `framePad` except landscape, leave the prop as is.

- [ ] **Step 2: Delete PillBtn**

```bash
git rm components/shell/PillBtn.tsx
```

- [ ] **Step 3: Full verification**

Run: `npx tsc --noEmit && npx vitest run && npm run lint`
Expected: all clean — no references to `PillBtn`, `INK_BODY`, `INK_CREASES`, `PINK_FACE`, `PILL_FACE`, `PILL_SHADOW`, or `Dots` remain (`grep -rn "PillBtn\|INK_BODY\|INK_CREASES\|PINK_FACE\|PILL_FACE\|PILL_SHADOW\|Dots" components/ __tests__/` returns nothing).

- [ ] **Step 4: Visual check — desktop + ultra-wide**

Run: `npm run dev`, open at a normal desktop window and a very wide one (devtools responsive 2560×900).
Expected: 16:9 screen centred, black frame snug on all four sides with wordmark in the bottom band, utility row directly below the frame (not pinned to the viewport bottom). Keyboard (arrows/Z/X, X/Esc closes overlay) still works.

- [ ] **Step 5: Commit**

```bash
git add -A components/
git commit -m "feat(shell): desktop framed 16:9 layout, remove PillBtn"
```

---

### Task 8: Final sweep

**Files:**
- Verify only (no planned edits).

- [ ] **Step 1: Full test + build**

Run: `npx vitest run && npm run build`
Expected: tests green, production build succeeds.

- [ ] **Step 2: Cross-layout behaviour pass**

With `npm run dev` in devtools: rotate portrait↔landscape (overlay must close on rotation), open/close SOCIALS and ? overlays in every layout (B/A touch and X/Esc keys close them), toggle mute in every layout (icon shows slash when muted), open inventory.

- [ ] **Step 3: Commit any stragglers and update docs**

If PRD/BRAND need a line about the new shell direction (pink flat shell, DMG utilities), add it to `PRD.md`'s Change Log per repo rules.

```bash
git add -A
git commit -m "chore(shell): redesign sweep — docs and cleanup"
```
