# Game Boy Shell Responsive Redesign + Dialogue & World Pass — Design

**Date:** 2026-07-25
**Status:** Approved (brainstorm w/ Thomas)
**Reference:** Delta emulator GBC skin (portrait + landscape) — see brainstorm session image.

Two workstreams, one change: (A) rebuild the Game Boy shell so it is fully responsive
across phone portrait, phone/tablet landscape, and desktop — with the four utility
buttons molded into the console body instead of floating; (B) a dialogue rewrite and
two world-layout changes on the shop floor.

---

## Workstream A — Responsive Game Boy shell

### Problem

The utility buttons shipped as a floating grey HTML strip: absolutely positioned,
overlapping SELECT/START with their popovers on short viewports, and visually
disconnected from the console's molded-plastic language. There is also no landscape
layout at all — tablets and sideways phones get the portrait stack.

### Layout modes

Mode is chosen by **orientation on touch devices**, not device type. Desktop
(mouse/keyboard, wide viewport) keeps its own mode. `useIsMobile` grows into a
`useShellLayout` hook returning `'desktop' | 'portrait' | 'landscape'`:

- touch/coarse pointer + `orientation: portrait` → **portrait**
- touch/coarse pointer + `orientation: landscape` → **landscape**
- otherwise → **desktop**

**Portrait (phones + tablets upright)** — current stacked split (screen top,
control panel bottom) restyled to the Delta reference:

- D-pad: molded cross with etched arrow triangles + center dot, dark charcoal
  (brand ink tones from `src/theme/tokens.ts`, not Delta purple/black).
- A / B: dark round buttons, Delta diagonal (A upper-right, B lower-left).
- MENU / SELECT / START: dark pills, labels beneath.
- Utility strip: bottom edge of the body, small angled buttons (see below).
- All control-panel rows are flex-sized (no fixed pixel gaps) so the panel fits
  viewports down to 320×568 without overlap or clipping.

**Landscape (phones sideways + tablets)** — new, per the Delta landscape skin:

- LCD centered, as tall as the viewport allows; outer bezel padding near zero;
  the etched "SCR!PTS" wordmark moves to directly under the screen.
- D-pad on the left flank; A/B diagonal on the right flank.
- MENU pill tucked top-left; SELECT/START under the screen.
- Speaker-grille dot pattern fills right-flank dead space; the utility cluster
  sits below the grille / bottom-right corner where nothing can collide.
- Screen area flexes; control flanks have fixed minimums — any tablet aspect
  ratio resolves without special-casing.

**Desktop** — unchanged full-bleed bezel; the utility strip is molded into the
bottom bezel edge (in unused space below the LCD module).

### Shared components

Extract from `GameBoyShell.tsx` so portrait and landscape cannot drift:

- `DPad` — molded cross w/ arrows, four hold-to-walk touch zones (existing
  press/release + pointer-capture semantics move in unchanged).
- `RoundBtn` — A/B button.
- `PillBtn` — MENU/SELECT/START (exists; restyle).
- `ConsoleUtilityStrip` — the four utility buttons (below).
- `GameBoyShell` remains the single entry point and picks the layout.

### Utility buttons

Four small **angled** buttons styled as physical hardware (like a Game Boy's
power/volume controls), using pixel-art glyph icons, no text labels:

| Icon | Action |
|---|---|
| link/share glyph | Socials — opens SystemOverlay in the LCD |
| shirt glyph | Skip to inventory — `router.push('/inventory')` |
| speaker glyph (crossed when muted) | Mute toggle — direct state flip, no overlay |
| `?` glyph | Key legend — opens SystemOverlay in the LCD |

The strip participates in flex layout (never absolutely positioned over
siblings) — overlap is impossible by construction.

### SystemOverlay (in-LCD)

