# Speech Window Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin the in-world dialogue box to SCR!PTS brand tokens + Pixel Operator Bold, unify the name tab and Yes/No box into one chip on the window's top edge, and give the typewriter hold-to-fast-forward plus a pause on sentence punctuation.

**Architecture:** `components/DialogPrompt.tsx` stays a single presentational overlay pinned to the bottom of the Game Boy LCD; the page (`app/page.tsx`) still owns all prompt state and advancing. Timing is factored into a pure `lib/dialogTiming.ts` helper so it is unit-testable. A new `app/fonts.ts` exposes Pixel Operator as a `next/font/local` face. The Phaser `···` bubble (`WorldScene.showTalkBubble`) is recoloured to match.

**Tech Stack:** Next.js 15 (App Router), React 18, TypeScript, `next/font/local`, Phaser 3, Vitest + jsdom.

**Spec:** `docs/superpowers/specs/2026-09-03-speech-window-redesign-design.md`

## Global Constraints

- **Colour tokens (from `BRAND.md`, use verbatim, invent none):** ink `#0D0D0D`, paper `#F7F7F5`, primary pink `#FF8AC7`, deeper pink `#FF4FA3`, grey `#6F6F73`.
- **Font:** Pixel Operator Bold for all game-world text in this component. Source files: `~/Downloads/pixel_operator/PixelOperator-Bold.ttf` and `~/Downloads/pixel_operator/PixelOperator.ttf` (SIL OFL).
- **Do not touch:** `PROMPTS`, the `app/page.tsx` prompt state machine (`prompt`, `page`, `sel`, `materialize`, `advanceMessage`, `choose`, `closePrompt`), routing, world data, or the other `Press_Start_2P` call-sites (`GameBoyShell`, `StartScreen`, `SystemOverlay`, `RoundBtn`).
- **Structure stays Pokémon-shaped:** bottom window, faceted (`stepCorners`) pixel corners, name chip, typewriter, two-press rhythm (a press mid-type completes the line; the next press advances), `···` bubble over the NPC.
- **Path alias:** `@/*` resolves `./src/*` then repo root. `@/lib/dialogTiming` → `lib/dialogTiming.ts`; `@/app/fonts` → `app/fonts.ts`.
- **Tests:** `npx vitest run` — the existing 225 must stay green. Typecheck: `./node_modules/.bin/tsc --noEmit`.

---

### Task 1: `nextDelay` timing helper

**Files:**
- Create: `lib/dialogTiming.ts`
- Test: `__tests__/dialogTiming.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `nextDelay(prev: string, next: string, held: boolean): number` and the exported constants `TYPE_BASE_MS = 18`, `TYPE_FF_MS = 4`, `PUNCT_PAUSE_MS = 90`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/dialogTiming.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { nextDelay, TYPE_BASE_MS, TYPE_FF_MS, PUNCT_PAUSE_MS } from "@/lib/dialogTiming";

describe("nextDelay", () => {
  it("uses the base rate between ordinary characters", () => {
    expect(nextDelay("a", "b", false)).toBe(TYPE_BASE_MS);
  });

  it("adds a pause after sentence punctuation", () => {
    for (const p of [".", "!", "?", "…"]) {
      expect(nextDelay(p, "A", false)).toBe(TYPE_BASE_MS + PUNCT_PAUSE_MS);
    }
  });

  it("pauses after punctuation even when the next char is a space", () => {
    expect(nextDelay(".", " ", false)).toBe(TYPE_BASE_MS + PUNCT_PAUSE_MS);
  });

  it("does not pause mid-ellipsis (dot followed by dot)", () => {
    expect(nextDelay(".", ".", false)).toBe(TYPE_BASE_MS);
  });

  it("pauses at end of string after punctuation", () => {
    expect(nextDelay("?", "", false)).toBe(TYPE_BASE_MS + PUNCT_PAUSE_MS);
  });

  it("does not pause after a comma or a letter", () => {
    expect(nextDelay(",", " ", false)).toBe(TYPE_BASE_MS);
    expect(nextDelay("t", "e", false)).toBe(TYPE_BASE_MS);
  });

  it("fast-forwards to a flat rate while held, ignoring punctuation pauses", () => {
    expect(nextDelay("a", "b", true)).toBe(TYPE_FF_MS);
    expect(nextDelay(".", "A", true)).toBe(TYPE_FF_MS);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/dialogTiming.test.ts`
