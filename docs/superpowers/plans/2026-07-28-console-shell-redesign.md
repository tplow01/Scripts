# Console Shell Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the console shell (desktop / landscape / portrait) in the approved "ink + matte rubber" Delta-style design, with percentage-based geometry that makes off-screen controls impossible, and reduce the control set to D-pad · A · B · four utility pills.

**Architecture:** All shell visuals derive from one theme module (`components/shell/theme.ts`) and one control vocabulary (`lib/controls.ts`). `GameBoyShell.tsx` renders three layout trees that position the same button-kit components (`DPad`, `RoundBtn`, `PillBtn`) with percentage/clamp geometry. Utility actions render as `PillBtn`s per layout; SELECT/START/MENU and `ConsoleUtilityStrip` are deleted.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, inline styles (existing pattern), Vitest (jsdom, tests in `__tests__/*.test.ts` — pure-TS tests only, matching the existing include pattern).

## Global Constraints

- Colour tokens (BRAND.md, verbatim): Primary Black `#0D0D0D`, White `#F7F7F5`, Primary Pink `#FF8AC7`, Secondary Pink `#FF4FA3`, Neutral Grey `#6F6F73`.
- Body ink gradient: `linear-gradient(175deg, #303034 0%, #232327 45%, #17171a 100%)`.
- Pink A button: `radial-gradient(circle at 36% 28%, #FF9ECF 0%, #FF4FA3 60%, #E23F90 100%)`.
- Wordmark: `SCR!PTS` in Press Start 2P, colour `#FF8AC7`, on the flat black strip at the bezel's bottom — never protruding.
- Controls: matte rubber only (no gloss). A is the ONLY pink control.
- Geometry: percentages + `clamp()` + `env(safe-area-inset-*)`. No fixed pixel flank widths. Minimum touch target 40px.
- Landscape: 13% flanks (screen 74% wide), bezel top → 96% height. Desktop: ~1.6% side margins. Portrait: top half full-bleed screen.
- Final control set: D-pad, A, B, SOCIALS, INVENTORY, MUTE, ?. **No SELECT, START, or MENU anywhere** — including keyboard (Enter no longer mapped).
- Follow the repo's existing style: `'use client'` components, inline style objects, JSDoc comments on components. Run `npm test` and `npm run lint` before each commit.

---

### Task 1: Control vocabulary — `lib/controls.ts`

Shrink `Btn` to the final set, define utility actions and the keyboard map in one testable module. (Type currently lives in `components/shell/DPad.tsx:3` and includes MENU/SELECT/START.)

**Files:**
- Create: `lib/controls.ts`
- Test: `__tests__/controls.test.ts`

**Interfaces:**
- Produces: `type Btn = 'up' | 'down' | 'left' | 'right' | 'A' | 'B'`; `type UtilityAction = 'social' | 'inventory' | 'mute' | 'help'`; `const KEY_TO_BTN: Record<string, Btn>` (KeyboardEvent.key → Btn); `const UTILITY_LABELS: Record<UtilityAction, string>` (`social→'SOCIALS'`, `inventory→'INVENTORY'`, `mute→'MUTE'`, `help→'?'`).

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/controls.test.ts
import { describe, expect, it } from 'vitest'
import { KEY_TO_BTN, UTILITY_LABELS, type Btn } from '@/lib/controls'

