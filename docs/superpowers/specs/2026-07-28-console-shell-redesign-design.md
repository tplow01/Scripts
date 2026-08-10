# Console Shell Redesign — Design Spec

**Date:** 2026-07-28 (finalized after full visual brainstorm)
**Scope:** `GameBoyShell.tsx` and its `components/shell/*` children — visual redesign of all three layouts (desktop, landscape, portrait) plus a structural fix for controls rendering off-screen on landscape phones/tablets.
**Reference:** Delta emulator's GBC skins (user-supplied screenshots) — one-piece molded body, corner-anchored controls, matte rubber black buttons.
**Approved mockups:** `.superpowers/brainstorm/66191-1785272033/content/` — `final-v2-tight.html` (layouts) + `controls-skin.html` option A (control skin).

## Problems being solved

1. **Off-screen controls (bug).** The landscape layout builds its flanks from fixed pixel constants (`150 × scale`); on short landscape viewports (e.g. 568×320) content clips off-screen; on tablets the scale factor pushes the A/B cluster into the padding.
2. **Visual quality.** The beige molded-plastic shell, floating button placement, and cluttered flanks don't meet the brand bar.

## Design language (all layouts)

- **Body:** ink gradient `#303034 → #232327 → #17171a`, soft molded creases (light edge top/left, dark falloff right, soft bottom vignette). No beige plastic anywhere.
- **Control skin — "Matte Rubber" (approved option A):** soft-touch rubber, deep emboss, light only from above. No gloss highlights.
- **A is the only pink control:** `radial-gradient(circle at 36% 28%, #FF9ECF, #FF4FA3 60%, #E23F90)`, engraved dark-pink glyph. Everything else stays ink rubber.
- **Wordmark strip:** flat black strip forming the bottom band of the screen bezel, flush against the screen (never protruding), `SCR!PTS` centred in Primary Pink `#FF8AC7` (Press Start 2P, letter-spaced, faint pink glow). Identical in all three layouts.
- **Screen:** subtle glass sheen sweeping the top corner; soft inner shadows (premium, not heavy vignette).
- **Speaker-dot motif:** dot grid `rgba(255,255,255,.32)`, radial mask fade.
- **Colour tokens** from BRAND.md; ink shades derive from Primary Black. All shell colours/materials defined once as CSS variables (single source of truth).

## The button kit (identical components on every device)

One `DPad`, one `RoundBtn`, one `PillBtn` — single source of styling; layouts pass only a clamped size (40px minimum touch target). No per-layout button CSS.

- **D-pad:** Delta-style rounded-lobe cross (large lobe radius, no square arms), fat embossed directional arrows, dished centre circle (recessed, not domed). Fills its zone with minimal padding.
- **A/B round buttons:** large — they fill their corner zone with ~4% padding (reference implementation 92px at desktop-mock scale vs the old 44px). Big engraved letters centred. A pink, B ink. GBC diagonal: A upper-right, B lower-left.
- **Utility pills (SOCIALS · INVENTORY · MUTE · ?):** wide molded rubber pills with the label engraved inside (dark-above/light-below text shadow). Same component on all devices.
- **Press state:** depress (translate down + reduced drop shadow), identical for click and touch.

## Final control set

There is **no SELECT, no START, no MENU** anywhere. The complete set:

| Control | Keyboard | Behaviour |
|---|---|---|
| D-pad | ←↑↓→ | Walk (hold) / move cursor |
| A (pink) | Z | Interact · talk · advance dialogue · confirm |
| B | X / ESC | Hold to run · back · cancel · close overlay |
| SOCIALS | — (click) | Overlay on the game screen: Instagram · TikTok · YouTube |
| INVENTORY | — (click) | Navigate straight to inventory |
| MUTE | — (click) | Toggle music mute |
| ? | — (click) | How-to-play overlay on the game screen (controls per device + goals) |

Any current in-game START/SELECT/MENU behaviour must be audited and remapped to A/B or the utility pills (or removed) during implementation.

## Geometry rule (the bug fix)

Every control anchors to a corner or edge using **percentages of the shell region plus safe-area insets** (`env(safe-area-inset-*)`); sizes via `clamp()`. The px-based `useControlScale` is removed. Nothing can render off-screen at any viewport (test points: 320×568, 568×320, 844×390, iPad both orientations, desktop ≥1024).

## Layouts

### Desktop (≥1024px, fine pointer)

- Bezel nearly full-bleed: ~1.6% side margins, ~2.5% top, wordmark strip as its bottom band.
- The four utility pills in a centred row tight beneath the strip (~1% bottom margin) — no dead plastic between screen and pills.
- No keycap hints; keyboard controls documented in the `?` overlay.

### Landscape (phone/tablet)

- Bezel spans the centre **74% of width** (13% flanks each side), from the top edge down to **~96% of the height**, rounded bottom corners, wordmark strip at its base.
- **Left flank:** SOCIALS and INVENTORY pills stacked at the top; D-pad centred at thumb height, tight against the bezel; dots motif bottom corner.
- **Right flank:** MUTE and ? pills stacked at the top; A/B diagonal centred at thumb height, tight against the bezel; dots motif bottom corner.

### Portrait (phone)

- **Top half: pure game screen, edge to edge** — no body visible.
- At the seam: the black wordmark strip, full width, rounded bottom corners.
- **Deck:** large D-pad left, A/B staggered diagonal right (both filling their zones), the four utility pills in a centred row along the deck's bottom, dots motif above them at right.

## Overlays

SOCIALS and ? render as overlays **on the game screen** (Phaser input frozen while open, as today — existing `SystemOverlay` open/close wiring retained). B / X / ESC closes. Overlays close on layout change.

## Component changes

- `GameBoyShell.tsx` — new layout trees; remove `useControlScale`; percentage/clamp geometry; remove SELECT/START/MENU wiring.
- `shell/DPad.tsx` — rounded-lobe cross, embossed arrows, dished centre; size prop only.
- `shell/RoundBtn.tsx` — large matte rubber restyle + pink `A` variant; engraved letters.
- `shell/PillBtn.tsx` — engraved-label-inside wide pill (the only pill variant that remains).
- `shell/ConsoleUtilityStrip.tsx` — replaced by the utility pills placed per layout (desktop row / landscape flank stacks / portrait deck row).
- `shell/SystemOverlay.tsx` — socials list + how-to-play content; MENU-driven overlay list removed.
- Wordmark strip lives in the shared `ScreenModule`.

## Testing

- Manual viewport sweep: 320×568, 390×844, 568×320, 844×390, 768×1024, 1024×768, 1280×800, 1440×900 — no control clips; screen aspect stays usable.
- Regression: dialogue advance, hold-to-walk (pointer capture on D-pad), hold-to-run on B, overlay open/close on touch and keyboard, mute toggle, inventory navigation.
- Audit and remap all in-game START/SELECT/MENU listeners.

## Out of scope

- Game-screen contents (Phaser world), inventory page, cart/checkout.
- Button press sound effects (possible follow-up).

## Change log

- 2026-07-28 — Initial spec.
- 2026-07-28 — Finalized: SELECT/START/MENU removed; utilities on all shells (desktop tight row, landscape flank stacks, portrait deck row); screens enlarged (desktop near-full-bleed, landscape 74%×96%); Delta-style matte-rubber control skin with zone-filling D-pad and A/B.