Expected: FAIL — cannot resolve `@/lib/dialogTiming`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/dialogTiming.ts`:

```ts
/** Base delay between revealed characters (ms). */
export const TYPE_BASE_MS = 18;
/** Delay while the confirm button is held — a flat skim through the line (ms). */
export const TYPE_FF_MS = 4;
/** Extra beat after sentence-ending punctuation so lines breathe (ms). */
export const PUNCT_PAUSE_MS = 90;

const PAUSE_CHARS = new Set([".", "!", "?", "…"]);

/**
 * Delay before revealing the next character.
 *
 * @param prev  the character just revealed ("" before the first character)
 * @param next  the character about to be revealed ("" at end of the string)
 * @param held  whether the confirm button is currently held (fast-forward)
 *
 * Held wins outright. Otherwise a sentence-ending mark earns a pause, unless the
 * next character is also one (so "..." and "?!" don't stack pauses mid-run).
 */
export function nextDelay(prev: string, next: string, held: boolean): number {
  if (held) return TYPE_FF_MS;
  if (PAUSE_CHARS.has(prev) && !PAUSE_CHARS.has(next)) {
    return TYPE_BASE_MS + PUNCT_PAUSE_MS;
  }
  return TYPE_BASE_MS;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/dialogTiming.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/dialogTiming.ts __tests__/dialogTiming.test.ts
git commit -m "Add nextDelay dialogue-typewriter timing helper"
```

---

### Task 2: Pixel Operator local font module

**Files:**
- Create: `app/fonts/PixelOperator-Bold.ttf` (copied binary)
- Create: `app/fonts/PixelOperator.ttf` (copied binary)
- Create: `app/fonts.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `export const pixelOperator` — a `next/font/local` object with `.className` and `.variable` (`--font-pixel-operator`); weight 400 maps to `PixelOperator.ttf`, weight 700 to `PixelOperator-Bold.ttf`.

- [ ] **Step 1: Copy the font binaries into the repo**

Run:

```bash
mkdir -p app/fonts
cp ~/Downloads/pixel_operator/PixelOperator-Bold.ttf app/fonts/
cp ~/Downloads/pixel_operator/PixelOperator.ttf app/fonts/
ls -l app/fonts
```

Expected: both `.ttf` files listed, ~17 KB each.

- [ ] **Step 2: Create the font module**

Create `app/fonts.ts`:

```ts
import localFont from "next/font/local";

/**
 * Pixel Operator — the game-world text face per BRAND.md. Bold (700) is the
 * brand call for dialogue, menus, and names; 400 is kept available for future
 * call-sites. Shared here so other shell components can adopt it without
 * re-wiring the font.
 */
export const pixelOperator = localFont({
  src: [
    { path: "./fonts/PixelOperator.ttf", weight: "400", style: "normal" },
    { path: "./fonts/PixelOperator-Bold.ttf", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-pixel-operator",
});
```

- [ ] **Step 3: Typecheck and build**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: exit 0.

Run: `npm run build`
Expected: build completes with no font-resolution error (Next reports the two `PixelOperator*.ttf` under "Route (app)" font assets or simply builds clean).

- [ ] **Step 4: Commit**

```bash
git add app/fonts.ts app/fonts/PixelOperator-Bold.ttf app/fonts/PixelOperator.ttf
git commit -m "Add Pixel Operator as a shared local font"
```

---

### Task 3: Redesign `DialogPrompt`

**Files:**
- Modify: `components/DialogPrompt.tsx` (full rewrite below)

**Interfaces:**
- Consumes: `nextDelay` from `@/lib/dialogTiming` (Task 1); `pixelOperator` from `@/app/fonts` (Task 2).
- Produces: `DialogPrompt` gains one optional prop — `heldRef?: React.RefObject<boolean>` — read live by the typewriter each tick to fast-forward. `DialogPromptHandle` (`skipTyping`) is unchanged. All existing props (`text`, `variant`, `speaker`, `mobile`, `sel`, `onChoose`, `onAdvance`) keep their signatures.

- [ ] **Step 1: Rewrite the component**

Replace the entire contents of `components/DialogPrompt.tsx` with:

```tsx
'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { pixelOperator } from '@/app/fonts'
import { nextDelay } from '@/lib/dialogTiming'

// SCR!PTS brand tokens (BRAND.md). The window keeps the Pokémon shape — bottom
// bar, faceted pixel corners, name chip, typewriter — but is skinned in these,
// not the FireRed navy/pale-blue it used to lift.
const INK = '#0D0D0D'
const PINK = '#FF8AC7'
const PINK_DEEP = '#FF4FA3'
const PAPER = '#F7F7F5'
const GREY = '#6F6F73'

/** Pixel-cut corner clip-path: `cut` px chopped off each of the 4 corners. */
const stepCorners = (cut: number): React.CSSProperties['clipPath'] =>
  `polygon(0 ${cut}px, ${cut}px ${cut}px, ${cut}px 0, calc(100% - ${cut}px) 0, ` +
  `calc(100% - ${cut}px) ${cut}px, 100% ${cut}px, 100% calc(100% - ${cut}px), ` +
  `calc(100% - ${cut}px) calc(100% - ${cut}px), calc(100% - ${cut}px) 100%, ` +
  `${cut}px 100%, ${cut}px calc(100% - ${cut}px), 0 calc(100% - ${cut}px))`

/** Three nested layers fake a chunky pixel-art window border: ink → pink rule → paper. */
function PixelFrame({
  cut = 6,
  style,
  contentStyle,
  children,
}: {
  cut?: number
  style?: React.CSSProperties
  contentStyle?: React.CSSProperties
  children: React.ReactNode
}) {
  return (
    <div style={{ background: INK, clipPath: stepCorners(cut), boxShadow: '2px 2px 0 rgba(0,0,0,0.35)', ...style }}>
      <div style={{ background: PINK, clipPath: stepCorners(Math.max(cut - 2, 0)), margin: 3 }}>
        <div style={{ background: PAPER, clipPath: stepCorners(Math.max(cut - 3, 0)), margin: 2, ...contentStyle }}>
          {children}
        </div>
      </div>
    </div>
  )
}

/** A chip riding the top edge of the window — used for the name tab and the YES/NO box. */
function Chip({
  offset,
  contentStyle,
  children,
}: {
  offset: React.CSSProperties
  contentStyle?: React.CSSProperties
  children: React.ReactNode
}) {
  return (
    <div style={{ position: 'absolute', bottom: '100%', zIndex: 3, ...offset }}>
      <PixelFrame cut={3} contentStyle={contentStyle}>{children}</PixelFrame>
    </div>
  )
}

/** Blocky (non-anti-aliased) down-chevron — the classic GBA "more text" cue. */
function PixelArrowDown({ size = 8, color = INK }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden>
      <rect x="0" y="0" width="7" height="1" fill={color} />
      <rect x="1" y="1" width="5" height="1" fill={color} />
      <rect x="2" y="2" width="3" height="1" fill={color} />
      <rect x="3" y="3" width="1" height="1" fill={color} />
    </svg>
  )
}

/** Blocky right-pointing selector triangle for the YES/NO menu. */
function PixelArrowRight({ size = 8, color = INK }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden>
      <rect x="0" y="0" width="1" height="7" fill={color} />
      <rect x="1" y="1" width="1" height="5" fill={color} />
      <rect x="2" y="2" width="1" height="3" fill={color} />
      <rect x="3" y="3" width="1" height="1" fill={color} />
    </svg>
  )
}

/**
 * Two size presets. Pixel Operator is a compact pixel *text* face (far denser
 * than Press Start 2P), so the window can run larger type and still fit: the
 * phone LCD reads at ~15px, the desktop LCD at ~19px.
 */
const SIZES = {
  mobile: {
    margin: '0 8px 8px', boxPad: '11px 14px', boxMinH: 50,
    bodyFont: 15, bodyLine: 1.4,
    chipFont: 11, chipPad: '2px 9px', chipOverlap: 8,
    menuRight: 8, menuPad: '6px 14px 6px 8px', menuGap: 4, menuFont: 15,
    arrow: 9, blinkRight: 12, blinkBottom: 8,
  },
  desktop: {
    margin: '0 14px 14px', boxPad: '15px 20px', boxMinH: 64,
    bodyFont: 19, bodyLine: 1.4,
    chipFont: 14, chipPad: '3px 12px', chipOverlap: 9,
    menuRight: 10, menuPad: '7px 18px 7px 10px', menuGap: 6, menuFont: 18,
    arrow: 11, blinkRight: 14, blinkBottom: 9,
  },
} as const

export interface DialogPromptHandle {
  /** If mid-typewriter, snap to full text and report true (caller should stop
   * there — one press reveals, the next advances). False if nothing to skip. */
  skipTyping: () => boolean
}

/**
 * In-world dialogue overlay, SCR!PTS-skinned. Two variants:
 *  - `choice`  → text box + YES/NO chip on the top-right edge
 *  - `message` → text box only + blinking ▼ advance arrow
 * Text reveals letter-by-letter; while `heldRef.current` is true it skims. The
 * page owns selection / advancing; clicking (or `skipTyping` via keyboard) drives it.
 */
const DialogPrompt = forwardRef<DialogPromptHandle, {
  text: string
  variant?: 'choice' | 'message'
  /** Name chip above the box (e.g. "HEATH"); omitted for anonymous/system prompts. */
  speaker?: string
  /** Phone LCD keeps the compact sizing; desktop LCD scales the window up. */
  mobile?: boolean
  /** Live "confirm button held" flag — fast-forwards the typewriter. */
  heldRef?: React.RefObject<boolean>
  sel?: 'yes' | 'no'
  onChoose?: (choice: 'yes' | 'no') => void
  onAdvance?: () => void
}>(function DialogPrompt({ text, variant = 'choice', speaker, mobile = true, heldRef, sel = 'yes', onChoose, onAdvance }, ref) {
  const s = mobile ? SIZES.mobile : SIZES.desktop
  const [typed, setTyped] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setTyped(0)
    if (timerRef.current) clearTimeout(timerRef.current)
    let n = 0
    const step = () => {
      if (n >= text.length) return
      n += 1
      setTyped(n)
      if (n < text.length) {
        const d = nextDelay(text[n - 1] ?? '', text[n] ?? '', heldRef?.current ?? false)
        timerRef.current = setTimeout(step, d)
      }
    }
    timerRef.current = setTimeout(step, nextDelay('', text[0] ?? '', heldRef?.current ?? false))
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [text, heldRef])

  useImperativeHandle(ref, () => ({
    skipTyping: () => {
      if (typed < text.length) {
        setTyped(text.length)
        if (timerRef.current) clearTimeout(timerRef.current)
        return true
      }
      return false
    },
  }), [typed, text.length])

  const done = typed >= text.length

  const advanceOrSkip = () => {
    if (!done) {
      setTyped(text.length)
      if (timerRef.current) clearTimeout(timerRef.current)
      return
    }
    onAdvance?.()
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 20,
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      pointerEvents: 'none',
    }}>
      <style>{`@keyframes scr-blink{0%,49%{opacity:1}50%,100%{opacity:0}}`}</style>

      {/* Dialogue text box (name + YES/NO chips ride its top edge) */}
      <div
        onClick={variant === 'message' ? advanceOrSkip : undefined}
        style={{
          margin: s.margin, position: 'relative',
          pointerEvents: variant === 'message' ? 'auto' : 'none',
          cursor: variant === 'message' ? 'pointer' : 'default',
        }}
      >
        {speaker && (
          <Chip offset={{ left: 10, marginBottom: -s.chipOverlap }} contentStyle={{ padding: s.chipPad }}>
            <span className={pixelOperator.className} style={{ fontWeight: 700, fontSize: s.chipFont, color: INK, letterSpacing: '0.05em' }}>
              {speaker.toUpperCase()}
            </span>
          </Chip>
        )}

        <PixelFrame contentStyle={{ padding: s.boxPad, minHeight: s.boxMinH }}>
          <span className={pixelOperator.className} style={{ fontWeight: 700, fontSize: s.bodyFont, lineHeight: s.bodyLine, color: INK, whiteSpace: 'pre-wrap' }}>
            {text.slice(0, typed)}
          </span>
          {variant === 'message' && done && (
            <span aria-hidden style={{
              position: 'absolute', right: s.blinkRight, bottom: s.blinkBottom,
              animation: 'scr-blink 0.8s steps(1) infinite',
            }}>
              <PixelArrowDown size={s.arrow} color={PINK_DEEP} />
            </span>
          )}
        </PixelFrame>

        {/* YES / NO — its own chip on the top-right edge, same recipe as the name chip */}
        {variant === 'choice' && (
          <Chip offset={{ right: s.menuRight, marginBottom: -s.chipOverlap }} contentStyle={{ padding: s.menuPad }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: s.menuGap }}>
              {(['yes', 'no'] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => onChoose?.(opt)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    pointerEvents: 'auto',
                  }}
                >
                  <span style={{ width: s.arrow, display: 'flex', visibility: sel === opt ? 'visible' : 'hidden' }}>
                    <PixelArrowRight size={s.arrow} color={PINK_DEEP} />
                  </span>
                  <span className={pixelOperator.className} style={{ fontWeight: 700, fontSize: s.menuFont, color: sel === opt ? INK : GREY }}>
                    {opt.toUpperCase()}
                  </span>
                </button>
              ))}
            </div>
          </Chip>
        )}
      </div>
    </div>
  )
})

export default DialogPrompt
```

- [ ] **Step 2: Typecheck**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Run the existing suite**

Run: `npx vitest run`
Expected: all tests pass (226 total — the 225 existing plus Task 1's file). No test imports `DialogPrompt`, so the new `@/app/fonts` import is not exercised by Vitest; if a future test does import it, add `"@/app": fileURLToPath(new URL("./app", import.meta.url))` to `vitest.config.ts` `resolve.alias`.

- [ ] **Step 4: Manual browser check**

Start the dev server (`npm run dev`) and open `http://localhost:3000`.

Desktop viewport (~1280×800):
1. Start the game, clear the Heath intro. Confirm: black `#0D0D0D` border, a thin pink `#FF8AC7` inner rule, off-white fill, body text in Pixel Operator Bold at ~19px (clearly heavier/rounder than the old Press Start 2P, and readable), a pink `#FF4FA3` ▼ blinking bottom-right, the `HEATH` chip riding the top-left edge.
2. Walk to a floor NPC (Teo / TP / Karl) and talk. Confirm the name chip and the line render as above; the typewriter has a visible beat after each `.`.
3. Walk to a clothing rack and interact ("View the inventory?"). Confirm: a YES/NO chip on the top-**right** edge using the same ink→pink→paper recipe as the name chip; the selected row shows a pink ▶ and black label, the other row is grey with no ▶; arrow keys toggle the selection; the chip does not overlap the name chip.

Mobile viewport (~390×844, triggers the mobile shell):
4. Repeat 1–3. Confirm the window uses the compact preset (~15px body), still readable, chips still clear the frame, nothing clipped by the LCD edge.

- [ ] **Step 5: Commit**

```bash
git add components/DialogPrompt.tsx
git commit -m "Redesign DialogPrompt: brand tokens, Pixel Operator, unified top-edge chips"
```

---

### Task 4: Wire the confirm-held flag in `app/page.tsx`

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `DialogPrompt`'s new `heldRef` prop (Task 3).
- Produces: nothing new for later tasks.

Context: `app/page.tsx` already has `handlePress(b: Btn)` / `handleRelease(b: Btn)` (mobile on-screen buttons) and a prompt-open `useEffect` that adds a `keydown` listener (desktop). The confirm button is `"A"` (`z` / `Enter` on desktop, the A button on mobile). There is currently **no** desktop `keyup` handling.

- [ ] **Step 1: Add the held ref**

Near the other refs (just after `const dialogRef = useRef<DialogPromptHandle>(null);`), add:

```tsx
  // True while the confirm button (A / Z) is held during a speech prompt — read
  // live by DialogPrompt's typewriter to fast-forward. A ref, not state, so
  // every keydown/up doesn't re-render the game.
  const confirmHeldRef = useRef(false);
```

- [ ] **Step 2: Set / clear it from the mobile button handlers**

In `handlePress`, inside the `if (prompt) { ... }` block, in the `if (inMessagePhase)` branch, set the flag before advancing:

```tsx
        if (inMessagePhase) {
          // Speech: A / B advance pages. Arrows do nothing.
          if (b === "A") confirmHeldRef.current = true;
          if (b === "A" || b === "B") advanceMessage();
        }
```

In `handleRelease`, add a line at the top of the callback body (before the `const code = CODE[b];` line):

```tsx
      if (b === "A") confirmHeldRef.current = false;
```

- [ ] **Step 3: Set / clear it from the desktop key listeners**

In the prompt-open `useEffect` (`useEffect(() => { if (!prompt) return; const onKey = ... }, [prompt, inMessagePhase, sel, choose, advanceMessage, toggleSel]);`):

In `onKey`, in the `if (inMessagePhase) { ... }` branch, set the flag on the confirm key:

```tsx
      if (inMessagePhase) {
        // Speech: A / B advance pages; Escape too (mirrors B). Arrows ignored.
        if (b === "A" || b === "B" || e.key === "Escape") {
          e.preventDefault();
          if (b === "A") confirmHeldRef.current = true;
          advanceMessage();
        }
        return;
      }
```

Add a `keyup` listener alongside the existing `keydown` one, and clear on cleanup:

```tsx
    const onKeyUp = (e: KeyboardEvent) => {
      if (keyToBtn(e) === "A") confirmHeldRef.current = false;
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
      confirmHeldRef.current = false;
    };
```

- [ ] **Step 4: Clear it whenever a prompt closes**

In `closePrompt`, add a line in the callback body (e.g. right after `sfx.play("collapse");`):

```tsx
    confirmHeldRef.current = false;
```

- [ ] **Step 5: Pass the ref to both `DialogPrompt` usages**

In the `screen` JSX, add `heldRef={confirmHeldRef}` to both `<DialogPrompt>` elements (the `variant="choice"` one and the `variant="message"` one), next to `mobile={mobile}`:

```tsx
          <DialogPrompt
            ref={dialogRef}
            variant="choice"
            text={btnify(prompt.question)}
            mobile={mobile}
            heldRef={confirmHeldRef}
            speaker={prompt.speaker}
            sel={sel}
            onChoose={choose}
          />
```

```tsx
          <DialogPrompt
            ref={dialogRef}
            variant="message"
            text={btnify(prompt.pages[page])}
            mobile={mobile}
            heldRef={confirmHeldRef}
            speaker={prompt.speaker}
            onAdvance={advanceMessage}
          />
```

- [ ] **Step 6: Typecheck and test**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: exit 0.

Run: `npx vitest run`
Expected: all pass, unchanged count.

- [ ] **Step 7: Manual browser check**

`npm run dev`, `http://localhost:3000`.

- Desktop: trigger a long line (the Heath intro's first page). Let it type normally — note the speed. Reload, trigger again, and **hold `Z`** — the text should race to the end (~4 ms/char) and stop; releasing `Z` before the end returns the remaining characters to normal speed. The first press still completes the line, the next still advances (two-press rhythm intact).
- Mobile viewport: same, holding the on-screen **A** button.
- Confirm a normal single tap of A/Z still advances pages exactly as before (no double-advance, no stuck fast-forward after release).

- [ ] **Step 8: Commit**

```bash
git add app/page.tsx
git commit -m "Wire confirm-held flag so holding A/Z fast-forwards dialogue"
```

---

### Task 5: Recolour the `···` talk bubble

**Files:**
- Modify: `src/game/scenes/WorldScene.ts` (the `showTalkBubble` method)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing.

- [ ] **Step 1: Swap the hex values**

In `showTalkBubble`, the graphics block currently reads:

```ts
    g.fillStyle(0x1f2a44, 1).fillRect(-w / 2 - 2, -h - 2, w + 4, h + 4);
    g.fillStyle(0xf8f8f8, 1).fillRect(-w / 2, -h, w, h);
    // little tail pointing down at the head
    g.fillStyle(0x1f2a44, 1).fillTriangle(-3, 0, 3, 0, 0, 5);
    g.fillStyle(0xf8f8f8, 1).fillTriangle(-2, -1, 2, -1, 0, 3);
    // three dots
    const d = Math.max(2, Math.round(ts * 0.09));
    g.fillStyle(0x384058, 1);
```

Replace the five `fillStyle` colours with the brand tokens (geometry unchanged):

```ts
    g.fillStyle(0x0d0d0d, 1).fillRect(-w / 2 - 2, -h - 2, w + 4, h + 4);
    g.fillStyle(0xf7f7f5, 1).fillRect(-w / 2, -h, w, h);
    // little tail pointing down at the head
    g.fillStyle(0x0d0d0d, 1).fillTriangle(-3, 0, 3, 0, 0, 5);
    g.fillStyle(0xf7f7f5, 1).fillTriangle(-2, -1, 2, -1, 0, 3);
    // three dots
    const d = Math.max(2, Math.round(ts * 0.09));
    g.fillStyle(0xff8ac7, 1);
```

- [ ] **Step 2: Typecheck and test**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: exit 0.

Run: `npx vitest run`
Expected: all pass, unchanged count.

- [ ] **Step 3: Manual browser check**

`npm run dev`, start the game, walk to Teo / TP / Karl and talk. The bubble above their head should be a black-outlined off-white box with **pink** dots and a black tail; it appears on talk and disappears when the dialogue closes (unchanged behaviour, new colours).

- [ ] **Step 4: Commit**

```bash
git add src/game/scenes/WorldScene.ts
git commit -m "Recolour the NPC talk bubble to brand tokens"
```

---

## Self-Review

**Spec coverage:**
- A. Pixel Operator shared local font → Task 2 (`app/fonts.ts`, binaries) + Task 3 (DialogPrompt consumes it). ✓
- B. Reskin to brand tokens → Task 3 (palette constants, `PixelFrame` colours, arrow colours, retuned `SIZES`). ✓
- C. Unify name tab + Yes/No into one top-edge chip → Task 3 (`Chip` component, both anchored `bottom: '100%'`, selected pink / other grey). ✓
- D. Pacing (`nextDelay`, 18 ms base, hold-to-fast-forward, punctuation pause) → Task 1 (helper + tests) + Task 3 (`setTimeout` typewriter reads `nextDelay` + `heldRef`) + Task 4 (`confirmHeldRef` wiring). ✓
- E. Recolour `···` bubble → Task 5. ✓
- Testing: `nextDelay` unit tests (Task 1); existing suite green (every task); manual browser matrix — flavour NPC, Yes/No, Heath intro, vinyl reveal (a `message` with no `speaker`, covered by Task 3 step 4.1's "clear the Heath intro" plus the no-speaker path exercised by any `message` variant), bubble (Task 5). ✓
- Out of scope respected: no other `Press_Start_2P` sites touched; no `PROMPTS` / routing / world-data changes. ✓

**Placeholder scan:** No TBD/TODO; every code step has literal content; no "similar to Task N". ✓

**Type consistency:** `nextDelay(prev, next, held)` — same signature in Task 1's impl, Task 1's tests, and Task 3's call site. `heldRef?: React.RefObject<boolean>` — declared in Task 3's props, created as `useRef(false)` and passed in Task 4. `confirmHeldRef` name identical across Task 4 steps. `pixelOperator` export name identical in Task 2 and Task 3. `timerRef` retyped to `ReturnType<typeof setTimeout>` and every `clearInterval` replaced with `clearTimeout` in the Task 3 rewrite. ✓
