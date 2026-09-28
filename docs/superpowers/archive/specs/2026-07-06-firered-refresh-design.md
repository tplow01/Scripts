# FireRed Refresh — NPCs, Entrance, Street, Emblem, Till Behaviour, Fixed Headers

**Date:** 2026-07-06 · **Status:** approved by Thomas · **Scope:** main shop room + inventory/basement page headers. Basement room art/dialogue unchanged.

Style bar for all new art: proper Pokémon FireRed overworld quality (see Thomas's
reference screenshot) — saturated colours, 2–3 tone shading, dark outlines,
dithered texture — not flat pastel placeholders.

## 1. Heath stays at the till while it's open

**Problem:** Heath walks back the moment the checkout Yes/No closes, which is
exactly when the cart drawer opens — he leaves while the till is in use.

**Fix:** bridge cart-drawer state into the game, mirroring the existing
`"dialog"` event:

- `app/page.tsx`: `useEffect` on `useCart().isOpen` → `game.events.emit("cart", isOpen)`.
- `WorldScene`: track `cartOpen`; add `waitForCartClose()` (same promise pattern
  as `waitForDialogClose`, incl. re-arming fallback timer).
- `playHeathCheckout`: after the dialogue closes, wait a ~300ms grace beat (time
  for a "Yes" to open the drawer), then if `cartOpen`, await close — only then
  slide back and restore the static cashier. "No" path behaves as today.
- Movement stays locked throughout via `transitioning` (already the case).

## 2. Character sprites, FireRed style

**Approach:** keep the hand-authored pipeline — 16×16 ASCII `PixelArt` grids in
`src/game/art/sprites.ts`, replacing the art **behind the existing keys**
(`cashier`, `npcRail`, `npcGazer`, `npcSitter`, `npcShopper`). No world-data,
registry-key, or scene changes. (Rejected: external PNG atlases — no artist
assets yet; 24px natives — breaks tile-scale consistency.)

Upgrades per sprite: 3-tone skin, 2-tone hair with highlight, dark outline,
chunky FireRed head-to-body proportions. Likeness = hair + tee (tee designs are
a base colour + 1–3px chest accent at this scale). Internal names as code
comments only; Heath keeps the only nameplate.

| Key | Character | Hair | Tee |
|---|---|---|---|
| `cashier` | **Heath** | white beanie, light-brown curls peeking out (apron removed) | MJ tee, white + tiny dark figure accent |
| `npcRail` | **Teo** | messy black | LOVE, green + pink heart accent |
| `npcGazer` | **Thomas** | light sandy curls | CONFUSION, white + pink "?" accent |
| `npcSitter` | **Karl** (seated pose) | dark | ARE YOU OKAY, black + pink cross accent |
| `npcShopper` | **Gomes** | black spiky | RAGE, white + pink/blue accent |

Scribbs and the basement NPC untouched.

## 3. Floor emblem

Rebuild `buildEmblem()` (sprites.ts) to match the real logo lockup
(`full logo transparent 2.PNG`): pink comet — big 4-point star top-right,
tapering streak down-left to the small star — **above** the `scr!pts` wordmark,
with 3-tone pink shading for the logo's 3D look. Same 80×80 canvas / 3×3-tile
footprint. Wordmark glyphs redrawn slightly bolder to hold up at floor scale.

## 4. High-end entrance facade (no map change)

All drawn on/over the existing bottom border wall, centred on the doors
(cols 7–9), as decorations; nothing walkable changes:

- **Glass double doors** (replaces `doors` art): frameless-luxury full-height
  glass, slim ink frames, gold handle pixels, interior light glow.
- **Fascia sign** above the doors: ink band, `scr!pts` wordmark in paper-white.
- **Display windows** flanking the doors (cols ~5–6 and ~10–11): glass +
  mannequin silhouette each (one white tee, one green tee) + spotlight pool.
- **Planters** with topiary at the outer edges of the windows.
- **Mat glow**: warm highlight on the existing walkable mat.

New art keys: `sign`, `display-window-l`, `display-window-r`, `planter`
(registered in `registry.ts` `TEXTURE_KEYS` + `bakeAllTextures`; `doors` art
replaced in place).

## 5. Street scene + textured void (main room only)

The flat `#1C1A22` fill outside the room reads as dead space (top-right cutout,
letterboxing, room edges). Treatment — all decorative, outside the walkable
map, camera bounds untouched, drawn at depth below floor in `loadRoom` when
`roomId === "main"`:

- **Below the entrance:** storefront street — pavement apron with kerb line,
  dark asphalt beyond, streetlamp pool of light near the doors.
- **Top/left/right:** quiet dithered dark-pavement apron (~4 tiles) + soft drop
  shadow just outside the walls so the building sits on something.
- Camera background colour set **per room load** (not once in `create`): apron
  base tone for `main`, existing `#1C1A22` for `basement`, so extreme
  letterboxing blends in for each.
- **Basement keeps its pure-black void** (kept as-is for now, per Thomas).

New art keys: `ext-pavement`, `ext-kerb`, `ext-asphalt`, `ext-lamp` (or a
single procedural builder — implementer's choice, same registry rules).

## 6. Fixed headers on Inventory + Basement pages

`components/NavBar.tsx` and the basement's `BasementNavBar`: header element
becomes `sticky top-0 z-50` with a solid background (white / `#0d0d0d`) so the
back button, title, and cart bag stay pinned while the grid scrolls. Verify the
cart count badge still overlays correctly and nothing beneath shows through.

## 7. Verification

- Browser playthrough: intro → new sprites visible → counter → **Yes** → drawer
  open, Heath holds position → drawer close, Heath slides back → **No** path
  unchanged (immediate slide-back after grace beat).
- Screenshots: facade, street scene, emblem, each NPC up close.
- Scroll inventory + basement pages: headers stay pinned.
- `npx tsc --noEmit` + `npx vitest run` clean.

## Out of scope (explicitly)

- Walkable exterior / spawning outside (option B of the entrance discussion —
  possible later project).
- Basement room art, layout, or dialogue.
- Scribbs player-sprite redesign.
- Real PNG atlas migration (stays on the hand-authored pipeline).
