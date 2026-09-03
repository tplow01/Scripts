# Speech Bubble Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the GBA-style dialogue window with a PokéMMO-style speech bubble — a fixed rounded bubble whose triangular tail (one seamless shape) leans toward whoever is speaking — and remove the `···` NPC marker.

**Architecture:** `components/DialogPrompt.tsx` is rewritten to draw the bubble body + tail as a single SVG `<path>` (seamless join, one drop shadow) with an HTML text layer over it, plus a detached dark Yes/No panel. `WorldScene` emits the speaking character's head position as viewport fractions once per conversation; `app/page.tsx` holds that as `speakerPos` state and passes it to `DialogPrompt`, which maps it onto its own measured pixel box to place the tail's apex. The typewriter, pacing helper (`lib/dialogTiming.ts` / `nextDelay`), and `confirmHeldRef` fast-forward wiring are unchanged.

**Tech Stack:** Next.js 15 (App Router), React 18, TypeScript, Phaser 3 (`Phaser.Scale.RESIZE`), Vitest + jsdom, Tailwind (`font-body` = `Inter, Geist, system-ui`; `--font-bebas` = Bebas Neue, both set in `app/layout.tsx`).

**Spec:** `docs/superpowers/specs/2026-09-03-speech-bubble-redesign-design.md`

## Global Constraints

- **Colours (verbatim, BRAND.md):** ink `#0D0D0D`, paper `#F7F7F5`, deeper pink `#FF4FA3`; Yes/No panel `#151515`. No other colours.
- **Dialogue text font:** inherit `font-body` (do **not** set a `fontFamily` on the text). Name label: `fontFamily: 'var(--font-bebas)'`.
- **Bubble is fixed:** constant width and top position; only the tail changes between speakers. Tail base width is constant where it meets the bubble; the tail narrows to a single point just above the speaker; body + tail are ONE filled path (no seam). Tail hidden when `speakerPos` is null or the speaker is not below the bubble.
- **Unchanged:** `lib/dialogTiming.ts`, `nextDelay` semantics, `confirmHeldRef` + the `e.repeat` guard in `app/page.tsx`, the two-press rhythm (`skipTyping` true only mid-type), `PROMPTS`, routing, `sel`/`toggleSel`/`choose`/`advanceMessage`/`closePrompt`'s other lines, world data.
- **Do not touch** the in-progress sound-system code (`sfx.*`) already present in `app/page.tsx` / `WorldScene.ts`.
- **Path alias:** `@/*` → `./src/*` then repo root. Tests: `npx vitest run` (233 must stay green). Typecheck: `./node_modules/.bin/tsc --noEmit`.
- **Event ordering:** `WorldScene` emits `"interaction"` (React builds the prompt and resets `speakerPos` to `null`) and THEN emits `"speaker"` with the real position — the `"speaker"` handler runs last and wins. Never emit `"speaker"` before `"interaction"` for the same talk.

---

### Task 1: `WorldScene` — emit the speaker position, remove the `···` marker

**Files:**
- Modify: `src/game/scenes/WorldScene.ts`

**Interfaces:**
- Consumes: `this.cameras.main.worldView` (a `Phaser.Geom.Rectangle`), `NpcActor.headAnchor` (`{ x: number; y: number }`), `this.staticNpcImgs` (`Map<string, { img: Phaser.GameObjects.Image; ... }>`).
- Produces: a game event `this.game.events.emit("speaker", frac)` where `frac` is `{ xFrac: number; yFrac: number }`, emitted immediately AFTER `this.fireInteraction(...)` when the speaker is an on-screen NPC. No `"speaker"` event for scripted Heath beats / racks / system prompts.

- [ ] **Step 1: Add the `speakerFrac` helper**

In `src/game/scenes/WorldScene.ts`, add this private method next to `talkToNpc` (just before `/** Start a conversation with a patrolling NPC` … `private talkToNpc`):

```ts
  /** A world point as a fraction of the camera viewport (0..1 across / down),
   *  resolution-independent so the React overlay can place a tail apex on it. */
  private speakerFrac(worldX: number, worldY: number): { xFrac: number; yFrac: number } {
    const v = this.cameras.main.worldView;
    return { xFrac: (worldX - v.x) / v.width, yFrac: (worldY - v.y) / v.height };
  }
```

- [ ] **Step 2: `talkToNpc` — drop the marker, emit the position**

Current body:

