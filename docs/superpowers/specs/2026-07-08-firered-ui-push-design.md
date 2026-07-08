# FireRed UI Push + Mobile Fixes — Design Spec

**Date:** 2026-07-08 · **Status:** approved

## Context

The shop world reads flat/sterile next to the Pokémon FireRed/LeafGreen references
(warm checkered floors, shaded 3-band walls, framed stairwells, bordered floor
medallions, voids that merge with the room border). Separately, mobile has two
bugs: the page scrolls (100vh vs the dynamic URL bar, no body scroll lock) and
holding a control triggers long-press text selection (no `user-select` /
`-webkit-touch-callout` CSS anywhere).

Two independent tracks. Track A is entirely inside `src/game/art/sprites.ts`
(procedural 16×16 pixel maps; palette `PAL` maps chars → hex). No texture keys
change, so registry/world/tests are untouched. Track B is app CSS/layout only.

## Palette additions (`PAL`, sprites.ts)

| char | hex | use |
|---|---|---|
| `!` | `#EFEDE6` | floor tone B (checker partner to paper `=`) |
| `,` | `#E4E1D8` | floor grout / wall cap seam |
| `;` | `#D6D3C9` | floor shade tick / emblem dither |
| `:` | `#B9B9BC` | wall panel groove |
| `#` | `#8C8C90` | wall mid-shade / stair rail light |
| `'` | `#4A4A4F` | baseboard dark / stair riser deep |
| `<` | `#5FA7D6` | RAGE tee blue accent |

Grep each char before adding to confirm it is unused. Hexes are starting
points — tuned on screen during the screenshot loop.

## Track A — Art

1. **Cutout void = exterior void.** `wallFillRows` → solid `@` (#0D0D0D) all 16
   rows, identical to `extVoidArt`; the top-right cutout merges with the
   exterior black. Cutout edge tiles already resolve to wall-top/side/bottom via
   `wallVariant` floor-adjacency — the FireRed "wall face where void meets
   floor" comes for free. No `wallVariant.ts` change.
2. **Walls — FireRed 3-band face** (new per-pixel `buildWallFace(kind)`):
   - *wall-top:* y0 `@` ink horizon · y1–2 `=` lit cap · y3 `,` cap seam ·
     y4–11 `!` face with `:` vertical grooves at x0/x8 + `:` molding row at y8 ·
     y12 optional `P` pink trim (kept only if it reads well on screen) ·
     y13 `#` / y14 `'` / y15 `@` baseboard.
   - *wall-bottom:* y0 `@` crisp edge, `=` cap, `!` face + groove, `'`/`@` base.
   - *wall-side:* face recipe minus the ink horizon; `:` groove down x0.
3. **Floor — cream 2-tone checker** (`buildFloor`): 2×2 checker of 8px quads
   (`=` / `!`), 1px `,` grout on each quad's top+left, sparse `;` shade ticks.
   Low contrast so garments/props/emblem stay readable. Basement floor untouched.
4. **Rails — SCR!PTS graphic tees** (`buildRail`): garment pitch 6→8px;
   `RAIL_COLORS` becomes a `RAIL_TEES` cycle matching the four NPC tees —
   LOVE (green `m`, pink heart), CONFUSION (white `=`/`9`, pink `?`),
   ARE YOU OKAY (charcoal `3`/`4`, pink cross), RAGE (white, pink+`<` blue).
   Better hangers (`M` hook + `e` shoulder bar); cream price tag (`o`+`v`) on
   every 3rd garment. Seam/hem/highlight shading kept; all four rail exports
   (H7/V7/H3/V3) inherit automatically.
5. **Emblem — FireRed floor medallion** (`buildEmblem`, keep 80×80 +
   `emblemArt` export): `@` outer line, `+` grey frame with cut diagonal
   corners, thin `p` pink keyline, `F` field with 2px-period `;` dither at the
   rim; centre = comet star (existing `star()` helper, 3-tone pink) +
   existing `scr!pts` wordmark glyphs below.
6. **Stairs — framed stairwell** (`stairsArt`, stays 16×16 single tile —
   placements at mainRoom b7 under 1-tile crates and basement e1 make a bigger
   footprint ripple): 2px dark side rails (`'`+`@`), `@` ink lintel, 4 treads
   shading light→dark receding upward (`=`,`!` → `!`,`;` → `;`,`#` → `'`) with
   `@` nosing per step; single `P` pink accent on the bottom tread kept.

## Track B — Mobile

1. **app/layout.tsx:** add `export const viewport: Viewport = { width:
   "device-width", initialScale: 1, maximumScale: 1, userScalable: false,
   viewportFit: "cover" }`.
2. **app/globals.css:** `html, body { height: 100dvh; overflow: hidden;
   position: fixed; inset: 0; width: 100%; overscroll-behavior: none;
   -webkit-tap-highlight-color: transparent; -webkit-touch-callout: none; }`.
   `user-select: none` scoped to the game shell only (commerce pages stay
   selectable).
3. **app/page.tsx:** `h-screen` → `h-dvh` on the game `<main>` (both the
   mounted and pre-mount fallback).
4. **components/GameBoyShell.tsx:** root divs `h-screen` → `h-dvh`; add
   `userSelect/WebkitUserSelect: none`, `WebkitTouchCallout: none`,
   `WebkitTapHighlightColor: transparent`, `touchAction: none` on the shell
   root.

## Execution

Three parallel Claude subagents: (1) Track B mobile · (2) A1–A3 palette +
cutout + walls + floor · (3) A4–A6 rails + emblem + stairs (adds only the
chars it needs if agent 2 hasn't landed the palette). Then the main loop runs
the dev server, screenshots the game with the gstack headless browser, and
iterates each art piece until it reads FireRed-quality; finishes with a
code-review pass and final screenshots for user sign-off.

## Verification

- `npx vitest run` (22 tests) + `npx tsc --noEmit` stay green.
- Screenshots: cutout continuous flat black with the exterior; wall bands read
  at game zoom; checker quiet under props; rail tees show graphics/hangers/
  tags; emblem medallion reads at 3×3 tiles; stairs read as a framed dark
  stairwell in both rooms.
- Mobile viewport emulation: no scroll/bounce, no long-press selection, shell
  fills exactly the visible viewport.
