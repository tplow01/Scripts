# Speech Bubble Redesign — Design

**Date:** 2026-09-03
**Branch:** prototype
**Status:** approved (design), pending implementation plan
**Supersedes:** the presentation of `2026-09-03-speech-window-redesign-design.md` (that pass re-skinned the FireRed window; the user rejected the windowed form entirely). The timing/pacing work from that pass — `lib/dialogTiming.ts`, `nextDelay`, the `setTimeout` typewriter, `confirmHeldRef` + the `e.repeat` guard — is kept as-is.

Mockup (approved): `https://claude.ai/code/artifact/fb4bb6a9-eece-4b3e-a6ee-d95c316b25f4`

## Context

The in-world dialogue currently renders in `components/DialogPrompt.tsx` as a bottom-pinned GBA-style window (paper fill, faceted corners, name chip, corner Yes/No), with a separate `···` marker floating over the talking NPC (`WorldScene.showTalkBubble`). The user wants to drop the windowed form and move to a PokéMMO-style **speech bubble**:

- A **fixed** rounded bubble — same size, same on-screen spot every time.
- Dialogue text in the **inventory / basement body font** (see "Font" below), not a pixel face.
- A **triangular tail** that is *seamlessly* part of the bubble (one continuous filled shape, no seam where they join): **constant width where it meets the bubble**, narrowing to a **single point just above the speaking character**. The tail is the only thing that changes between speakers — it leans toward whoever is talking. Hidden when no character is on screen (Heath's scripted intro, the vinyl reveal).
- **Yes / No** as a separate dark rounded panel, detached from the bubble, lower-centre.
- Pink (`#FF4FA3`) is the only brand accent: name label, typing caret, advance tick, selected Yes/No row.

The `···` marker is replaced by the tail and is removed.

## Decisions (locked during brainstorming)

- **Direction:** speech bubble (mockup direction "C"), taken toward the PokéMMO reference.
- **Bubble is fixed** — constant width and screen position; only the tail moves.
- **Font:** the dialogue text uses whatever the inventory / basement pages use. Those render body text through Tailwind's `font-body` (`Inter, Geist, system-ui, sans-serif`), applied on `<body>` in `app/layout.tsx`; **no font is overridden** in the bubble — it inherits `font-body`. (Inter is not currently loaded via `next/font`; matching the commerce pages means matching that same inherited stack, not adding a font.) The name label uses `var(--font-bebas)` (Bebas Neue), the commerce pages' heading face.
- **Name label:** kept — a small pink Bebas label as the bubble's first line. (One-line removal if the user later decides the tail alone is enough.)
- **Pacing / interaction:** unchanged from the prior pass — `nextDelay` (18 ms base, +90 ms after `. ! ? …`, 4 ms held), the self-rescheduling `setTimeout` typewriter, `confirmHeldRef` fast-forward with the `e.repeat` no-auto-advance guard, and the two-press rhythm (a press mid-type completes the line; the next advances).
- **`PROMPTS`, routing, `sel`/`toggleSel`/`choose`, world data:** unchanged.

## Design

### A. `components/DialogPrompt.tsx` — full rewrite

Same overlay contract: an `absolute inset-0` layer over the LCD, `pointer-events` mostly off, the page owns state. Props: `text`, `variant` (`'message' | 'choice'`), `speaker?`, `mobile?`, `heldRef?`, `sel?`, `onChoose?`, `onAdvance?` — **plus** `speaker Pos?: { xFrac: number; yFrac: number } | null` (viewport-fraction position of the speaker's head; see §B). `DialogPromptHandle` (`skipTyping`) unchanged.

**The bubble + tail as one SVG shape.** A single `<svg>` sized to the LCD overlay, containing one `<path>` that is the rounded-rect body **and** the tail as a continuous outline, filled `#F7F7F5`, no stroke, with `filter: drop-shadow(0 8px 18px rgba(0,0,0,0.30))` on the `<svg>` (or a `<feDropShadow>`). Because body and tail are one path, the join is seamless.

- **Body rect:** fixed. Width = `min(BUBBLE_MAX_PX, LCD_W * BUBBLE_W_FRAC)` (desktop `BUBBLE_W_FRAC ≈ 0.8`, mobile `≈ 0.9`); horizontally centred; top edge at a fixed `BUBBLE_TOP_PX` from the LCD top. Height = content height (grows downward for a 3rd line; rare) with a min of ~2 lines. Corner radius ~22 px (desktop) / ~16 px (mobile).
- **Tail:** when `speakerPos` is non-null, three points appended to the path along the body's bottom edge:
  - base width `TAIL_BASE_PX` (~34 desktop / ~26 mobile), constant.
  - base centre x = `clamp(speakerPos.xFrac * LCD_W, bodyLeft + radius + TAIL_BASE_PX/2, bodyRight - radius - TAIL_BASE_PX/2)` — stays on the flat part of the bottom edge.
  - apex = `(speakerPos.xFrac * LCD_W, speakerPos.yFrac * LCD_H - TAIL_TIP_GAP_PX)` — just above the speaker's head. Apex y is also clamped so the tail can't invert (apex must sit below the body bottom by at least a few px); if the speaker is above/behind the bubble, the tail is omitted.
  - The path goes: … bottom edge to `baseLeft` → line to `apex` → line to `baseRight` → continue bottom edge …, so the triangle is a notch out of the same outline.
- When `speakerPos` is null: path is just the rounded rect, no tail.

Recompute the path on: mount, `text` change (height), `speakerPos` change, and LCD resize (a `ResizeObserver` on the overlay, or read `window` size on a resize listener). No per-frame work.

**Text layer.** An HTML `<div>` absolutely positioned over the SVG body region (same left/top/width, matching inner padding ~14–18 px). Inherits `font-body`; `color: #0D0D0D`; `font-weight: 700`; `font-size` ~17 px desktop / ~15 px mobile; `line-height` ~1.4; `white-space: pre-wrap`. First line: the name label — `<span>` with `fontFamily: 'var(--font-bebas)'`, `color: #FF4FA3`, ~13 px, `letter-spacing: 0.16em`, its own line, only when `speaker` is set. Then `text.slice(0, typed)` and, mid-type, the caret (`#FF4FA3`, ~9×16 px block).

**Advance tick.** `variant === 'message'` and `done`: a pink `▼` (`#FF4FA3`), ~14 px, bottom-right inside the body, blinking (reuse the `scr-blink` keyframe).

**Yes / No panel.** `variant === 'choice'`: a separate element, not attached to the bubble — `position: absolute`, horizontally centred, near the lower third of the LCD. Dark `#151515`, radius ~13 px, `overflow: hidden`, drop shadow. Two rows, `Yes` then `No`, `font-body` `font-weight: 700`, ~15 px, `color: #F7F7F5`, centred, ~10×18 px padding, a 1 px `rgba(255,255,255,0.08)` divider between. Selected row (`sel === opt`): `background: #FF4FA3; color: #0D0D0D`. Rows are `<button>`s with `pointer-events: auto` calling `onChoose(opt)`.

**Sizing presets.** Keep a `mobile`-keyed constant block for the px values above (`BUBBLE_W_FRAC`, `BUBBLE_TOP_PX`, radius, `TAIL_BASE_PX`, `TAIL_TIP_GAP_PX`, font sizes, panel metrics).

**Typewriter + skip.** Lift verbatim from the current `DialogPrompt`: the `setTimeout` loop keyed on `[text, heldRef]` using `nextDelay(text[n-1] ?? '', text[n] ?? '', held())` where `held()` is `variant !== 'choice' && (heldRef?.current ?? false)`; `skipTyping` / `advanceOrSkip` clearing the same `timerRef` with `clearTimeout`.

Remove the `import { pixelOperator } from '@/app/fonts'` and all brand-token `const`s that are now unused; keep `INK`/`PAPER`/`PINK_DEEP`/`PANEL` as needed.

### B. `WorldScene` — emit the speaker's screen position; drop the `···` marker

- **New helper** `private speakerFrac(worldX: number, worldY: number): { xFrac: number; yFrac: number }` — `const v = this.cameras.main.worldView; return { xFrac: (worldX - v.x) / v.width, yFrac: (worldY - v.y) / v.height }`. Fractions are resolution-independent and map straight onto the React overlay, which fills the same parent as the canvas (`Phaser.Scale.RESIZE`).
- **`talkToNpc(npc)`** (patrolling NPCs): after `this.talkingTo = npc`, emit the position. Use `npc.headAnchor` (already exists) for the world point.
- **`faceStaticNpc(hit)`** path (static NPCs incl. cashier): from `entry.img` (`entry.img.x`, `entry.img.getBounds().top`).
- **Delivery:** add `speaker` to the payload of the existing `game.events.emit("interaction", hit)` — extend the `hit` object with `speaker: { xFrac, yFrac } | null` — **or** emit a dedicated `game.events.emit("speaker", frac | null)` immediately before `fireInteraction`. Dedicated event is cleaner (keeps `Interaction` typing untouched); the plan picks one.
- **Scripted Heath beats** (`welcome`, `playHeathCheckout`) and the **vinyl reveal**: emit `null` (Heath is mid-walk or off screen; no tail). The `welcome` event handler in `page.tsx` sets `speakerPos = null`.
- **Remove** `showTalkBubble`, `hideTalkBubble`, the `talkBubble` field, and every call site (`talkToNpc`, `faceStaticNpc`, the `onDialog(false)` handler, `loadRoom`). Keep `NpcActor.headAnchor` (now used to aim the tail).

### C. `app/page.tsx` — carry the speaker position to `DialogPrompt`

- New state `const [speakerPos, setSpeakerPos] = useState<{ xFrac: number; yFrac: number } | null>(null)`.
- Subscribe in `onGame`: `game.events.on("speaker", (p) => setSpeakerPos(p))` (or read `hit.speaker` inside `interactionRef.current` and `setSpeakerPos(hit.speaker ?? null)`).
- `welcomeRef.current` and the `vinyl` branch of `interactionRef.current`: `setSpeakerPos(null)`.
- `closePrompt`: `setSpeakerPos(null)`.
- Pass `speakerPos={speakerPos}` to both `<DialogPrompt>` elements, alongside the existing `mobile` / `heldRef` / `speaker` / `sel` / `onChoose` / `onAdvance`.
- No change to `sel`, `toggleSel`, `choose`, `advanceMessage`, `closePrompt`'s other lines, `confirmHeldRef`, or the key handlers.

### D. Delete the now-dead pixel font

Nothing imports `pixelOperator` after §A. Delete `app/fonts.ts`, `app/fonts/PixelOperator-Bold.ttf`, `app/fonts/PixelOperator.ttf`.

## Files

| File | Change |
|---|---|
| `components/DialogPrompt.tsx` | full rewrite — SVG bubble+tail one-path, HTML text layer, pink name label / caret / tick, detached dark Yes/No panel, `speakerPos` prop, typewriter lifted from current |
| `src/game/scenes/WorldScene.ts` | `speakerFrac` helper; emit speaker position on talk; remove `showTalkBubble`/`hideTalkBubble`/`talkBubble` and call sites |
| `app/page.tsx` | `speakerPos` state + wiring; `null` for scripted/no-NPC beats; pass to both `<DialogPrompt>` |
| `app/fonts.ts`, `app/fonts/PixelOperator*.ttf` | delete |
| `lib/dialogTiming.ts`, `__tests__/dialogTiming.test.ts` | unchanged |

## Testing

- **Existing suite** (233) stays green — no logic touched in world data, `PROMPTS`, timing, or the state machine. `lib/dialogTiming.ts` untouched.
- **`tsc --noEmit`** clean.
- **Browser (manual), desktop + mobile viewports:**
  - Talk to a floor NPC on the left, centre, and right of the frame — the bubble stays put; the tail base stays on the bubble at constant width; the tail leans and its point sits just above that NPC; the join to the bubble is seamless (one shape, no seam, drop shadow continuous).
  - A rack Yes/No — dark panel lower-centre, arrow-keys toggle, selected row pink; bubble question above with its tail.
  - Heath's multi-page intro and the vinyl reveal — no tail; bubble in its fixed spot; punctuation-pause pacing; hold-Z fast-forwards the type without skipping pages.
  - Font of the dialogue text visually matches the inventory page's product text; name label matches the Bebas heading on the inventory NavBar.
  - Resize the window mid-dialogue — bubble re-centres, tail re-aims, nothing clips.

## Out of scope

- Per-frame tail tracking (the speaker and camera are static while a dialogue is open — position is emitted once).
- Loading Inter via `next/font` (matching the commerce pages means matching their current inherited stack).
- Branching dialogue, portraits, the shopping-interface typography.
- The bundled in-progress sound-system code in `app/page.tsx` / `WorldScene.ts`.

## Rollback

`git revert` the implementation commits restores the windowed `DialogPrompt`, the `···` marker, and the pixel font. No data or state migration.
