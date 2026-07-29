# SCR!PTS Console Shell Redesign — Design Spec

**Date:** 2026-07-29
**Scope:** Visual + layout redesign of the Game Boy shell (`components/GameBoyShell.tsx` and `components/shell/*`) across all three layouts: portrait, landscape, desktop. Behaviour (input handling, overlays, hold-to-walk) is unchanged.

## Design language (all devices)

- **Shell:** one flat fill of Secondary Pink `#FF4FA3`. No gradients, creases, vignettes, or molded-plastic shading on the body. `INK_BODY` / `INK_CREASES` are retired.
- **Wordmark strip:** flat black `#0D0D0D` band carrying the SCR!PTS wordmark in Press Start 2P, pink `#FF8AC7`.
- **Controls contrast rule:** the shell is flat; the physical controls (D-pad, A/B, utility pills) stay molded/3D black rubber. That contrast is the design.
- **Speaker-dot motif (`Dots`):** deleted everywhere.
- **Cart:** not on the shell. Utility set stays four actions: `social`, `inventory`, `mute`, `help`.

## Controls

### D-pad
- One seamless symmetric cross (single SVG path, not two overlapping bars). All four lobes identical in size and shape, rounded outer corners.
- Molded-rubber treatment: subtle top-light gradient (`#2c2c2f → #101012`), drop shadow onto the shell.
- Embossed arrows with **rounded** corners (round stroke-joins, no sharp points), dished centre circle.
- Hold-to-walk pointer zones unchanged.

### A / B buttons
- Both matte black molded rubber (`radial-gradient` face, existing RUBBER treatment). The pink A face is retired.
- Both letters in Primary Pink `#FF8AC7`, Press Start 2P.
- Press feedback (sink + shadow tighten) unchanged.

### Utility buttons — "DMG unit"
- SOCIALS and INVENTORY: real-Game-Boy Start/Select style — a small **blank** molded black pill (no text inside), with the label printed flat on the shell below it (portrait/landscape) or beside it (desktop). Label: bold sans, black `#0D0D0D`.
- MUTE and ?: **flat**, not 3D — a black speaker icon and a black monospace `?` printed directly on the shell. Mute active state: icon switches to muted-speaker glyph (slash), same flat treatment.
- Hit areas for all utilities stay ≥ 44px even where the visual is small.

## Portrait (mobile)

- **Screen:** full-bleed, edge-to-edge, exactly the top 50% of the viewport. No bezel padding, no corner radius at the top.
- **Strip:** directly below the screen, full width.
- **Deck (remaining ~50%):** flat pink, containing:
  - D-pad left, A/B right (positions/sizing as today).
  - SOCIALS + INVENTORY units centred on one line in the open space below the D-pad/A-B clusters, small.
  - Flat MUTE icon bottom-left corner, flat ? bottom-right corner (safe-area aware).

## Landscape (mobile)

- **Screen:** centred, black strip beneath it (left/right bezel padding may remain as part of the strip frame).
- **Flanks:** flat pink. Controls ride high — D-pad (left) and A/B (right) centred in the **upper third** at thumb height.
- Below each cluster: the flank's utility stack — SOCIALS unit then flat speaker icon on the left; INVENTORY unit then flat ? on the right, each centred in its flank near the bottom.
- Overlay-close and rotation behaviour unchanged.

## Desktop

- **Browser fills with flat pink.** Centred in it: a **16:9 game screen** wrapped by the black strip on **all four sides**; the SCR!PTS wordmark sits in the bottom band of that frame.
- The screen should be as large as the viewport allows while preserving 16:9 and leaving room for the utility row — margins stay slim (screen "slightly bigger" than the first mockup; on the order of a few percent viewport margin, not the current 2.5%/1.6% plus rail).
- **Utility row directly below the frame,** centred, on the pink: SOCIALS unit, INVENTORY unit, flat speaker, flat ? — labels beside the pills at this size.
- Keyboard input unchanged.

## Implementation notes

- `components/shell/theme.ts` is the single home for the new recipes: `SHELL_PINK = '#FF4FA3'`, strip black, rubber faces; delete `INK_BODY`, `INK_CREASES`, `PINK_FACE`, `PINK_SHADOW`, `PILL_FACE`, `PILL_SHADOW` (replaced by the DMG unit + flat icon styles).
- `DPad.tsx`: replace the two-bar construction with the single symmetric SVG cross path.
- `PillBtn.tsx`: becomes the DMG unit (blank pill + external label); new small flat `IconBtn` (or inline) for mute/?, replacing pill-rendered MUTE/? everywhere.
- `RoundBtn.tsx`: drop the `pink` branch; both labels `#FF8AC7`.
- `GameBoyShell.tsx`: remove `Dots`; rework the three layout blocks per above. `ScreenModule` gains the four-sided-frame variant for desktop and loses bezel padding in portrait.
- Existing `SystemOverlay`, controls plumbing (`lib/controls.ts`), and Phaser integration untouched.

## Error handling / edge cases

- Very short landscape viewports: utility stacks may not fit below raised clusters — clamp cluster position downward before shrinking controls.
- Ultra-wide desktop: 16:9 screen height-limited; frame stays snug to the screen, utilities stay directly below the frame (not pinned to viewport bottom).
- Mute active state must remain visible despite the flat treatment (glyph change, not colour-only).

## Testing

- Visual pass on all three layouts (real device or devtools emulation) incl. iPhone safe areas.
- Confirm D-pad hold-to-walk, A/B, overlay open/close, mute toggle still work in all layouts.
- Confirm no remaining references to deleted theme tokens compile-wise.
