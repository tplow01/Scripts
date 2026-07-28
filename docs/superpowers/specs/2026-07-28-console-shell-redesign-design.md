# Console Shell Redesign — Design Spec

**Date:** 2026-07-28
**Scope:** `GameBoyShell.tsx` and its `components/shell/*` children — visual redesign of all three layouts (desktop, landscape, portrait) plus a structural fix for controls rendering off-screen on landscape phones/tablets.
**Reference:** Delta emulator's GBC skins (user-supplied screenshots) — one-piece molded body, corner-anchored controls, rubbery black buttons.

## Problems being solved

1. **Off-screen controls (bug).** The landscape layout builds its flanks from fixed pixel constants (`150 × scale`), and the right flank stacks grille + A/B + utility strip vertically. On short landscape viewports (e.g. 568×320) content clips off-screen; on tablets the scale factor pushes the A/B cluster into the padding.
2. **Visual quality.** The beige molded-plastic shell, floating button placement, and cluttered flanks don't meet the brand bar.

## Design language (all layouts)

- **Body:** ink gradient `#2b2b2e → #161618` (vertical), with soft molded creases — a light edge down the left/top (`rgba(255,255,255,.05–.07)`) and a dark falloff right (`rgba(0,0,0,.25)`). No beige plastic anywhere.
- **Buttons:** rubbery near-black — `radial-gradient(circle at 35% 28%, #383838, #131313)` with a 1px `rgba(255,255,255,.12)` outline, drop shadow below, subtle inner top-light. Pressed state depresses (translate + reduced shadow), same interaction on click and touch.
- **A is the only pink control:** `radial-gradient(#FF8AC7 → #FF4FA3)`, dark `#0D0D0D` glyph. Everything else stays ink.
- **Wordmark strip:** a flat black strip forming the bottom band of the screen bezel, flush against the screen (never protruding), with `SCR!PTS` centred in Primary Pink `#FF8AC7` (Press Start 2P, letter-spaced). Identical treatment in all three layouts.
- **Speaker-dot motif:** small dot grid in `rgba(255,255,255,.3)` on the ink body, soft radial mask so it fades at the edges.
- **Colour tokens** come from BRAND.md (`#0D0D0D`, `#F7F7F5`, `#FF8AC7`, `#FF4FA3`, `#6F6F73`); the ink body shades derive from Primary Black. Keep all shell colours in one theme location.

## Geometry rule (the bug fix)

Every control is anchored to a corner or edge using **percentages of the shell region plus safe-area insets** (`env(safe-area-inset-*)`). No fixed pixel flank widths; the `useControlScale` px-based scaler is removed. Buttons get sensible min/max sizes via `clamp()` so they stay thumbable on small phones and don't balloon on tablets. Nothing can render off-screen at any viewport (tested reference points: 320×568, 568×320, 844×390, iPad portrait/landscape, desktop ≥1024).

## Layouts

### Landscape (phone/tablet)

Delta-GBC arrangement, screen-dominant:

- Bezel spans the centre **64% of width** (18% flanks each side), dropping from the top edge, rounded bottom corners; wordmark strip as its bottom band.
- **Top-left:** MENU pill (label beneath). **Top-right:** speaker dots.
- **Bottom-left:** D-pad (~12.5% of width, clamped). **Bottom-right:** A/B on the GBC diagonal (A upper-right pink, B lower-left).
- **Below the strip, centred:** SELECT and START pills with labels beneath.

### Portrait (phone)

- **Top half: pure game screen, edge to edge** — no body visible at the top or sides.
- At the seam: the black wordmark strip, full width, rounded bottom corners — the top edge of the console.
- **Deck (bottom half):** large D-pad left; A/B staggered diagonal right (A high/pink, B low); bottom row of MENU · SELECT · START pills (labels beneath) with the speaker-dot motif at bottom-right.

### Desktop (≥1024px, fine pointer)

Current structure retained: full-bleed bezel with the game screen, bottom rail on the body.

- Bezel gets the wordmark strip as its bottom band (wordmark leaves the old in-bezel position).
- **Bottom rail:** the four utility pills centred — molded hardware pills identical in finish to the handheld ones, but with the **label engraved inside the pill** (dark-above/light-below text shadow): `SOCIALS · INVENTORY · MUTE · ?`.
- Softer bezel inner shadows, larger radii — premium hardware, not heavy vignette.
- No permanent keycap hints; keyboard controls are documented in the `?` overlay.

## Buttons & behaviour

| Control | Keyboard | World | Menus/dialogs |
|---|---|---|---|
| D-pad | ←↑↓→ | Walk (hold) | Move cursor |
| A (pink) | Z | Interact / talk / advance | Confirm |
| B | X | Hold to run | Back / cancel / close overlay |
| START | ENTER | (existing game role) | — |
| SELECT | SHIFT | (existing game role) | — |
| MENU | ESC | Opens utility overlay (handhelds) | Closes overlay |

### The four utility actions

Rendered as overlays **on the game screen** (Phaser input frozen while open, as today):

1. **SOCIALS** — overlay listing Instagram · TikTok · YouTube links.
2. **INVENTORY** — navigates straight to the inventory.
3. **MUTE** — toggles music mute only.
4. **?** — how-to-play overlay: control mapping (touch or keyboard per device) and basic goals.

**Desktop:** the four pills live in the bottom rail. **Phone/tablet:** the MENU pill opens an overlay containing the same four actions — the shell itself stays clean (the old `ConsoleUtilityStrip` disappears from handheld shells). B / ESC / X closes any overlay.

## Component changes

- `GameBoyShell.tsx` — new layout trees per above; remove `useControlScale`; percentage/clamp geometry.
- `shell/PillBtn.tsx` — new molded-rubber pill; variants: label-beneath (handheld) and label-inside (desktop utility).
- `shell/RoundBtn.tsx` — ink rubber restyle + pink `A` variant.
- `shell/DPad.tsx` — ink restyle, size via percentage/clamp.
- `shell/ConsoleUtilityStrip.tsx` — desktop-only, rebuilt as the pill rail; handheld usage removed.
- `shell/SystemOverlay.tsx` — gains the MENU utility list (handhelds), how-to-play (`?`) content, socials list; existing open/close + input-freeze wiring retained.
- Wordmark strip becomes part of the shared `ScreenModule`.

## Error handling / edge cases

- Layout switching (rotation, resize across the 1024px boundary) keeps the existing `useShellLayout` behaviour; no new logic.
- Safe-area insets applied on notched devices so corner controls never sit under system UI.
- Overlays close on layout change to avoid orphaned state.

## Testing

- Manual viewport sweep via browser devtools at: 320×568, 390×844, 568×320, 844×390, 768×1024, 1024×768, 1280×800, 1440×900 — assert no control clips outside the viewport and screen aspect stays usable.
- Existing keyboard controls unchanged — regression-check dialogue advance, walking, overlay close keys.
- Pointer-capture press/release behaviour on D-pad (hold-to-walk) retained — verify on touch.

## Out of scope

- Game-screen contents (Phaser world), inventory page, cart/checkout.
- Any change to game logic or input mapping beyond what's listed.
- Sound effects for button presses (possible follow-up).

## Change log

- 2026-07-28 — Initial spec from visual brainstorm (Delta-reference ink design, approved mockups `final-design-v2.html` + `desktop-pills-v4.html` in `.superpowers/brainstorm/66191-1785272033/content/`).
