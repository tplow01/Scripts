# Speech Window Redesign — Design

**Date:** 2026-09-03
**Branch:** prototype
**Status:** approved (design), pending implementation plan

## Context

The in-world dialogue box (`components/DialogPrompt.tsx`) is the game's "speech"
surface: NPC flavour lines, the Heath intro, the vinyl-reveal beats, and the
Yes/No prompts that route to inventory / basement / cart. It is pinned to the
bottom of the Game Boy LCD, types letter-by-letter, and advances on a button
press. A `···` bubble (added earlier, in `WorldScene.showTalkBubble`) floats over
the talking NPC as a "who's speaking" cue.

Two problems:

1. **Off-brand skin.** The window uses the FireRed/LeafGreen palette verbatim —
   `#1F2A44` navy border, `#A8C0E0` pale-blue inner rule, `#F8F8F8` fill,
   `#384058` ink — and `Press_Start_2P` at 9px. `BRAND.md` specifies the SCR!PTS
   tokens (ink `#0D0D0D`, paper `#F7F7F5`, primary pink `#FF8AC7`, deeper pink
   `#FF4FA3`, grey `#6F6F73`) and **Pixel Operator Bold** for all game-world text.
   None of the brand tokens or the brand font are currently applied here.
2. **Readability + feel.** `Press_Start_2P` at 9px is a chunky display face used
   as body text; it is hard to read on the larger desktop LCD. The typewriter is
   a flat 22 ms/char with no way to speed through a line already read.

`BRAND.md` is explicit that the game-world voice **and look** are "exactly like
classic Pokémon" — the editorial/AWGE register belongs only to the shopping
interface. So the redesign keeps the Pokémon *structure* (bottom window,
faceted pixel corners, name tab, typewriter, press-to-advance, `···` bubble) and
changes only the skin, the typeface, and the pacing.

Mockup (approved): `https://claude.ai/code/artifact/8486ba32-4507-43f7-ae9e-5f6af6921409`

## Decisions (locked during brainstorming)

- **No portraits.** Effort goes to layout, font, and pacing. The `···` bubble
  stays as the spatial "who's talking" cue.
- **Bottom window for everything.** No world-anchored text bubbles; flavour
  lines, Yes/No, and scripted beats all read in the redesigned bottom box.
- **Font: Pixel Operator Bold**, added as a local `next/font/local`. Files
  provided: `PixelOperator-Bold.ttf`, `PixelOperator.ttf` (SIL OFL).
- **Pacing changes are in scope:** faster base type, hold-to-fast-forward, and a
  short pause after sentence punctuation.
- Structure, `PROMPTS`, the `page.tsx` dialogue state machine, routing, and
  world data are **unchanged**.

## Design

### A. Pixel Operator as a shared local font

- Add `app/fonts/PixelOperator-Bold.ttf` and `app/fonts/PixelOperator.ttf`.
- New `app/fonts.ts` exporting `pixelOperator` via `next/font/local`:
  - two `src` entries — `PixelOperator.ttf` @ weight 400, `PixelOperator-Bold.ttf`
    @ weight 700;
  - `display: "swap"`, `variable: "--font-pixel-operator"`.
- Built as a shared module so `GameBoyShell`, `StartScreen`, `SystemOverlay`,
  `RoundBtn` can adopt it later. **This change only rewires `DialogPrompt`** —
  the other `Press_Start_2P` call-sites are out of scope.
- `.ttf` is served as-is by `next/font/local` (~17 KB each); no `woff2`
  conversion.

### B. Re-skin `DialogPrompt` to brand tokens

Replace the palette constants at the top of the file:

| Role | Old | New |
|---|---|---|
| Outer border | `#1F2A44` | `#0D0D0D` (ink) |
| Inner rule | `#A8C0E0` | `#FF8AC7` (primary pink), 2 px |
| Fill | `#F8F8F8` | `#F7F7F5` (paper) |
| Body / label ink | `#384058` | `#0D0D0D` |
| Advance ▼ | `#384058` | `#FF4FA3` (deeper pink) |
| Muted (unselected choice) | — | `#6F6F73` (grey) |

`PixelFrame` keeps its three-layer construction (outer → rule → fill) and the
stair-stepped `stepCorners` clip-path; only the three background colours change.
Body text: `pixelOperator` weight 700, `#0D0D0D` on `#F7F7F5`. The existing
`SIZES` presets (mobile / desktop) stay; retune the numeric values for Pixel
Operator's metrics (it is a narrower, taller-x-height face than `Press_Start_2P`):
target ~18 px body desktop / ~14 px mobile, `line-height` ~1.45, with matching
tweaks to padding, `minHeight`, and the chip/menu offsets.

