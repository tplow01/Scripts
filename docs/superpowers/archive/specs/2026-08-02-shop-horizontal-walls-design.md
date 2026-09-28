# Shop: horizontal walls only

**Date:** 2026-08-02
**Scope:** The Main room (shop floor) only. The Basement is untouched.

## Problem

The shop currently draws a wall face on every wall tile, picked by
`wallVariant()` — capped tops, shaded side faces, bases and fills. The result
is a fully boxed-in room with vertical wall faces running down both edges.

We want the opposite read: no vertical walls at all. The shop should show
exactly **two** wall faces, both horizontal:

1. The wall behind the vinyl deck (top of the room).
2. The wall above the horizontal clothing rail (the L-shaped cutout's edge).

Everywhere else, the floor meets flat black.

Hand-authored art for both walls now exists, so this change lands the murals at
the same time as the rendering change.

## Source art

| Set | Location | Slices |
| --- | --- | --- |
| Vinyl wall | `~/Documents/Sprites/Vinyl_wall/` | 8 (one middle slice dropped → 7 in game) |
| Clothing wall | `~/Documents/Sprites/Clothing_Wall/` | 8 |

Each slice is a 6667x6667 RGBA square — one tile of a continuous wall, stitched
left to right. They are **sequential segments, not variants**.

Verified silhouettes (alpha channel):

- Vinyl slice 1 — top-**left** corner cut at 45 degrees across the full tile.
- Vinyl slice 8 — top-**right** corner cut at 45 degrees.
- Clothing slice 1 — full square, no cut.
- Clothing slice 8 — top-**right** corner cut at 45 degrees.

So both walls are trapezoids: full width at the base, tapering at the chamfered
ends. The vinyl wall is chamfered at both ends (freestanding); the clothing wall
is square on the left (meets a corner) and chamfered on the right.

Both are currently flat lilac — geometry only, no surface detail yet.

**Naming inconsistency:** seven clothing files are
`Clothing_wall_Clothing_wall_N.png`; the eighth is `Clothing_wall-08.png`. The
importer accepts both patterns rather than requiring a re-export.

## Design

### 1. Geometry and collision — unchanged

The 17x17 grid, `buildTiles`'s L-shape, and every wall tile stay exactly as they
are. This is purely a rendering change plus two new art strips.

Consequently every hand-authored coordinate in `mainRoom.ts` remains valid:
patrol routes, seat tiles, checkout holes, `HEATH_INTRO_PATH`, and
`heathPathAlongCounter`.

The map edges keep their wall tiles, so they remain a solid boundary — the
player cannot walk off. They simply stop drawing a wall face.

### 2. Wall rendering

In `WorldScene.loadRoom`, when `roomId === "main"`, every wall tile renders the
existing flat-black `ext-void` texture instead of a `wallVariant()` face. This
is already how the exterior apron and the southern border are drawn, so the
`isOuterSouthEdge` special case dissolves into the general rule and is removed.

`wallVariant.ts` is not modified. The Basement still calls it and keeps its
FireRed depth treatment.

Net effect: the shop's floor silhouette meets black on every side, with no cap
or trim stripe anywhere. The only wall faces on screen are the two murals.

### 3. Art pipeline

New `scripts/import-walls.py`, a sibling to `import-sprites.py` following its
conventions. It reads each source square, nearest-neighbour downscales it to a
**64px tile**, and writes to `public/assets/walls/`.

64px matches the character canvas. `placeTile` calls `setDisplaySize(32, 32)`
regardless of source resolution, so the extra pixels buy crispness on hi-dpi
displays and nothing else.

Two requirements specific to this art:

- **No bounding-box crop and no near-white masking.** The 45-degree chamfers
  *are* transparency. The character importer's union-bbox crop would trim the
  triangles down to their opaque content and destroy the taper. This importer
  does a straight resize preserving the alpha channel.
- **Order by trailing number**, accepting both source filename patterns.

Output texture keys: `vinyl-wall-1` … `vinyl-wall-8`, `clothing-wall-1` …
`clothing-wall-8`. Output paths: `/assets/walls/<key>.png`.

New `src/game/art/walls.ts` is the single source of truth for mural keys and
paths, mirroring what `characters.ts` does for the cast. `BootScene` loads from
it; `registry.ts` resolves through it.

### 4. World data

The murals are entries in `mainRoom.decorations`. `WorldScene` already has an
`onWall` depth bucket for wall-mounted art, which these join.

Sixteen individually-keyed 1x1 decorations would drown the file, so `walls.ts`
exports a `mural()` helper expanding one declaration into per-tile decorations:

```ts
...mural("vinyl-wall", { tileX: C(1), tileY: R("a"), tiles: 8 }),
...mural("clothing-wall", { tileX: C(8), tileY: R("g"), tiles: 8 }),
```

Placement:

- **Vinyl wall** — row `a`, interior cols **1–7**. Col 0 is left bare; the left
  chamfer floats in open space, which is what a both-ends-chamfered freestanding
  wall is drawn to do.

  The source art is 8 slices, one wider than the row it hangs on, so the
  importer drops a middle slice (`drop` in `MURALS`) and renumbers the rest
  1–7. Slices 2–7 of the vinyl export are byte-identical flat wall, so nothing
  unique is lost — only the two chamfered ends carry distinct art, and both
  survive. With 7 tiles the right chamfer terminates flush at the cutout corner
  instead of overhanging it. Dropping an END slice is rejected by the importer,
  since that would cut off a chamfer.
- **Clothing wall** — row `g`, interior cols **8–15**. Exactly covers the
  cutout's bottom edge, flush with the map edge on the right.

Both are non-solid. The tiles beneath are already walls, so collision is
unchanged.

## Out of scope

**Floor bevelling.** The idea of chamfering the floor panel where it meets a
wall's diagonal end is deliberately deferred. Two reasons:

1. Of the three chamfered wall ends, only the vinyl wall's left end (col 1) has
   floor beneath and beside it. Vinyl's right end at col 8 has the black cutout
   below; the clothing wall's right end at col 15 has `rail-v` directly beneath.
   A general "every chamfered end" rule resolves to one tile in practice.
2. The chamfer is a 45-degree cut on flat lilac placeholder art. Whether the
   floor should echo it is far easier to judge on screen than in tile
   coordinates.

The floor panel is procedurally generated (`buildFloorPanel` in `hiresArt.ts`),
so adding a chamfered variant afterwards is cheap.

**The bookcase at b1** stays where it is. If the floor bevel is added later it
will be partly occluded there; moving a fixture to expose a corner treatment is
not worth it, and the decision is trivially revisitable.

**Other rooms.** The Basement keeps its current wall treatment. Extending the
horizontal-walls-only rule to it is a separate piece of work.

## Verification

- **Unit test** in `__tests__/`, alongside the existing suite: every mural tile
  lands on a tile that is `"wall"` in the room data; the two murals do not
  overlap; each declares exactly the 8 slices its art provides. This catches the
  failure mode that actually bites — a mural drifting off its wall after a
  future geometry edit.
- **Visual check** via `/browse` against the dev server: no wall faces survive
  anywhere in the shop, the two murals sit flush with no gap or overlap, and the
  chamfers read correctly against the black void.