Socials and Keys content renders **inside the LCD screen container** (same host
as `StartScreen` / `PhaserGame`) as a pause-menu-style overlay: pixel-frame
panel, Press Start 2P, brand ink/pink. Dismissed by tapping outside it, tapping
the same utility button again, or B/X/Escape. Opening it while in-game sets the
existing `dialog` flag so Scribbs doesn't walk underneath. Body popovers are
deleted entirely.

Key legend content is platform-aware (A/B/START on touch; Z/X/ENTER + arrows on
desktop). Socials list reuses the same links as `FooterLinks` (Instagram,
YouTube, TikTok).

### Existing bug fixed by construction

The old `UtilityBar` popovers overlapped SELECT/START on ≤667px-tall phones.
In-flex strip + in-LCD overlays remove both the floating strip and the popovers.

---

## Workstream B — Dialogue rewrite + world changes

All dialogue lives in the `PROMPTS` table / `HEATH_INTRO_PAGES` in `app/page.tsx`;
world layout in `src/game/world/mainRoom.ts`; reveal behaviour in `WorldScene`.

### Dialogue changes

1. **Heath intro, page 1** → `… Yooo. My name is Heath. I'm the founder of
   SCR!PTS. Welcome to our world!`
2. **Heath intro, page 2** → keeps the `{A}` interact line and adds the back
   button: `Walk up to anything and press {A} to check it out — {B} to go back.`
   `{B}` renders as **B** on touch, **X** on desktop (same `btnify` swap as `{A}`).
3. **Heath intro, page 3** → `When you're ready, come back up — I'll check you
   out!`
4. **Checkout prompt** (Heath at the counter) becomes a `messageChoice`:
   speech page `You find some dope pieces?` → then the Yes/No question
   `Checkout?`. Heath's walk-to-the-counter behaviour is unchanged.
5. **npc-gazer** (right side, by the vertical rail) → single page:
   `There's so many sick pieces, I can't choose which one to get… might js have
   to get a few, don't tell my bank.`
6. **npc-rail** (by the horizontal rack) → page 1 unchanged (`These just dropped
   this morning.`); page 2 → `I think there's only a few pairs left though.`
7. **npc-sofa** (seated on the couch corner — stays put) → single page:
   `This pretty sick store huh? I'd check out the vinyls — some of my favorites
   in there.` (still doubles as the basement hint).
8. **Basement NPC** — final speech page → `You have to check these pieces out,
   they are insane!`; the Yes/No question after it is unchanged.
9. **npc-checkout** (post-checkout shopper) — page 1 becomes dynamic: a random
   product from the live catalog each session, e.g. `Just copped the ANXIETY
   tee.` The name comes from `lib/products.ts` at prompt-open time so new drops
   flow in automatically; the static `PROMPTS` entry gains a small
   function-valued page (the table otherwise stays static data). Page 2 →
   `This spot is sweeeeeet! The staff is awesome and the pieces are sick!`

### World changes (shop floor, `mainRoom.ts`)

Top-wall music alcove today: speaker (c2) · vinyl deck (c3–4) · speaker (c5) ·
gap (c6) · crate concealing secret stairs (c7) · wall (c8+, top-right cutout).

**New:** crate moves to **c6**, snug against the right speaker; the secret
stairs move under it to **c6**. Playing the vinyl no longer despawns the crate —
it **slides right one tile** (c6 → c7) and parks against the wall, staying
visible and solid afterwards. `WorldScene`'s reveal handler animates the slide
(tween, same fade/step timing family as existing scripted moves); the
`concealing` flag semantics change from "hide" to "slide aside".

### Testing

- Update `__tests__` world-data expectations for the new crate/stairs tiles.
- Screenshot pass at 320×568, 375×667, 390×844 portrait; 844×390 and 1024×768
  landscape; 1440×900 desktop — verifying no control overlap in any mode.
- Manual walkthrough of every changed conversation, the checkout choice flow,
  and the crate-slide reveal (first play + revisit idle line).

### Out of scope

Real audio (mute is state-only until a music system exists), tablet-specific
art, any change to the AWGE shopping pages, Supabase/Stripe.
