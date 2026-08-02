# Shop Horizontal Walls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove every vertical wall face from the shop, leaving only two horizontal walls — behind the vinyl deck and above the clothing rail — rendered from newly imported 8-slice hand-drawn murals.

**Architecture:** Room geometry and collision are untouched; this is a rendering change plus new art. `WorldScene` stops calling `wallVariant()` for the Main room and draws every wall tile as flat black `ext-void`. A new `art/walls.ts` module is the single source of truth for mural texture keys and paths (mirroring `art/characters.ts` for the cast), and exports a `mural()` helper that expands one declaration into per-tile `Decoration`s for `mainRoom.ts`.

**Tech Stack:** TypeScript, Next.js 15, Phaser 3, Vitest, Python 3 + Pillow (asset import only).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-02-shop-horizontal-walls-design.md`.
- Scope is the **Main room only**. `wallVariant.ts` is NOT modified; the Basement keeps its existing wall treatment.
- Room geometry, collision, and every hand-authored coordinate in `mainRoom.ts` stay unchanged (patrols, seats, checkout holes, `HEATH_INTRO_PATH`, `heathPathAlongCounter`).
- Mural tiles import at **64px** per tile, output to `public/assets/walls/`.
- The importer must NOT bounding-box crop and must NOT near-white mask. The 45° chamfers are transparency; cropping destroys them.
- Texture keys: `vinyl-wall-1` … `vinyl-wall-8`, `clothing-wall-1` … `clothing-wall-8`.
- Source art: `~/Documents/Sprites/Vinyl_wall/` (8 files, `Vinyl_wall_Vinyl_Wall_N.png`) and `~/Documents/Sprites/Clothing_Wall/` (7 files `Clothing_wall_Clothing_wall_N.png` + 1 file `Clothing_wall-08.png`).
- Run tests with `npm test` (vitest). Path alias `@/` maps to `src/`.
- Follow the existing house comment style: explain *why*, reference the layout notation (rows a–o, cols 1–15).

---

### Task 1: `art/walls.ts` — mural keys, paths, and the `mural()` helper

**Files:**
- Create: `src/game/art/walls.ts`
- Test: `__tests__/walls.test.ts`

**Interfaces:**
- Consumes: `Decoration` from `@/game/world/types`.
- Produces:
  - `type MuralId = "vinyl-wall" | "clothing-wall"`
  - `const MURAL_IDS: readonly MuralId[]`
  - `const MURAL_SLICES: Record<MuralId, number>` — both are `8`
  - `muralTileKey(id: MuralId, index: number): string` — 1-indexed, returns e.g. `"vinyl-wall-1"`
  - `muralTilePath(id: MuralId, index: number): string` — returns `/assets/walls/<key>.png`
  - `allMuralTiles(): Array<{ id: MuralId; index: number }>`
  - `isMuralTile(key: string): boolean`
  - `mural(id: MuralId, at: { tileX: number; tileY: number; tiles: number }): Decoration[]`

- [ ] **Step 1: Write the failing test**

Create `__tests__/walls.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  MURAL_IDS,
  MURAL_SLICES,
  allMuralTiles,
  isMuralTile,
  mural,
  muralTileKey,
  muralTilePath,
} from "@/game/art/walls";

describe("mural art keys", () => {
  it("names both shop murals", () => {
    expect(MURAL_IDS).toEqual(["vinyl-wall", "clothing-wall"]);
  });

  it("declares eight slices per mural, matching the authored art", () => {
    expect(MURAL_SLICES["vinyl-wall"]).toBe(8);
    expect(MURAL_SLICES["clothing-wall"]).toBe(8);
  });

  it("builds 1-indexed texture keys and paths", () => {
    expect(muralTileKey("vinyl-wall", 1)).toBe("vinyl-wall-1");
    expect(muralTileKey("clothing-wall", 8)).toBe("clothing-wall-8");
    expect(muralTilePath("vinyl-wall", 3)).toBe("/assets/walls/vinyl-wall-3.png");
  });

  it("enumerates every slice of every mural", () => {
    expect(allMuralTiles()).toHaveLength(16);
    expect(allMuralTiles()[0]).toEqual({ id: "vinyl-wall", index: 1 });
  });

  it("recognises mural keys and rejects other art keys", () => {
    expect(isMuralTile("vinyl-wall-8")).toBe(true);
    expect(isMuralTile("vinyl-wall-9")).toBe(false);
    expect(isMuralTile("speaker")).toBe(false);
  });
});