```ts
  private talkToNpc(npc: NpcActor) {
    npc.suspend();
    npc.faceTile(this.tileX, this.tileY);
    this.talkingTo = npc;
    const a = npc.headAnchor;
    this.showTalkBubble(a.x, a.y);
    const entry = this.room.interactions.find((i) => i.id === npc.id);
    if (entry) this.fireInteraction(entry);
  }
```

Replace with:

```ts
  private talkToNpc(npc: NpcActor) {
    npc.suspend();
    npc.faceTile(this.tileX, this.tileY);
    this.talkingTo = npc;
    const entry = this.room.interactions.find((i) => i.id === npc.id);
    if (entry) this.fireInteraction(entry);
    const a = npc.headAnchor;
    this.game.events.emit("speaker", this.speakerFrac(a.x, a.y));
  }
```

- [ ] **Step 3: `faceStaticNpc` — drop the marker call**

In `faceStaticNpc`, delete these two lines (they sit right after `if (!entry?.img.active) return;`):

```ts
    const b = entry.img.getBounds();
    this.showTalkBubble(entry.img.x, b.top);
```

(Leave the rest of `faceStaticNpc` — the `parseCharacterFrame` / facing logic — exactly as is.)

- [ ] **Step 4: `interactAhead` — emit the position for static NPCs**

Find this block (near the end of `interactAhead`):

```ts
    if (hit && !hit.target) {
      if (hit.type === "npc") this.faceStaticNpc(hit);
      this.fireInteraction(hit);
    }
```

Replace with:

```ts
    if (hit && !hit.target) {
      if (hit.type === "npc") this.faceStaticNpc(hit);
      this.fireInteraction(hit);
      if (hit.type === "npc") {
        const e = this.staticNpcImgs.get(hit.id);
        if (e) this.game.events.emit("speaker", this.speakerFrac(e.img.x, e.img.getBounds().top));
      }
    }
```

- [ ] **Step 5: Remove `showTalkBubble` / `hideTalkBubble` / `talkBubble`**

Delete the field declaration:

```ts
  /** Pokémon-style "this NPC is talking" bubble, shown above their head. */
  private talkBubble: Phaser.GameObjects.Container | null = null;
```

Delete both methods entirely — the whole `showTalkBubble(...)` method (its doc comment through its closing brace) and the whole `hideTalkBubble()` method.

Delete the two remaining call sites:
- in the `onDialog` handler inside `create()`: the line `this.hideTalkBubble();` (it sits after `this.restoreStaticNpcFacing();`).
- in `loadRoom`: the line `this.hideTalkBubble();` (it sits after `this.talkingTo = null;`).

- [ ] **Step 6: Typecheck**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: exit 0. (If TS flags `Phaser` as unused, it is still used elsewhere in the file — do not remove the import; if it genuinely is now unused, that is fine to leave, `import * as Phaser` is namespace-only.)

- [ ] **Step 7: Tests**

Run: `npx vitest run`
Expected: 233 passing, unchanged — no test imports `WorldScene`.

- [ ] **Step 8: Manual smoke check**