describe('controls', () => {
  it('maps arrows and Z/X to buttons', () => {
    expect(KEY_TO_BTN['ArrowUp']).toBe('up')
    expect(KEY_TO_BTN['ArrowDown']).toBe('down')
    expect(KEY_TO_BTN['ArrowLeft']).toBe('left')
    expect(KEY_TO_BTN['ArrowRight']).toBe('right')
    expect(KEY_TO_BTN['z']).toBe('A')
    expect(KEY_TO_BTN['x']).toBe('B')
  })
  it('no longer maps Enter/Shift/Escape to game buttons', () => {
    expect(KEY_TO_BTN['Enter']).toBeUndefined()
    expect(KEY_TO_BTN['Shift']).toBeUndefined()
    expect(KEY_TO_BTN['Escape']).toBeUndefined()
  })
  it('labels the four utilities', () => {
    expect(UTILITY_LABELS.social).toBe('SOCIALS')
    expect(UTILITY_LABELS.inventory).toBe('INVENTORY')
    expect(UTILITY_LABELS.mute).toBe('MUTE')
    expect(UTILITY_LABELS.help).toBe('?')
  })
  it('Btn excludes the removed hardware buttons', () => {
    // @ts-expect-error START is no longer a Btn
    const bad: Btn = 'START'
    void bad
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/controls.test.ts`
Expected: FAIL — cannot resolve `@/lib/controls`.

- [ ] **Step 3: Write the module**

```ts
// lib/controls.ts
/** The complete hardware vocabulary of the SCR!PTS console. */
export type Btn = 'up' | 'down' | 'left' | 'right' | 'A' | 'B'

/** Out-of-game utility buttons rendered as engraved pills on every shell. */
export type UtilityAction = 'social' | 'inventory' | 'mute' | 'help'

export const UTILITY_LABELS: Record<UtilityAction, string> = {
  social: 'SOCIALS',
  inventory: 'INVENTORY',
  mute: 'MUTE',
  help: '?',
}

/** KeyboardEvent.key → console button. Lowercase letters; arrows verbatim. */
export const KEY_TO_BTN: Record<string, Btn> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  z: 'A', x: 'B',
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/controls.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/controls.ts __tests__/controls.test.ts
git commit -m "feat(shell): final control vocabulary (no SELECT/START/MENU)"
```

---

### Task 2: Shell theme — `components/shell/theme.ts`

Single source of truth for every material recipe in the approved skin.

**Files:**
- Create: `components/shell/theme.ts`
- Test: `__tests__/shellTheme.test.ts`

**Interfaces:**
- Produces (exact names, all `string` constants unless noted):
  `INK_BODY`, `INK_CREASES`, `RUBBER_FACE`, `RUBBER_SHADOW`, `PINK_FACE`, `PINK_SHADOW`, `PILL_FACE`, `PILL_SHADOW`, `SCREEN_GLASS`, `WORDMARK_PINK` (`'#FF8AC7'`), and `PRESSED: { transform: string; boxShadow?: undefined }`-style helper `pressedStyle(base: string): { transform: string; boxShadow: string }`.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/shellTheme.test.ts
import { describe, expect, it } from 'vitest'
import * as T from '@/components/shell/theme'

describe('shell theme', () => {
  it('uses the approved ink body gradient', () => {
    expect(T.INK_BODY).toContain('#303034')
    expect(T.INK_BODY).toContain('#232327')
    expect(T.INK_BODY).toContain('#17171a')
  })
  it('pink face uses brand pinks and is the only pink material', () => {
    expect(T.PINK_FACE).toContain('#FF4FA3')
    expect(T.RUBBER_FACE.toLowerCase()).not.toContain('#ff4fa3')
    expect(T.PILL_FACE.toLowerCase()).not.toContain('#ff4fa3')
  })
  it('wordmark is Primary Pink', () => {
    expect(T.WORDMARK_PINK).toBe('#FF8AC7')
  })
  it('pressedStyle sinks the control and shrinks its shadow', () => {
    const p = T.pressedStyle('0 4px 6px rgba(0,0,0,.5)')
    expect(p.transform).toContain('translateY')
    expect(p.boxShadow).not.toBe('0 4px 6px rgba(0,0,0,.5)')
  })
})
```

- [ ] **Step 2: Run to verify it fails** — `npm test -- __tests__/shellTheme.test.ts` → FAIL (module missing).

- [ ] **Step 3: Write the module**

```ts
// components/shell/theme.ts
/** Material recipes for the SCR!PTS console — the ONLY place shell colours live. */

/** Molded ink plastic body. */
export const INK_BODY = 'linear-gradient(175deg, #303034 0%, #232327 45%, #17171a 100%)'

/** Soft molded creases + bottom vignette, layered over INK_BODY. */
export const INK_CREASES = `
  linear-gradient(90deg, rgba(255,255,255,0.09) 0%, transparent 6%, transparent 94%, rgba(0,0,0,0.3) 100%),
  linear-gradient(180deg, rgba(255,255,255,0.07) 0%, transparent 12%),
  radial-gradient(ellipse at 50% 120%, rgba(0,0,0,0.25), transparent 60%)
`

/** Matte rubber — B button, D-pad lobes. Light only from above. */
export const RUBBER_FACE = 'radial-gradient(circle at 36% 28%, #2e2e31 0%, #1b1b1e 55%, #101012 100%)'
export const RUBBER_SHADOW =
  '0 4px 6px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.1), inset 0 3px 4px rgba(255,255,255,0.12), inset 0 -5px 8px rgba(0,0,0,0.6)'

/** The A button — the only pink control on the console. */
export const PINK_FACE = 'radial-gradient(circle at 36% 28%, #FF9ECF 0%, #FF4FA3 60%, #E23F90 100%)'
export const PINK_SHADOW =
  '0 4px 6px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.15), inset 0 3px 4px rgba(255,255,255,0.3), inset 0 -5px 8px rgba(178,42,110,0.65)'

/** Engraved utility pill. */
export const PILL_FACE = 'radial-gradient(ellipse at 38% 25%, #454549 0%, #1a1a1d 60%, #0d0d0f 100%)'
export const PILL_SHADOW =
  '0 3px 5px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.08), inset 0 2px 3px rgba(255,255,255,0.18), inset 0 -3px 4px rgba(0,0,0,0.6)'

/** Glass sheen swept across the LCD's top corner. */
export const SCREEN_GLASS =
  'linear-gradient(115deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.05) 18%, transparent 30%)'

export const WORDMARK_PINK = '#FF8AC7'

/** Press feedback: the control sinks and its drop shadow tightens. */
export function pressedStyle(baseShadow: string): { transform: string; boxShadow: string } {
  return {
    transform: 'translateY(2px)',
    boxShadow: baseShadow.replace(/0 [34]px [56]px/, '0 1px 2px'),
  }
}
```

- [ ] **Step 4: Run to verify it passes** — `npm test -- __tests__/shellTheme.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add components/shell/theme.ts __tests__/shellTheme.test.ts
git commit -m "feat(shell): ink + matte-rubber theme module"
```

---

### Task 3: D-pad — rounded-lobe cross

Rewrite `DPad.tsx` in the Delta style: rounded lobes, fat embossed arrows, dished centre. `Btn`/`HoldHandlers` move to `lib/controls.ts` re-export.

**Files:**
- Modify: `components/shell/DPad.tsx` (full rewrite, 68 lines)

**Interfaces:**
- Consumes: `Btn` from `@/lib/controls`; theme constants from `./theme`.
- Produces: `export type HoldHandlers = { onPointerDown/onPointerUp/onPointerCancel: (e: React.PointerEvent) => void }`; `export default function DPad({ size, hold }: { size: number; hold: (b: Btn) => HoldHandlers })`. (`Btn` is NO LONGER exported from DPad — importers switch to `@/lib/controls`.)

- [ ] **Step 1: Rewrite the component**

```tsx
'use client'

import type { Btn } from '@/lib/controls'

export type HoldHandlers = {
  onPointerDown: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  onPointerCancel: (e: React.PointerEvent) => void
}

const LOBE = 'linear-gradient(160deg, #2c2c2f 0%, #1a1a1c 55%, #111113 100%)'
const LOBE_INSET = 'inset 0 2px 2px rgba(255,255,255,0.14), inset 0 -3px 5px rgba(0,0,0,0.65)'

/** Fat embossed arrow (Delta-style), drawn as an SVG triangle. */
function Arrow({ dir, size }: { dir: 'up' | 'down' | 'left' | 'right'; size: number }) {
  const s = size
  const points = {
    up: `${s / 2},0 ${s},${s} 0,${s}`,
    down: `0,0 ${s},0 ${s / 2},${s}`,
    left: `${s},0 ${s},${s} 0,${s / 2}`,
    right: `0,0 ${s},${s / 2} 0,${s}`,
  }[dir]
  return (
    <svg width={s} height={s} style={{ opacity: 0.8, filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.06))' }}>
      <polygon points={points} fill="#0a0a0b" />
    </svg>
  )
}

/**
 * Delta-style D-pad: rounded-lobe cross in matte rubber, fat embossed arrows,
 * dished centre circle. Four hold-to-walk pointer zones on top.
 */
export default function DPad({ size, hold }: { size: number; hold: (b: Btn) => HoldHandlers }) {
  const arrow = Math.round(size * 0.19)
  const pad = Math.round(size * 0.08)
  const lobeRadius = size * 0.15
  return (
    <div style={{
      position: 'relative', width: size, height: size, touchAction: 'none',
      filter: 'drop-shadow(0 5px 7px rgba(0,0,0,0.55))',
    }}>
      {/* Rounded lobes */}
      <div style={{ position: 'absolute', top: '29%', left: 0, right: 0, height: '42%', background: LOBE, borderRadius: lobeRadius, boxShadow: LOBE_INSET }} />
      <div style={{ position: 'absolute', left: '29%', top: 0, bottom: 0, width: '42%', background: LOBE, borderRadius: lobeRadius, boxShadow: LOBE_INSET }} />
      {/* Dished centre */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: size * 0.29, height: size * 0.29, borderRadius: '50%',
        background: 'radial-gradient(circle at 40% 32%, #232326, #101012 70%)',
        boxShadow: 'inset 0 3px 5px rgba(0,0,0,0.75), inset 0 -1px 1px rgba(255,255,255,0.07)',
      }} />
      {/* Embossed arrows */}
      <div style={{ position: 'absolute', top: pad, left: '50%', transform: 'translateX(-50%)' }}><Arrow dir="up" size={arrow} /></div>
      <div style={{ position: 'absolute', bottom: pad, left: '50%', transform: 'translateX(-50%)' }}><Arrow dir="down" size={arrow} /></div>
      <div style={{ position: 'absolute', left: pad, top: '50%', transform: 'translateY(-50%)' }}><Arrow dir="left" size={arrow} /></div>
      <div style={{ position: 'absolute', right: pad, top: '50%', transform: 'translateY(-50%)' }}><Arrow dir="right" size={arrow} /></div>
      {/* Hold zones (unchanged behaviour) */}
      <div {...hold('up')} style={{ position: 'absolute', top: 0, left: '28%', width: '44%', height: '40%' }} />
      <div {...hold('down')} style={{ position: 'absolute', bottom: 0, left: '28%', width: '44%', height: '40%' }} />
      <div {...hold('left')} style={{ position: 'absolute', left: 0, top: '28%', width: '40%', height: '44%' }} />
      <div {...hold('right')} style={{ position: 'absolute', right: 0, top: '28%', width: '40%', height: '44%' }} />
    </div>
  )
}
```

- [ ] **Step 2: Fix the two importers of `Btn` from DPad**

`components/GameBoyShell.tsx:5` (`import DPad, { type Btn } from './shell/DPad'`) and `components/shell/RoundBtn.tsx:4` / `PillBtn.tsx:4` (`import type { Btn } from './DPad'`) → import `Btn` from `@/lib/controls` instead. GameBoyShell still re-exports it (`export type { Btn }`) so `app/page.tsx:7` keeps working. (GameBoyShell won't compile fully until Task 6 — that's fine; only fix the imports it needs now.)

- [ ] **Step 3: Verify** — `npx tsc --noEmit` may still fail on GameBoyShell's MENU/SELECT/START usages (expected until Task 6); confirm there are NO errors in `DPad.tsx`, `RoundBtn.tsx`, `PillBtn.tsx`. Visual check: `npm run dev` on port 3123 → portrait devtools view shows the new D-pad.

- [ ] **Step 4: Commit**

```bash
git add components/shell/DPad.tsx components/GameBoyShell.tsx components/shell/RoundBtn.tsx components/shell/PillBtn.tsx
git commit -m "feat(shell): Delta-style rounded-lobe D-pad"
```

---

### Task 4: Round buttons — zone-filling matte rubber A/B

**Files:**
- Modify: `components/shell/RoundBtn.tsx` (full rewrite, 28 lines)

**Interfaces:**
- Consumes: `Btn` from `@/lib/controls`; `RUBBER_FACE`, `RUBBER_SHADOW`, `PINK_FACE`, `PINK_SHADOW`, `pressedStyle` from `./theme`.
- Produces: `export default function RoundBtn({ label, onPress, size }: { label: 'A' | 'B'; onPress: (b: Btn) => void; size?: number })` — default size 92. A renders pink, B ink; engraved centred letter at `size * 0.33`.

- [ ] **Step 1: Rewrite the component**

```tsx
'use client'

import { Press_Start_2P } from 'next/font/google'
import { useState } from 'react'
import type { Btn } from '@/lib/controls'
import { PINK_FACE, PINK_SHADOW, RUBBER_FACE, RUBBER_SHADOW, pressedStyle } from './theme'

const pressStart = Press_Start_2P({ weight: '400', subsets: ['latin'], display: 'swap' })

/** Big matte-rubber round face button. A is the console's only pink control. */
export default function RoundBtn({
  label, onPress, size = 92,
}: { label: 'A' | 'B'; onPress: (b: Btn) => void; size?: number }) {
  const [pressed, setPressed] = useState(false)
  const pink = label === 'A'
  const shadow = pink ? PINK_SHADOW : RUBBER_SHADOW
  return (
    <div
      onPointerDown={(e) => { e.preventDefault(); setPressed(true); onPress(label) }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        width: size, height: size, borderRadius: '50%',
        background: pink ? PINK_FACE : RUBBER_FACE,
        boxShadow: shadow,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', touchAction: 'none',
        transition: 'transform 60ms, box-shadow 60ms',
        ...(pressed ? pressedStyle(shadow) : null),
      }}
    >
      <span className={pressStart.className} style={{
        fontSize: size * 0.33,
        color: pink ? 'rgba(122,27,82,0.75)' : 'rgba(247,247,245,0.28)',
        textShadow: '0 2px 2px rgba(0,0,0,0.35), 0 -1px 1px rgba(255,255,255,0.05)',
        transform: 'translateY(1px)',
      }}>
        {label}
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Verify** — `npm test` (existing suites still pass); dev server: A renders pink with engraved letter, press sinks it.

- [ ] **Step 3: Commit**

```bash
git add components/shell/RoundBtn.tsx
git commit -m "feat(shell): zone-filling matte-rubber A/B with pink A"
```

---

### Task 5: Pill button — engraved label inside

`PillBtn` becomes the utility pill: wide rubber pill with the label engraved inside. It now takes a `UtilityAction`-agnostic string label + callback (it's used only for utilities after Task 6).

**Files:**
- Modify: `components/shell/PillBtn.tsx` (full rewrite, 26 lines)

**Interfaces:**
- Consumes: `PILL_FACE`, `PILL_SHADOW`, `pressedStyle` from `./theme`.
- Produces: `export default function PillBtn({ label, onPress, height, active }: { label: string; onPress: () => void; height?: number; active?: boolean })` — default height 30; horizontal padding `height * 0.7`; `active` (used by MUTE while muted) tints the label `#FF8AC7`.

- [ ] **Step 1: Rewrite the component**

```tsx
'use client'

import { useState } from 'react'
import { PILL_FACE, PILL_SHADOW, pressedStyle } from './theme'

/** Wide molded rubber pill with its label engraved inside (SOCIALS / INVENTORY / MUTE / ?). */
export default function PillBtn({
  label, onPress, height = 30, active = false,
}: { label: string; onPress: () => void; height?: number; active?: boolean }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      aria-label={label}
      onPointerDown={(e) => { e.preventDefault(); setPressed(true); onPress() }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        height, padding: `0 ${Math.round(height * 0.7)}px`, border: 'none',
        borderRadius: height / 2,
        background: PILL_FACE, boxShadow: PILL_SHADOW,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', touchAction: 'manipulation',
        fontFamily: 'sans-serif', fontWeight: 800,
        fontSize: Math.max(9, Math.round(height * 0.34)), letterSpacing: 1.5,
        color: active ? '#FF8AC7' : 'rgba(255,255,255,0.78)',
        textShadow: '0 -1px 1px rgba(0,0,0,0.85), 0 1px 1px rgba(255,255,255,0.1)',
        transition: 'transform 60ms, box-shadow 60ms',
        ...(pressed ? pressedStyle(PILL_SHADOW) : null),
      }}
    >
      {label}
    </button>
  )
}
```

- [ ] **Step 2: Verify** — `npm test`; note `GameBoyShell` still passes `Btn` labels to PillBtn — it will error under `tsc` until Task 6. Confirm no errors inside `PillBtn.tsx` itself.

- [ ] **Step 3: Commit**

```bash
git add components/shell/PillBtn.tsx
git commit -m "feat(shell): engraved-label utility pill"
```

---

### Task 6: SystemOverlay — socials + how-to-play

**Files:**
- Modify: `components/shell/SystemOverlay.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `export default function SystemOverlay({ kind, mobile, onClose }: { kind: 'social' | 'help'; mobile: boolean; onClose: () => void })` — `kind` renamed from `'keys'` to `'help'`; content updated to the final control set.

- [ ] **Step 1: Update the component**

Change the prop type to `kind: 'social' | 'help'`, the heading ternary to `kind === 'social' ? 'SOCIALS' : 'HOW TO PLAY'`, and the key legend (`SystemOverlay.tsx:22-24`) to:

```tsx
const keys: [string, string][] = mobile
  ? [['D-PAD', 'Walk (hold)'], ['A', 'Interact / Confirm'], ['B', 'Run (hold) / Back']]
  : [['ARROWS', 'Walk (hold)'], ['Z', 'Interact / Confirm'], ['X', 'Run (hold) / Back']]
```

The socials list (`Instagram / YouTube / TikTok`) stays as is. The render branch swaps `kind === 'keys'` for `kind === 'help'` (it's currently the `else` branch, so only the prop type and heading change).

- [ ] **Step 2: Verify** — `npm test`; no type errors in this file.

- [ ] **Step 3: Commit**

```bash
git add components/shell/SystemOverlay.tsx
git commit -m "feat(shell): how-to-play overlay content for final control set"
```

---

### Task 7: GameBoyShell — three ink layouts, delete ConsoleUtilityStrip

The core rewrite. All three layouts per the spec; utilities placed per layout; MENU/SELECT/START and `useControlScale` removed; `ConsoleUtilityStrip.tsx` deleted.

**Files:**
- Modify: `components/GameBoyShell.tsx` (full rewrite, 269 lines)
- Delete: `components/shell/ConsoleUtilityStrip.tsx`

**Interfaces:**
- Consumes: `Btn`, `UtilityAction`, `UTILITY_LABELS` from `@/lib/controls`; all of `./shell/theme`; `DPad` + `HoldHandlers` (Task 3), `RoundBtn` (Task 4), `PillBtn` (Task 5), `SystemOverlay` (Task 6); `ShellLayout` from `@/lib/useShellLayout` (unchanged).
- Produces (page.tsx contract — note the prop rename): 

```tsx
export default function GameBoyShell({
  screen, onPress, onRelease, layout, onInventory, muted, onToggleMute, onOverlayChange,
}: {
  screen: ReactNode
  onPress: (b: Btn) => void
  onRelease?: (b: Btn) => void
  layout: ShellLayout
  onInventory: () => void
  muted: boolean
  onToggleMute: () => void
  onOverlayChange?: (open: boolean) => void
})
export type { Btn }
```

Same prop names as today — `app/page.tsx:386-394` keeps working, except any `Btn` values it sends must be in the reduced set (Task 8 fixes the keymap).

- [ ] **Step 1: Rewrite `GameBoyShell.tsx`**

Structure (write it exactly in this shape; reuse today's overlay/press/hold plumbing from `GameBoyShell.tsx:103-146` minus MENU/SELECT/START):

```tsx
'use client'

import { Press_Start_2P } from 'next/font/google'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { Btn, UtilityAction } from '@/lib/controls'
import { UTILITY_LABELS } from '@/lib/controls'
import type { ShellLayout } from '@/lib/useShellLayout'
import DPad from './shell/DPad'
import PillBtn from './shell/PillBtn'
import RoundBtn from './shell/RoundBtn'
import SystemOverlay from './shell/SystemOverlay'
import { INK_BODY, INK_CREASES, SCREEN_GLASS, WORDMARK_PINK } from './shell/theme'

export type { Btn }

const pressStart = Press_Start_2P({ weight: '400', subsets: ['latin'], display: 'swap' })

/** Speaker-dot motif on the ink body. */
function Dots({ width, height }: { width: number | string; height: number | string }) {
  return (
    <div style={{
      width, height,
      backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.32) 1.4px, transparent 1.4px)',
      backgroundSize: '8px 8px',
      WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 78%)',
      maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 78%)',
    }} />
  )
}

