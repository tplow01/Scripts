# Authored Floor Panels — Design

**Date:** 2026-08-01
**Status:** Approved for planning

## Goal

Replace the procedural shop and basement floor art with the authored
corner-notch panel supplied as `Shop_Floor_Panel_.png` and
`Basement_Floor_Panel_.png`, and remove the behind-counter staff floor added
earlier today.

## Source art

Both source files are 6667×6667 RGBA and carry exactly two colours each. Their
geometry is identical; only the colours differ.

| File | Field | Corner mark |
|---|---|---|
| `Shop_Floor_Panel_.png` | `#FAFAF9` (98.82%) | `#C1C0C4` (1.17%) |
| `Basement_Floor_Panel_.png` | `#0C0C0C` (98.82%) | `#707074` (1.17%) |

The remaining fractions of a percent are anti-aliasing artefacts at the notch
edges and are discarded — these are two-colour panels.

## 1. The panel

`buildFloor(dark)` is replaced by `buildFloorPanel(field, mark)`, authored at
the locked 32px native size, **one panel per tile**.

The pattern, sampled from the source at 32×32:

```
##............................##
#..............................#
   … 28 rows of flat field …
#..............................#
##............................##
```

Each corner carries a 3-pixel L: the corner pixel plus one neighbour along each
edge. Exact mark coordinates:

- top-left: (0,0) (1,0) (0,1)
- top-right: (31,0) (30,0) (31,1)
- bottom-left: (0,31) (1,31) (0,30)
- bottom-right: (31,31) (30,31) (31,30)

Tiled, the four L's of neighbouring tiles meet to form a small cross at every
tile junction, seating the floor seam on the movement grid.

There is no interior pattern. The current bevel, grout and deterministic grain
in `buildFloor` are deleted rather than kept alongside.

## 2. Colours

Snapped to BRAND.md tokens where one exists:

| | Field | Corner mark |
|---|---|---|
| Shop | `#F7F7F5` — paper (palette `w`) | `#C1C0C4` — new palette entry |
| Basement | `#0D0D0D` — ink (palette `k`) | `#6F6F73` — brand grey (palette `G`) |

Three of the four map onto existing palette entries. The shop's mark has no
brand equivalent, so `#C1C0C4` is added to the palette as a single new entry: a
neutral tint between paper and the brand grey. Source values differ from the
snapped ones by at most three points per channel and are imperceptible on
screen.

## 3. Removing the staff floor

The behind-counter shading shipped earlier today (commit `529ea79`) is removed
in full — not disabled, not left behind a flag:

- `buildStaffFloor` and `hiresStaffFloorArt` in `src/game/art/hiresArt.ts`
- the `hiresStaffFloorArt` import, the `"floor-staff"` entry in `TEXTURE_KEYS`,
  and its `bakePixelArt` call in `src/game/art/registry.ts`
- the four `floor-staff` decorations at column 1, rows l-o, in
  `src/game/world/mainRoom.ts`
- `"floor-staff"` in the `flatFloor` set in `src/game/scenes/WorldScene.ts`
- the staff-floor assertion in `__tests__/hiresArt.test.ts` and the
  `floor-staff` resolution test in `__tests__/registry.test.ts`

Those tiles revert to plain shop floor; the counter reads as a barrier on its
own.

The solid-black exterior from the same commit is unaffected and stays.

## 4. Tests

- Both floor arts are 32×32.
- Each uses exactly two distinct palette characters.
- The corner mark appears at all four corners and nowhere in the interior.
- The shop and basement panels share identical geometry — the same mark/field
  mask — so a future edit cannot silently give one a different shape from the
  other.
- `resolveTextureKey("floor-staff")` throws, proving the key is gone rather than
  orphaned.

## Known trade-off

At one panel per tile the floor grid is twice as coarse as the outgoing
procedural floor. That is intentional — it seats the seams on the movement grid
— but it is the most visible consequence. If it reads too plain in game, the
remedy is to author the panel at 16px so four tile into each 32px cell; that is
a change to the builder's dimensions only.

## Out of scope

- The catalog/admin work (separate spec).
- Any other art, the character cast, or room geometry.
- The wall, rug, mat and emblem art, which sit on top of the floor unchanged.