### C. Unify the name tab and the Yes/No box into one chip

Today the speaker name is a small two-layer tab and the Yes/No menu is a
separate four-layer `PixelFrame` nested into the text box's top-right corner.
Redesign: **one chip recipe** — `#0D0D0D` border → `#FF8AC7` ring → `#F7F7F5`
fill, faceted corners — used by both. Both ride the **top edge** of the window:
name chip top-left, Yes/No chip top-right (anchored `bottom: 100%` with a small
negative margin so the chip's border merges with the window's top border like a
tab). Selected Yes/No row: pink `#FF4FA3` ▶ + `#0D0D0D` label; the other row's
label goes `#6F6F73` grey and its ▶ is hidden.

Introduce a small `Chip` sub-component (or a shared style object) in
`DialogPrompt.tsx` so the name tab and the choice box cannot drift apart.

### D. Pacing

Extract the per-character delay into a pure helper in `lib/dialogTiming.ts` so it
is unit-testable without pulling in the component:

```
nextDelay(char: string, held: boolean): number
```

- Base: **18 ms/char** (down from 22).
- `held === true` (confirm button held): **~4 ms/char** fast-forward.
- After `.`, `!`, `?`, `…` (and `. ` / `! ` etc.): **+90 ms** so lines breathe.
- The two-press rhythm is unchanged: a press mid-type completes the line
  (`skipTyping`), the next press advances. No auto-advance.

Wiring: `page.tsx` already routes button up/down through `handlePress` and the
`vbutton` bridge. Track the confirm button's held state (A on mobile, Z on web)
in a `useRef` updated on keydown/keyup (no re-render), and pass that ref into
`DialogPrompt`; the typewriter interval reads `ref.current` via `nextDelay` each
tick. Releasing the button returns to the base rate for the remaining characters.

### E. Recolour the `···` bubble

`WorldScene.showTalkBubble` currently draws with `#1F2A44` / `#f8f8f8` /
`#384058`. Swap to the brand tokens: `0x0D0D0D` border, `0xF7F7F5` fill,
`0xFF8AC7` dots. Geometry and the bob tween are unchanged.

## Files

| File | Change |
|---|---|
| `app/fonts/PixelOperator-Bold.ttf`, `app/fonts/PixelOperator.ttf` | new (font binaries) |
| `app/fonts.ts` | new — `pixelOperator` local font export |
| `components/DialogPrompt.tsx` | palette constants, `PixelFrame` colours, `pixelOperator` font, retuned `SIZES`, `Chip` unification, `nextDelay` helper + held-aware typewriter |
| `app/page.tsx` | track confirm-button held state in a `useRef` (keydown/keyup); pass the ref to both `DialogPrompt` usages |
| `src/game/scenes/WorldScene.ts` | `showTalkBubble` colours → brand tokens |
| `lib/dialogTiming.ts` | new — `nextDelay` pure helper |
| `__tests__/dialogTiming.test.ts` | new — unit tests for `nextDelay` |

## Testing

- **Unit:** `nextDelay` — base rate, held fast-forward rate, punctuation pause
  applied for each of `. ! ? …` and not for other characters.
- **Existing suite:** all 225 tests stay green (no logic touched in world data,
  `PROMPTS`, or the state machine).
- **Browser (manual), desktop + mobile viewports:**
  - a flavour NPC (Teo/TP/Karl) — skin, font, typewriter, hold-to-fast-forward;
  - a Yes/No (`rack` → "View the inventory?") — chip on the top edge, pink
    selection, arrow-key toggle;
  - the Heath multi-page intro — multi-page advance, punctuation pauses;
  - the vinyl reveal — `message` variant with no speaker;
  - the `···` bubble recolour, over a talking NPC.

## Out of scope

- Migrating the other `Press_Start_2P` call-sites (`GameBoyShell`,
  `StartScreen`, `SystemOverlay`, `RoundBtn`) to Pixel Operator.
- Portraits, world-anchored text bubbles, branching dialogue trees.
- Any change to `PROMPTS`, routing, or world data.
- The shopping-interface / editorial typography (`Fashion Whacks`).

## Rollback

All changes are additive or localized to `DialogPrompt.tsx`,
`WorldScene.showTalkBubble`, and two new font files. Reverting the commit
restores the FireRed skin with no data or state migration.