/** LCD in its black bezel with the flat SCR!PTS strip as the bezel's bottom band. */
function ScreenModule({ children, overlay, stripHeight = 26, style = {} }: {
  children: ReactNode; overlay: ReactNode; stripHeight?: number; style?: React.CSSProperties
}) {
  return (
    <div style={{ background: '#000', display: 'flex', flexDirection: 'column', ...style }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'linear-gradient(160deg, #E2E2DE 0%, #D6D6D2 100%)' }}>
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
```

Then the main component. Key implementation points (each is a spec requirement):

1. **State/handlers:** keep `overlayKind: 'social' | 'help' | null`, `setOverlay`/`closeOverlay`/`onOverlayChange` exactly as today (`GameBoyShell.tsx:103-119`), with `'keys'` renamed `'help'`. Keyboard close listens for `KeyX`/`Escape` as today (`:122-129`).
2. **press/hold plumbing:** keep `press`/`release`/`hold` (`:131-142`); in `press` and `pressPlain`, an open overlay is closed by `B` or `A` (drop the `START` case).
3. **Utility dispatch:**

```tsx
const onUtility = (a: UtilityAction) => {
  if (a === 'inventory') { closeOverlay(); onInventory(); return }
  if (a === 'mute') { onToggleMute(); return }
  setOverlay(a === 'social' ? 'social' : 'help')
}
const utilityPills = (height: number) => (
  <>
    <PillBtn label={UTILITY_LABELS.social} height={height} onPress={() => onUtility('social')} />
    <PillBtn label={UTILITY_LABELS.inventory} height={height} onPress={() => onUtility('inventory')} />
    <PillBtn label={UTILITY_LABELS.mute} height={height} active={muted} onPress={() => onUtility('mute')} />
    <PillBtn label={UTILITY_LABELS.help} height={height} onPress={() => onUtility('help')} />
  </>
)
```

4. **Root style:** `background: INK_BODY` plus a creases layer `<div style={{ position:'absolute', inset:0, pointerEvents:'none', background: INK_CREASES }} />` inside each layout root; keep today's `userSelect`/`touchAction` suppressions (`:158-161`).
5. **Desktop layout** (`layout === 'desktop'`): column flex, `height: '100dvh'`. ScreenModule in a wrapper with `margin: '2.5% 1.6% 0'`, `flex: 1`, `borderRadius: 14`, `overflow: 'hidden'`, `boxShadow: '0 10px 26px rgba(0,0,0,0.55)'`, `stripHeight: 26`. Below it a rail: `display:flex; justifyContent:center; gap:18px; padding:'10px 0 calc(10px + env(safe-area-inset-bottom))'` containing `utilityPills(30)`.
6. **Landscape layout:** root `position: relative; height: 100dvh`. Bezel: `position:'absolute', left:'13%', right:'13%', top:0, bottom:'4%'`, `borderRadius:'0 0 16px 16px'`, ScreenModule filling it (`stripHeight: 22`). Left flank (absolute, `left:0, width:'13%', top:0, bottom:0`, column flex, `alignItems:'center'`, `paddingTop:'max(12px, env(safe-area-inset-top))'`, `paddingLeft:'env(safe-area-inset-left)'`): SOCIALS + INVENTORY pills (height 24) stacked with 8px gap at top; `<div style={{flex:1, display:'flex', alignItems:'center'}}>` holding `<DPad size={dpadSize} hold={hold} />`; `<Dots width={40} height={26} />` at the bottom with 10px margin. Right flank mirrors it: MUTE + ? pills, then the A/B cluster (`position:'relative'`, width `absSize * 2.1`, height `absSize * 1.8`, A absolute top-right, B absolute bottom-left, `<RoundBtn size={absSize} />`), then Dots. Sizes: `const dpadSize = 'min(20vh, 11vw)'` won't work (DPad takes a number) — instead compute from the viewport with the existing resize-listener pattern: `const [vw, vh] = useViewport()` helper in this file (`useState` + resize listener returning `[innerWidth, innerHeight]`), then `const dpadSize = Math.max(96, Math.min(0.20 * vh, 0.115 * vw))` and `const absSize = Math.max(56, Math.min(0.13 * vh, 0.075 * vw))`. These clamps keep ≥40px touch targets everywhere down to 320px-tall viewports and can never exceed the 13% flank + overhang budget.
7. **Portrait layout:** column flex, `height: 100dvh`. ScreenModule with `height: '52%'` (`stripHeight: 24`, strip has `borderRadius: '0 0 16px 16px'` via a wrapper `overflow:hidden`). Deck fills the rest (`position:'relative'`, ink + creases): `<DPad size={Math.min(0.36 * vw, 150)} />` absolute `left:'7%', top:'14%'`; A/B cluster absolute `right:'6%', top:'16%'` with `absSize = Math.min(0.24 * vw, 100)`; utility row absolute `left:0, right:0, bottom:'calc(4% + env(safe-area-inset-bottom))'`, centred flex `gap:8`, `utilityPills(Math.max(24, Math.min(0.075 * vw, 32)))`; `<Dots width={34} height={24} />` absolute `right:'6%'` above the pills.
8. Delete `useControlScale`, `Grille`, all MENU/SELECT/START rendering, and the import of `ConsoleUtilityStrip`.

- [ ] **Step 2: Delete the strip**

```bash
git rm components/shell/ConsoleUtilityStrip.tsx
```

- [ ] **Step 3: Verify compile + tests** — `npx tsc --noEmit` clean **except** any `app/page.tsx` errors from the shrunk `Btn` union (fixed next task; if there are none, fine). `npm test` passes.

- [ ] **Step 4: Visual sweep** — dev server on 3123, devtools responsive mode at 320×568, 390×844, 568×320, 844×390, 768×1024, 1024×768, 1440×900. Assert: no control clips outside the viewport; utilities present on every layout; wordmark on the strip everywhere.

- [ ] **Step 5: Commit**

```bash
git add components/GameBoyShell.tsx
git commit -m "feat(shell): ink Delta-style layouts, utilities everywhere, proportional geometry"
```

---

### Task 8: page.tsx integration — keymap + START/SELECT removal

**Files:**
- Modify: `app/page.tsx` (keymap at `:128`, button handling at `:245-260`)

**Interfaces:**
- Consumes: `KEY_TO_BTN` from `@/lib/controls`; `Btn` via `@/components/GameBoyShell` (unchanged import at `:7`).

- [ ] **Step 1: Replace the keyboard map**

`app/page.tsx:128` area currently maps `START: "Enter"` (plus arrows/Z/X). Replace the local key-mapping logic with `KEY_TO_BTN` from `@/lib/controls` — delete the `START`/`SELECT`/`Enter`/`Shift` entries entirely. Keep the existing listener structure; only the lookup table changes.

- [ ] **Step 2: Remap START behaviours to the final set**

- `:248` `if (b === "A" || b === "B" || b === "START") advanceMessage();` → `if (b === "A" || b === "B") advanceMessage();`
- `:251` `else if (b === "A" || b === "START")` → `else if (b === "A")`
- `:260` `if (b === "A" || b === "START") setStarted(true);` → `if (b === "A") setStarted(true);`

Search the file for any remaining `START`/`SELECT`/`MENU` string literals and remove them.

- [ ] **Step 3: Verify** — `npx tsc --noEmit` fully clean; `npm test` passes; `npm run lint` clean.

- [ ] **Step 4: Playthrough check** — dev server: keyboard Z advances the start screen and dialogue; X runs/backs; arrows walk; ? pill opens how-to-play showing Z/X/arrows; MUTE pill tints pink while muted; INVENTORY pill routes to `/inventory`; SOCIALS pill lists the three links; B/X/ESC closes overlays. Repeat the essential taps in devtools touch emulation (portrait + landscape).

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "feat(game): final control set — Z/X/arrows only, START/SELECT removed"
```

---

### Task 9: Docs sync + final sweep

**Files:**
- Modify: `PRD.md` (Change Log + any control/shell description), `BRAND.md` only if it references the old shell (check; likely no change).

- [ ] **Step 1: Update PRD.md** — add a Change Log line: `2026-07-28 — Console shell redesigned (ink Delta-style, D-pad/A/B + SOCIALS/INVENTORY/MUTE/? pills; SELECT/START/MENU removed).` Update any section describing the old controls.
- [ ] **Step 2: Full verification** — `npm test && npm run lint && npx tsc --noEmit && npm run build` all clean.
- [ ] **Step 3: Final visual sweep** — the eight viewports from Task 7 Step 4, plus one real-device check if available.
- [ ] **Step 4: Commit**

```bash
git add PRD.md
git commit -m "docs: PRD change log for console shell redesign"
```

---

## Self-Review Notes

- **Spec coverage:** design language → Tasks 2-5; button kit → 3-5; final control set + keymap → 1, 8; geometry rule → 7 (clamped viewport-derived sizes, safe-area insets, percentage anchors); three layouts → 7; overlays → 6, 7; utility placement → 7; docs-sync requirement from CLAUDE.md → 9; START/SELECT audit → 8 Step 2 (all three occurrences located at `page.tsx:248,251,260`).
- **Type consistency:** `Btn` defined once in Task 1 and consumed by 3, 4, 7, 8; `UtilityAction`/`UTILITY_LABELS` defined in 1, consumed in 7; `pressedStyle(baseShadow: string)` defined in 2, consumed in 4, 5; `SystemOverlay` `kind: 'social' | 'help'` defined in 6, consumed in 7.
- **Known compile-order caveat:** Tasks 3-6 leave `GameBoyShell.tsx` temporarily broken under `tsc` (it still references removed Btn values) — each task's verify step scopes the check to its own files; Task 7 restores a clean tree. Tests (`npm test`) stay green throughout because no test imports the shell components.