describe("mural() expansion", () => {
  it("lays slices left to right from the anchor tile", () => {
    const tiles = mural("clothing-wall", { tileX: 8, tileY: 7, tiles: 8 });
    expect(tiles).toHaveLength(8);
    expect(tiles[0]).toEqual({ tileX: 8, tileY: 7, artKey: "clothing-wall-1" });
    expect(tiles[7]).toEqual({ tileX: 15, tileY: 7, artKey: "clothing-wall-8" });
  });

  it("never marks a mural slice solid — collision comes from the wall tile beneath", () => {
    expect(mural("vinyl-wall", { tileX: 1, tileY: 1, tiles: 8 }).every((t) => !t.solid)).toBe(true);
  });

  it("refuses a tile count the authored art cannot fill", () => {
    expect(() => mural("vinyl-wall", { tileX: 1, tileY: 1, tiles: 6 })).toThrow(
      /vinyl-wall has 8 slices/,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- walls`
Expected: FAIL — cannot resolve `@/game/art/walls`.

- [ ] **Step 3: Write the implementation**

Create `src/game/art/walls.ts`:

```ts
import type { Decoration } from "@/game/world/types";

/**
 * The shop's wall murals — the ONLY place that knows which walls exist and how
 * their slices are named.
 *
 * Each mural is one continuous hand-drawn wall, exported as a run of square
 * tiles that stitch left to right (see `scripts/import-walls.py`). They are
 * sequential segments, NOT interchangeable variants: slice 3 only reads
 * correctly between slice 2 and slice 4.
 *
 * The end slices carry 45° chamfers in their alpha, so each wall reads as a
 * trapezoid — full width at the base, tapering at the top ends. That taper is
 * why the importer must never bounding-box crop these.
 */

export type MuralId = "vinyl-wall" | "clothing-wall";

export const MURAL_IDS = ["vinyl-wall", "clothing-wall"] as const;

/** How many slices each mural was authored as. */
export const MURAL_SLICES: Record<MuralId, number> = {
  "vinyl-wall": 8,
  "clothing-wall": 8,
};

/** Texture key for one slice — also the world-data `artKey`. 1-indexed. */
export const muralTileKey = (id: MuralId, index: number): string => `${id}-${index}`;

/** Where BootScene loads that slice from. */
export const muralTilePath = (id: MuralId, index: number): string =>
  `/assets/walls/${muralTileKey(id, index)}.png`;

/** Every slice of every mural, in draw order. */
export function allMuralTiles(): Array<{ id: MuralId; index: number }> {
  return MURAL_IDS.flatMap((id) =>
    Array.from({ length: MURAL_SLICES[id] }, (_, i) => ({ id, index: i + 1 })),
  );
}

const TILE_KEYS = new Set(allMuralTiles().map(({ id, index }) => muralTileKey(id, index)));

/** True when a texture key names a mural slice (rather than a prop or character). */
export const isMuralTile = (key: string): boolean => TILE_KEYS.has(key);

/**
 * Expand one mural into per-tile decorations, laid left to right from the
 * anchor. Sixteen hand-written 1x1 entries would drown `mainRoom.ts`; this
 * keeps a wall to a single readable line there.
 *
 * Slices are never solid: they mount on tiles that are already `wall` in the
 * room data, so collision is unchanged by hanging art on them.
 */
export function mural(
  id: MuralId,
  at: { tileX: number; tileY: number; tiles: number },
): Decoration[] {
  if (at.tiles !== MURAL_SLICES[id]) {
    throw new Error(
      `mural("${id}") asked for ${at.tiles} tiles, but ${id} has ${MURAL_SLICES[id]} slices.`,
    );
  }
  return Array.from({ length: at.tiles }, (_, i) => ({
    tileX: at.tileX + i,
    tileY: at.tileY,
    artKey: muralTileKey(id, i + 1),
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- walls`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/game/art/walls.ts __tests__/walls.test.ts
git commit -m "feat(game): add wall mural key registry and mural() expander"
```

---

### Task 2: `scripts/import-walls.py` — import the authored wall art

**Files:**
- Create: `scripts/import-walls.py`
- Create (generated): `public/assets/walls/vinyl-wall-{1..8}.png`, `public/assets/walls/clothing-wall-{1..8}.png`

**Interfaces:**
- Consumes: nothing from earlier tasks (the key naming is duplicated deliberately — this is a standalone build script, exactly like `import-sprites.py`).
- Produces: 16 PNGs at `public/assets/walls/`, each 64x64 RGBA, consumed by Task 3.

- [ ] **Step 1: Write the importer**

Create `scripts/import-walls.py`:

```python
#!/usr/bin/env python3
"""Import hand-authored wall murals into game-ready 64px tiles.

Source art lives in ~/Documents/Sprites/<Wall>/ as one square PNG per tile,
stitching left to right into a single continuous wall.

Unlike the character importer, this one does NOT crop to the content bounding
box and does NOT mask near-white. The end tiles carry 45-degree chamfers in
their alpha channel -- the wall is a trapezoid, full width at the base and
tapering at the top ends. Cropping to content would trim those triangles away
and square the wall off.

Source filenames are inconsistent (Illustrator exported the last clothing slice
under a different pattern), so tiles are ordered by their trailing number
rather than by name.
"""
import re
from pathlib import Path

from PIL import Image

SRC = Path.home() / "Documents" / "Sprites"
OUT = Path(__file__).resolve().parent.parent / "public" / "assets" / "walls"

# Rendered at 32px by placeTile's setDisplaySize; 64 matches the character
# canvas and buys crispness on hi-dpi displays.
TILE = 64

# Source folder -> output key prefix, and how many slices to expect.
MURALS = {
    "Vinyl_wall": ("vinyl-wall", 8),
    "Clothing_Wall": ("clothing-wall", 8),
}


def slice_index(path: Path) -> int:
    """Trailing number in the filename -- the tile's left-to-right position."""
    match = re.search(r"(\d+)(?!.*\d)", path.stem)
    if not match:
        raise SystemExit(f"cannot read a slice number from: {path.name}")
    return int(match.group(1))


def import_mural(folder: str, prefix: str, expected: int) -> None:
    src_dir = SRC / folder
    if not src_dir.is_dir():
        raise SystemExit(f"missing source folder: {src_dir}")

    paths = sorted(src_dir.glob("*.png"), key=slice_index)
    if len(paths) != expected:
        raise SystemExit(
            f"{folder}: expected {expected} slices, found {len(paths)}"
        )

    indices = [slice_index(p) for p in paths]
    if indices != list(range(1, expected + 1)):
        raise SystemExit(f"{folder}: slices are not numbered 1..{expected}: {indices}")

    OUT.mkdir(parents=True, exist_ok=True)
    for path in paths:
        img = Image.open(path).convert("RGBA")
        if img.width != img.height:
            raise SystemExit(f"{path.name}: slices must be square, got {img.size}")
        # Nearest-neighbour, no crop, no masking -- alpha is load-bearing here.
        tile = img.resize((TILE, TILE), Image.NEAREST)
        out_path = OUT / f"{prefix}-{slice_index(path)}.png"
        tile.save(out_path)
        print(f"  {path.name} -> {out_path.name}")


def main() -> None:
    for folder, (prefix, expected) in MURALS.items():
        print(f"{folder}:")
        import_mural(folder, prefix, expected)


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run the importer**

Run: `python3 scripts/import-walls.py`
Expected: 16 lines of `<source> -> <output>`, no errors.

- [ ] **Step 3: Verify the output is correct and the chamfers survived**

Run:

```bash
python3 -c "
from PIL import Image
for key in ['vinyl-wall-1','vinyl-wall-8','clothing-wall-1','clothing-wall-8']:
    im = Image.open('public/assets/walls/%s.png' % key).convert('RGBA')
    a = im.split()[3]
    corners = {
        'TL': a.getpixel((2, 2)), 'TR': a.getpixel((61, 2)),
        'BL': a.getpixel((2, 61)), 'BR': a.getpixel((61, 61)),
    }
    print(key, im.size, {k: ('opaque' if v > 128 else 'clear') for k, v in corners.items()})
"
```

Expected exactly:

```
vinyl-wall-1 (64, 64) {'TL': 'clear', 'TR': 'opaque', 'BL': 'opaque', 'BR': 'opaque'}
vinyl-wall-8 (64, 64) {'TL': 'opaque', 'TR': 'clear', 'BL': 'opaque', 'BR': 'opaque'}
clothing-wall-1 (64, 64) {'TL': 'opaque', 'TR': 'opaque', 'BL': 'opaque', 'BR': 'opaque'}
clothing-wall-8 (64, 64) {'TL': 'opaque', 'TR': 'clear', 'BL': 'opaque', 'BR': 'opaque'}
```

If any expected-`clear` corner reads `opaque`, the chamfer was destroyed — the importer cropped or masked. Fix before continuing.

- [ ] **Step 4: Commit**

```bash
git add scripts/import-walls.py public/assets/walls
git commit -m "feat(art): import vinyl and clothing wall murals as 64px tiles"
```

---

### Task 3: Load and resolve mural textures

**Files:**
- Modify: `src/game/scenes/BootScene.ts` (the `preload` method)
- Modify: `src/game/art/registry.ts` (imports at the top, and `resolveTextureKey`)
- Test: `__tests__/walls.test.ts` (append a new `describe` block)

**Interfaces:**
- Consumes: `allMuralTiles`, `muralTileKey`, `muralTilePath`, `isMuralTile` from Task 1; the PNGs from Task 2.
- Produces: `resolveTextureKey("vinyl-wall-1")` returns the key instead of throwing, so Task 4's world data can reference murals.

- [ ] **Step 1: Write the failing test**

Append to `__tests__/walls.test.ts`:

```ts
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { resolveTextureKey } from "@/game/art/registry";

const PUBLIC = join(process.cwd(), "public");

/** Width/height straight out of a PNG's IHDR chunk. */
function pngSize(file: string): { width: number; height: number } {
  const buf = readFileSync(file);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe("mural assets", () => {
  it("has an imported 64px PNG for every declared slice", () => {
    for (const { id, index } of allMuralTiles()) {
      const file = join(PUBLIC, muralTilePath(id, index));
      expect(existsSync(file), `missing ${muralTilePath(id, index)}`).toBe(true);
      expect(pngSize(file)).toEqual({ width: 64, height: 64 });
    }
  });

  it("resolves every mural key through the art registry", () => {
    for (const { id, index } of allMuralTiles()) {
      const key = muralTileKey(id, index);
      expect(resolveTextureKey(key)).toBe(key);
    }
  });

  it("still rejects art keys that are neither prop, character, nor mural", () => {
    expect(() => resolveTextureKey("not-a-real-key")).toThrow(/Unknown art key/);
  });
});
```

Also add the imports this block needs to the top of the file (merge into the existing `@/game/art/walls` import): `allMuralTiles`, `muralTileKey`, `muralTilePath` are already imported by Task 1's block — only the `node:fs`, `node:path`, and `registry` imports are new.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- walls`
Expected: FAIL on `resolveTextureKey` — `Unknown art key: "vinyl-wall-1"`. (The asset-existence test should already PASS from Task 2.)

- [ ] **Step 3: Teach the registry about mural keys**

In `src/game/art/registry.ts`, add to the imports near `import { isCharacterFrame } from "./characters";`:

```ts
import { isMuralTile } from "./walls";
```

Then in `resolveTextureKey`, add a branch after the character-frame check:

```ts
export function resolveTextureKey(artKey: string): string {
  if ((TEXTURE_KEYS as readonly string[]).includes(artKey)) return artKey;
  // Character frames ("heath-right-both") are loaded, not baked, and are
  // enumerated by art/characters.ts rather than listed here.
  if (isCharacterFrame(artKey)) return artKey;
  // Wall murals ("vinyl-wall-3") are likewise authored PNGs, enumerated by
  // art/walls.ts.
  if (isMuralTile(artKey)) return artKey;
  throw new Error(`Unknown art key: "${artKey}". Add it to the art registry.`);
}
```

- [ ] **Step 4: Load the mural PNGs in BootScene**

In `src/game/scenes/BootScene.ts`, add to the imports:

```ts
import { allMuralTiles, muralTileKey, muralTilePath } from "@/game/art/walls";
```

And append to `preload()`, after the character loop:

```ts
    // The shop's wall murals: two hand-drawn walls, 8 stitched 64px tiles each
    // (scripts/import-walls.py). Authored PNGs for the same reason the cast is —
    // so the walls can be redrawn without touching procedural art code.
    for (const { id, index } of allMuralTiles()) {
      this.load.image(muralTileKey(id, index), muralTilePath(id, index));
    }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- walls`
Expected: PASS, 11 tests.

- [ ] **Step 6: Commit**

```bash
git add src/game/scenes/BootScene.ts src/game/art/registry.ts __tests__/walls.test.ts
git commit -m "feat(game): load wall murals in BootScene and resolve their keys"
```

---

### Task 4: Place the two murals in the shop

**Files:**
- Modify: `src/game/world/mainRoom.ts` (imports, and the `decorations` array)
- Test: `__tests__/walls.test.ts` (append a new `describe` block)

**Interfaces:**
- Consumes: `mural()` from Task 1; registry resolution from Task 3.
- Produces: `mainRoom.decorations` containing 16 mural slices at row `a` cols 1–8 and row `g` cols 8–15.

- [ ] **Step 1: Write the failing test**

Append to `__tests__/walls.test.ts` (add `import { mainRoom } from "@/game/world/mainRoom";` at the top):

```ts
describe("murals in the shop", () => {
  const slices = (mainRoom.decorations ?? []).filter((d) => isMuralTile(d.artKey));

  it("places every slice of both murals", () => {
    expect(slices).toHaveLength(16);
  });

  it("hangs the vinyl wall along row a, cols 1-8", () => {
    const vinyl = slices.filter((d) => d.artKey.startsWith("vinyl-wall"));
    expect(vinyl.map((d) => d.tileX)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(vinyl.every((d) => d.tileY === 1)).toBe(true);
  });

  it("hangs the clothing wall along row g, cols 8-15", () => {
    const cloth = slices.filter((d) => d.artKey.startsWith("clothing-wall"));
    expect(cloth.map((d) => d.tileX)).toEqual([8, 9, 10, 11, 12, 13, 14, 15]);
    expect(cloth.every((d) => d.tileY === 7)).toBe(true);
  });

  it("mounts every slice on a wall tile, never on floor", () => {
    for (const d of slices) {
      expect(
        mainRoom.tiles[d.tileY][d.tileX],
        `${d.artKey} at (${d.tileX},${d.tileY}) is not on a wall tile`,
      ).toBe("wall");
    }
  });

  it("never overlaps two slices on one tile", () => {
    const at = slices.map((d) => `${d.tileX},${d.tileY}`);
    expect(new Set(at).size).toBe(at.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- walls`
Expected: FAIL — `expected [] to have a length of 16 but got +0`.

- [ ] **Step 3: Place the murals**

In `src/game/world/mainRoom.ts`, add to the imports:

```ts
import { mural } from "@/game/art/walls";
```

Then add to the **start** of the `decorations` array, before the bookcase entry:

```ts
    // ── The shop's only two wall faces ──
    // Every other wall tile renders as flat exterior black (see WorldScene), so
    // the room has no vertical wall faces at all. These two horizontal murals
    // are hand-drawn trapezoids: full width at the base, chamfered at the top
    // ends where they stop.
    //
    // Vinyl wall (row a, cols 1-8) — behind the music alcove. Chamfered at both
    // ends, so it reads as a freestanding wall; col 0 is deliberately left bare
    // for its left chamfer to taper into.
    ...mural("vinyl-wall", { tileX: C(1), tileY: R("a"), tiles: 8 }),

    // Clothing wall (row g, cols 8-15) — the cutout's bottom edge, directly
    // above the horizontal rail at row h. Square on the left where it meets the
    // corner, chamfered on the right at the map edge.
    ...mural("clothing-wall", { tileX: C(8), tileY: R("g"), tiles: 8 }),
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- walls`
Expected: PASS, 16 tests.

- [ ] **Step 5: Run the full suite to check nothing regressed**

Run: `npm test`
Expected: PASS — in particular `characters.test.ts`, which asserts over `mainRoom` walkability and art keys.

- [ ] **Step 6: Commit**

```bash
git add src/game/world/mainRoom.ts __tests__/walls.test.ts
git commit -m "feat(world): hang the vinyl and clothing wall murals in the shop"
```

---

### Task 5: Stop drawing wall faces in the shop

**Files:**
- Modify: `src/game/scenes/WorldScene.ts` (`loadRoom`, roughly lines 288–312)
- Test: manual visual verification (this is a pure render change with no seam a unit test can grip — the room-data invariants are already covered by Task 4)

**Interfaces:**
- Consumes: the murals placed in Task 4.
- Produces: no new API. `wallVariant()` is no longer called for the Main room.

- [ ] **Step 1: Replace the wall-variant selection for the Main room**

In `src/game/scenes/WorldScene.ts`, replace this block:

```ts
    // The main room's southern border sits against the exterior void, not an
    // interior wall — render it flat black (no cap/trim line) so the floor
    // reads as running straight up to the outside, FireRed-threshold style.
    const isOuterSouthEdge = (x: number, y: number) =>
      roomId === "main" && y === this.room.height - 1;
    for (let y = 0; y < this.room.height; y++) {
      for (let x = 0; x < this.room.width; x++) {
        const isWall = this.room.tiles[y][x] === "wall";
        const key = isOuterSouthEdge(x, y)
          ? "wall-fill"
          : isWall
            ? wallVariant(this.room, x, y)
            : floorKey;
        this.placeTile(resolveTextureKey(key), x, y, 0);
      }
    }
```

with:

```ts
    // The shop has no wall FACES: every wall tile renders as the same flat
    // exterior black the apron uses, so the floor reads as running straight up
    // to the outside on all sides. The room's only two walls are the hand-drawn
    // horizontal murals hung as decorations (see mainRoom.ts) — nothing
    // vertical. The Basement keeps the FireRed cap/side/base depth treatment.
    const flatWalls = roomId === "main";
    for (let y = 0; y < this.room.height; y++) {
      for (let x = 0; x < this.room.width; x++) {
        const isWall = this.room.tiles[y][x] === "wall";
        const key = !isWall
          ? floorKey
          : flatWalls
            ? "ext-void"
            : wallVariant(this.room, x, y);
        this.placeTile(resolveTextureKey(key), x, y, 0);
      }
    }
```

Note: `isOuterSouthEdge` is deleted — its special case is now the general rule. Verify no other reference to it remains.

- [ ] **Step 2: Hang murals at wall depth**

Still in `loadRoom`, the decoration loop buckets wall-mounted art by `artKey`. Mural slices must draw at wall depth (1) rather than as standing props with a contact shadow (2). The `onWall` set stays as it is:

```ts
    const onWall = new Set(["poster", "window"]);
```

Change only the dispatch line:

```ts
      else if (onWall.has(deco.artKey)) this.placeProp(deco, 1, false);
```

becomes:

```ts
      else if (onWall.has(deco.artKey) || isMuralTile(deco.artKey)) this.placeProp(deco, 1, false);
```

Add the import at the top of `WorldScene.ts`:

```ts
import { isMuralTile } from "@/game/art/walls";
```

- [ ] **Step 3: Verify the build and the suite**

Run: `npm test && npx tsc --noEmit`
Expected: tests PASS, no type errors. In particular `wallVariant` must still be imported and used (the Basement path), so no unused-import error.

- [ ] **Step 4: Visual check in the browser**

Run `npm run dev`, then use the `/browse` skill against the shop.

Confirm all of:
1. No wall face, cap, or trim stripe anywhere in the shop — every edge is flat black.
2. The vinyl wall spans row a from col 1 to col 8, sitting directly above the music alcove (bookcase, speaker, vinyl deck, speaker, crate on row b).
3. The clothing wall spans row g from col 8 to col 15, directly above the horizontal rail.
4. No seam, gap, or doubled tile within either mural — the slices stitch into one continuous wall.
5. The chamfered ends taper against the black void rather than being cut square.
6. The Basement is unchanged — walk down the secret stairs and confirm it still has its capped walls.

- [ ] **Step 5: Commit**

```bash
git add src/game/scenes/WorldScene.ts
git commit -m "feat(game): render shop walls flat, leaving only the two murals"
```

---

## Notes for the reviewer

- **Deliberately out of scope** (see the spec): floor bevelling where a wall's chamfer meets the floor, moving the bookcase at b1, and applying this treatment to the Basement.
- **`wallVariant.ts` is intentionally untouched.** It is dead code for the Main room after Task 5 but live for the Basement. Do not delete it.
- The plan touches no collision, no pathing, and no room geometry. If a patrol, seat, or Heath-walk test breaks, something went wrong — the fix is to revert the offending change, not to adjust the coordinates.