`npm run dev`, open `http://localhost:3000`, start the game, walk to a floor NPC (Teo / TP / Karl) and press Z. The **old** dialogue window still appears (this task hasn't rewritten it), but there is **no `···` marker** above the NPC's head, and the browser console shows no errors. Advance/close the dialogue — still no errors.

- [ ] **Step 9: Commit**

```bash
git add src/game/scenes/WorldScene.ts
git commit -m "WorldScene: emit speaker viewport-fraction on talk, drop the ... marker"
```

---

### Task 2: `app/page.tsx` — hold `speakerPos` and pass it to `DialogPrompt`

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: the `"speaker"` game event from Task 1 (`{ xFrac: number; yFrac: number }`).
- Produces: a new prop `speakerPos={speakerPos}` on both `<DialogPrompt>` elements, typed `{ xFrac: number; yFrac: number } | null` (Task 3 declares the prop).

- [ ] **Step 1: Add the state**

Near the other `useState` calls in `Home` (just after `const [sel, setSel] = useState<"yes" | "no">("yes");`), add:

```tsx
  const [speakerPos, setSpeakerPos] = useState<{ xFrac: number; yFrac: number } | null>(null);
```

- [ ] **Step 2: Reset it whenever a prompt opens**

In `interactionRef.current = (hit) => {`, make the first line of the body:

```tsx
  interactionRef.current = (hit) => {
    setSpeakerPos(null);
```

In `welcomeRef.current = () => {`, add `setSpeakerPos(null);` as the first line of the body:

```tsx
  welcomeRef.current = () => {
    setSpeakerPos(null);
    sfx.play("expand");
```

- [ ] **Step 3: Subscribe to the `"speaker"` event**

In `onGame`, alongside the other `game.events.on(...)` calls (e.g. right after the `"welcome"` subscription):

```tsx
    game.events.on("speaker", (p: { xFrac: number; yFrac: number } | null) => setSpeakerPos(p));
```

- [ ] **Step 4: Clear it on close**

In `closePrompt`, add a line after `confirmHeldRef.current = false;`:

```tsx
    setSpeakerPos(null);
```

- [ ] **Step 5: Pass it to both `<DialogPrompt>`**

Add `speakerPos={speakerPos}` to each `<DialogPrompt>` element (the `variant="choice"` one and the `variant="message"` one), next to `heldRef={confirmHeldRef}`:

```tsx
          <DialogPrompt
            ref={dialogRef}
            variant="choice"
            text={btnify(prompt.question)}
            mobile={mobile}
            heldRef={confirmHeldRef}
            speakerPos={speakerPos}
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
            speakerPos={speakerPos}
            speaker={prompt.speaker}
            onAdvance={advanceMessage}
          />
```

- [ ] **Step 6: Typecheck + tests**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: exit 0. (`DialogPrompt` does not yet declare `speakerPos` — Task 3 adds it. If `tsc` errors on the unknown prop, that is expected at this point; proceed to commit anyway, and Task 3 resolves it. If you prefer a clean `tsc`, run Task 3 before committing Task 2 — but keep them as separate commits.)

Run: `npx vitest run`
Expected: 233 passing, unchanged.

- [ ] **Step 7: Commit**

```bash
git add app/page.tsx
git commit -m "page: hold speakerPos from the scene, pass to DialogPrompt"
```

Note: `git add app/page.tsx` also stages pre-existing unrelated `sfx` hunks — expected and accepted.

---

### Task 3: `components/DialogPrompt.tsx` — rewrite as the speech bubble

**Files:**
- Modify: `components/DialogPrompt.tsx` (full replacement below)

**Interfaces:**
- Consumes: `nextDelay` from `@/lib/dialogTiming`; the new `speakerPos` prop from Task 2.
- Produces: `DialogPrompt` with props `text`, `variant` (`'message' | 'choice'`), `speaker?`, `mobile?`, `heldRef?`, `speakerPos?: { xFrac: number; yFrac: number } | null`, `sel?`, `onChoose?`, `onAdvance?`. `DialogPromptHandle` (`skipTyping`) unchanged. No longer imports `@/app/fonts`.

- [ ] **Step 1: Replace the whole file**

Replace the entire contents of `components/DialogPrompt.tsx` with:

```tsx
'use client'

import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { nextDelay } from '@/lib/dialogTiming'

const INK = '#0D0D0D'
const PAPER = '#F7F7F5'
const PINK_DEEP = '#FF4FA3'
const PANEL = '#151515'

/** Fixed-bubble metrics, one set per platform. All values are px unless noted. */
const SIZES = {
  mobile: {
    wFrac: 0.9, maxW: 460, top: 12, radius: 16, padX: 14, padY: 12, minH: 56,
    bodyFont: 15, nameFont: 12, tick: 13,
    tailBase: 26, tailGap: 8,
    panelBottom: 16, panelW: 172, panelFont: 14, panelPadY: 10,
  },
  desktop: {
    wFrac: 0.82, maxW: 720, top: 18, radius: 22, padX: 20, padY: 14, minH: 62,
    bodyFont: 17, nameFont: 13, tick: 14,
    tailBase: 34, tailGap: 10,
    panelBottom: 22, panelW: 190, panelFont: 15, panelPadY: 11,
  },
} as const

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const arc = (r: number, x: number, y: number) => `A ${r} ${r} 0 0 1 ${x} ${y}`

/**
 * Build one SVG path for the rounded bubble body plus, when a speaker point is
 * given and sits below the body, a triangular tail notched into the bottom edge
 * (constant base width, apex just above the speaker). Body + tail are one
 * outline, so the join is seamless.
 */
function bubblePath(
  bx: number, by: number, bw: number, bh: number, r: number,
  tail: { apexX: number; apexY: number; base: number } | null,
): string {
  const right = bx + bw
  const bottom = by + bh
  let d = `M ${bx + r} ${by}`
  d += ` L ${right - r} ${by} ${arc(r, right, by + r)}`
  d += ` L ${right} ${bottom - r} ${arc(r, right - r, bottom)}`
  if (tail && tail.apexY > bottom + 3) {
    const c = clamp(tail.apexX, bx + r + tail.base / 2 + 2, right - r - tail.base / 2 - 2)
    d += ` L ${c + tail.base / 2} ${bottom} L ${tail.apexX} ${tail.apexY} L ${c - tail.base / 2} ${bottom}`
  }
  d += ` L ${bx + r} ${bottom} ${arc(r, bx, bottom - r)}`
  d += ` L ${bx} ${by + r} ${arc(r, bx + r, by)} Z`
  return d
}

export interface DialogPromptHandle {
  /** If mid-typewriter, snap to full text and report true. False if nothing to skip. */
  skipTyping: () => boolean
}

/**
 * In-world speech bubble. A fixed rounded bubble near the top of the LCD; its
 * tail (one seamless shape with the body) leans toward `speakerPos`. `message`
 * variant blinks a pink ▼ and advances on click; `choice` variant shows a
 * detached dark Yes/No panel. Text reveals letter-by-letter (see nextDelay);
 * while `heldRef.current` is true a non-choice line skims.
 */
const DialogPrompt = forwardRef<DialogPromptHandle, {
  text: string
  variant?: 'choice' | 'message'
  speaker?: string
  mobile?: boolean
  heldRef?: React.RefObject<boolean>
  speakerPos?: { xFrac: number; yFrac: number } | null
  sel?: 'yes' | 'no'
  onChoose?: (choice: 'yes' | 'no') => void
  onAdvance?: () => void
}>(function DialogPrompt(
  { text, variant = 'choice', speaker, mobile = true, heldRef, speakerPos = null, sel = 'yes', onChoose, onAdvance },
  ref,
) {
  const S = mobile ? SIZES.mobile : SIZES.desktop
  const held = () => variant !== 'choice' && (heldRef?.current ?? false)

  const [typed, setTyped] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const rootRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [textH, setTextH] = useState(0)

  // Measure the overlay and the rendered text block.
  useLayoutEffect(() => {
    const measure = () => {
      const el = rootRef.current
      if (el) setBox({ w: el.clientWidth, h: el.clientHeight })
      if (textRef.current) setTextH(textRef.current.scrollHeight)
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (rootRef.current) ro.observe(rootRef.current)
    if (textRef.current) ro.observe(textRef.current)
    window.addEventListener('resize', measure)
    return () => { ro.disconnect(); window.removeEventListener('resize', measure) }
  }, [])
  // Re-measure the text height whenever the revealed text changes.
  useLayoutEffect(() => {
    if (textRef.current) setTextH(textRef.current.scrollHeight)
  }, [text, typed, speaker, mobile])

  // Typewriter — self-rescheduling so each gap can differ (nextDelay).
  useEffect(() => {
    setTyped(0)
    if (timerRef.current) clearTimeout(timerRef.current)
    let n = 0
    const step = () => {
      if (n >= text.length) return
      n += 1
      setTyped(n)
      if (n < text.length) {
        timerRef.current = setTimeout(step, nextDelay(text[n - 1] ?? '', text[n] ?? '', held()))
      }
    }
    timerRef.current = setTimeout(step, nextDelay('', text[0] ?? '', held()))
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
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

  // Geometry (px in the overlay's own box).
  const bw = Math.min(S.maxW, box.w * S.wFrac)
  const bx = (box.w - bw) / 2
  const by = S.top
  const bh = Math.max(S.minH, textH + 2 * S.padY)
  const tail = speakerPos
    ? { apexX: speakerPos.xFrac * box.w, apexY: speakerPos.yFrac * box.h - S.tailGap, base: S.tailBase }
    : null
  const ready = box.w > 0

  return (
    <div ref={rootRef} aria-live="polite" style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none' }}>
      <style>{`@keyframes scr-blink{0%,49%{opacity:1}50%,100%{opacity:0}}`}</style>

      {ready && (
        <svg
          width={box.w} height={box.h} aria-hidden
          style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none',
                   filter: 'drop-shadow(0 8px 18px rgba(0,0,0,0.30))' }}
        >
          <path d={bubblePath(bx, by, bw, bh, S.radius, tail)} fill={PAPER} />
        </svg>
      )}

      {/* Transparent hit area over the bubble body — click advances a message. */}
      {ready && variant === 'message' && (
        <div
          onClick={advanceOrSkip}
          style={{ position: 'absolute', left: bx, top: by, width: bw, height: bh,
                   pointerEvents: 'auto', cursor: 'pointer' }}
        />
      )}

      {/* Text layer — inherits font-body; measured for the bubble height. */}
      <div
        ref={textRef}
        style={{
          position: 'absolute',
          left: (ready ? bx : 0) + S.padX,
          top: by + S.padY,
          width: (ready ? bw : box.w || 320) - 2 * S.padX,
          color: INK, fontWeight: 700, fontSize: S.bodyFont, lineHeight: 1.4,
          whiteSpace: 'pre-wrap', pointerEvents: 'none',
        }}
      >
        {speaker && (
          <span style={{ display: 'block', fontFamily: 'var(--font-bebas), sans-serif',
                         color: PINK_DEEP, fontSize: S.nameFont, letterSpacing: '0.16em',
                         lineHeight: 1, marginBottom: 5 }}>
            {speaker.toUpperCase()}
          </span>
        )}
        {text.slice(0, typed)}
        {!done && (
          <span style={{ display: 'inline-block', width: S.nameFont, height: S.bodyFont,
                         background: PINK_DEEP, transform: 'translateY(2px)', marginLeft: 1 }} />
        )}
      </div>

      {/* Advance tick (message, fully typed). */}
      {ready && variant === 'message' && done && (
        <span
          aria-hidden
          style={{ position: 'absolute', left: bx + bw - S.padX - S.tick, top: by + bh - S.padY - S.tick - 2,
                   color: PINK_DEEP, fontSize: S.tick, lineHeight: 1,
                   animation: 'scr-blink 0.8s steps(1) infinite' }}
        >
          ▼
        </span>
      )}

      {/* Yes / No — detached dark panel, lower-centre. */}
      {variant === 'choice' && (
        <div style={{
          position: 'absolute', left: '50%', bottom: S.panelBottom, transform: 'translateX(-50%)',
          width: S.panelW, background: PANEL, borderRadius: 13, overflow: 'hidden',
          boxShadow: '0 8px 20px rgba(0,0,0,0.34)', pointerEvents: 'auto',
        }}>
          {(['yes', 'no'] as const).map((opt, i) => (
            <button
              key={opt}
              onClick={() => onChoose?.(opt)}
              style={{
                display: 'block', width: '100%', border: 0, cursor: 'pointer',
                fontWeight: 700, fontSize: S.panelFont, padding: `${S.panelPadY}px 18px`,
                textAlign: 'center',
                background: sel === opt ? PINK_DEEP : 'transparent',
                color: sel === opt ? INK : PAPER,
                borderTop: i === 1 ? '1px solid rgba(255,255,255,0.08)' : undefined,
              }}
            >
              {opt.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  )
})

export default DialogPrompt
```

- [ ] **Step 2: Typecheck**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: exit 0. (`@/app/fonts` is no longer imported anywhere — Task 4 deletes it. `tsc` does not fail on an unimported file, so this passes now.)

- [ ] **Step 3: Tests**

Run: `npx vitest run`
Expected: 233 passing, unchanged. No test imports `DialogPrompt`.

- [ ] **Step 4: Manual browser matrix**

`npm run dev`, `http://localhost:3000`.

Desktop viewport (~1280×800):
1. Start, clear the Heath intro. The bubble is a rounded white shape near the **top-centre**, text in the same sans as the site chrome (compare to a `/inventory` product name — should match), pink `HEATH` label, a blinking pink `▼` bottom-right, a soft drop shadow. **No tail** (Heath is mid-walk / scripted). Typewriter has a beat after each `.`.
2. Walk to a floor NPC on the **left** of the frame and talk. The bubble stays in the same place and size; a triangle grows out of the bubble's bottom edge — **same width at the bubble**, leaning left, ending in a point just above that NPC. The triangle and the bubble are one continuous white shape (no seam line, the shadow is continuous).
3. Repeat with an NPC roughly **centred** and one on the **right** — tail base stays constant width, apex tracks the NPC, bubble unmoved.
4. A clothing rack ("View the inventory?") — a **detached dark rounded panel** lower-centre, `YES` / `NO` stacked; arrow keys toggle; the selected row is filled pink with dark text, the other is light-on-dark. The bubble question sits above with its tail.
5. Hold `Z` on a long line — it skims (does not auto-advance pages).
6. Resize the browser window while a bubble is open — it re-centres and the tail re-aims; nothing clips.

Mobile viewport (~390×844):
7. Repeat 1, 2, 4 — compact preset, bubble ~90% width, still readable, panel smaller, tail still attaches seamlessly.

- [ ] **Step 5: Commit**

```bash
git add components/DialogPrompt.tsx
git commit -m "Rewrite DialogPrompt as a speech bubble with a seamless speaker tail"
```

---

### Task 4: Delete the now-dead pixel font

**Files:**
- Delete: `app/fonts.ts`, `app/fonts/PixelOperator-Bold.ttf`, `app/fonts/PixelOperator.ttf`

**Interfaces:**
- Consumes / Produces: nothing. Pure removal; nothing imports `pixelOperator` after Task 3.

- [ ] **Step 1: Confirm it is unreferenced**

Run: `grep -rn "pixelOperator\|@/app/fonts\|app/fonts" --include="*.ts" --include="*.tsx" . --exclude-dir=node_modules`
Expected: no matches (or only matches inside `app/fonts.ts` itself).

- [ ] **Step 2: Delete the files**

```bash
git rm app/fonts.ts app/fonts/PixelOperator-Bold.ttf app/fonts/PixelOperator.ttf
rmdir app/fonts 2>/dev/null || true
```

- [ ] **Step 3: Typecheck + build + tests**

Run: `./node_modules/.bin/tsc --noEmit`  → exit 0.
Run: `npx vitest run`  → 233 passing.
Run: `npm run build`  → completes with no missing-module error for `@/app/fonts`.

- [ ] **Step 4: Commit**

```bash
git add -A app/fonts.ts app/fonts
git commit -m "Remove the unused Pixel Operator font"
```

---

## Self-Review

**Spec coverage:**
- §A DialogPrompt rewrite (SVG one-path bubble+tail, HTML text layer, pink name/caret/tick, dark Yes/No panel, `speakerPos` prop, typewriter lifted, `font-body` inherited) → Task 3. ✓
- §B WorldScene (`speakerFrac`, emit `"speaker"` after `"interaction"` for NPC talks, `null`/none for scripted, remove `showTalkBubble`/`hideTalkBubble`/`talkBubble` + call sites) → Task 1. ✓
- §C page.tsx (`speakerPos` state, reset on open, subscribe to `"speaker"`, clear on close, pass to both `<DialogPrompt>`) → Task 2. ✓
- §D delete `app/fonts.ts` + ttf → Task 4. ✓
- Testing: existing 233 green each task; `tsc` each task; manual matrix in Task 3 covers NPC left/centre/right tail, seamless join, Yes/No panel, Heath intro / no-tail, pacing, hold-Z, resize, mobile, and the font match. ✓
- Unchanged (`lib/dialogTiming.ts`, `nextDelay`, `confirmHeldRef` + `e.repeat` guard, two-press rhythm, `PROMPTS`/routing/`sel`): no task edits them. ✓

**Placeholder scan:** No TBD/TODO; Task 3 carries the complete file; every code step is literal. Task 2 Step 6 explicitly flags the transient `tsc` state (prop declared in Task 3) and how to handle it — not a placeholder, a sequencing note.

**Type consistency:** `speakerFrac(worldX, worldY): { xFrac: number; yFrac: number }` (Task 1) === the `"speaker"` payload shape subscribed in Task 2 === the `speakerPos?: { xFrac: number; yFrac: number } | null` prop in Task 3. `bubblePath` params match its one call site. `SIZES` keys used: `wFrac, maxW, top, radius, padX, padY, minH, bodyFont, nameFont, tick, tailBase, tailGap, panelBottom, panelW, panelFont, panelPadY` — all present in both presets. `clamp` / `arc` defined before use. `held()` returns `boolean` (`variant !== 'choice' && (...)`), passed to `nextDelay(prev, next, held)`. Event-ordering constraint (interaction before speaker) is honoured by Task 1 Steps 2 and 4 (emit after `fireInteraction`) and relied on by Task 2 Step 2 (reset in the interaction handler).
