# SCR!PTS — Asset Manifest

> **Canonical, living asset list** (same status as [`world-map-notes.md`](./world-map-notes.md)).
> Every row maps 1:1 to an **`artKey`** resolved by [`src/game/art/registry.ts`](../src/game/art/registry.ts).
> Lock the `artKey` and animation-tag names — they're the contract between art and code. Swapping a
> placeholder for real art is a one-line registry change; world data (`rooms/*.ts`) never changes.
> Last updated: 2026-06-29 (Map v3).

## Conventions

- **Tile:** 32px on screen. **Author at 16px logical** for tiles/props; **characters 16×24–16×32**
  (FireRed head-overhang), **anchored bottom-center**.
- **Palette:** brand only ([`src/theme/tokens.ts`](../src/theme/tokens.ts)) — ink `#0D0D0D`,
  paper `#F7F7F5`, pink `#FF8AC7`, pinkDeep `#FF4FA3`, grey `#6F6F73`. Indexed, no anti-aliasing
  (FireRed interior look).
- **Movement:** 4-directional grid (one tile/step). Characters need per-facing frames (down/up/side,
  side mirrored) — not 8-way.
- **Packaging:** one Aseprite atlas per category (PNG + JSON) under `public/assets/<category>/`,
  loaded in [`BootScene`](../src/game/scenes/BootScene.ts); animation tags become the Phaser anim keys.
- **Status legend:** `placeholder` = coloured-rectangle in the registry today · `art-needed` = planned,
  not drawn · `done` = real atlas frame wired.
- **Footprint** = tiles occupied on the grid (origin top-left, extends right/down). Characters are
  taller than their footprint (head overhang).

## Map (Map v3)

| Area | Bounding | Shape | Walkable tiles |
|---|---|---|---|
| Shop floor (`main`) | 15 × 15 | square, top-right 8×7 cut out (`void`) → L | 169 |
| Basement (`basement`) | 11 × 7 | irregular (U-shape, refine at render) | ~48 |

Camera viewport: 16×12 tiles, FIT-scaled, follows Scribbs (Shop pans, Basement near screen-locked).

## `characters/` (animated)

| artKey | who | footprint | author px | anim tags | status |
|---|---|---|---|---|---|
| `scribbs` | player | 1×1 | 16×24 | `idle/walk × down/up/side` (side mirrored); later `talk`, `bump` | placeholder |
| `npc-basement` | basement gatekeeper | 1×1 | 16×24 | `idle` (blink/breathe), `talk` | placeholder¹ |
| `npc-heath` | shop checkout host | 1×1 | 16×24 | `idle-down`, `talk` | art-needed (later) |

¹ Today rooms use a single generic `npc` artKey; split into `npc-basement` / `npc-heath` when art lands.

## `environment/` — tiles

| artKey | use | footprint | status |
|---|---|---|---|
| `floor` | shop floor | 1×1 | placeholder |
| `floor-basement` | darker basement floor (or keep `ambient` overlay) | 1×1 | art-needed |
| `wall` | walls (+ FireRed `wall-top`/`wall-side`/`wall-corner` variants) | 1×1 | placeholder |
| `void` | off-shape tile — draws nothing, blocks | 1×1 | n/a (logic only) |
| `stairs` | shop ↔ basement staircase | 1×1 | placeholder |
| `doors` | 3-wide entrance, walkable decal (walk-in spawn) | 3×1 | placeholder |
| `logo` | central floor decal, walkable | ~5×3 | placeholder |
| `rug` | floor decal, walkable | 2×2 | placeholder |

## `environment/` — props (frozen footprints)

| artKey | prop | footprint | count / where | anim | status |
|---|---|---|---|---|---|
| `couch` | couch | **5×3 L** (4×2 cutout TR; 7 tiles) | shop alcove | static | placeholder |
| `checkout` | checkout desk | **2×5 L** (1×4 cutout BL) | shop left | static | placeholder |
| `rack` | clothing rail | 1-tile unit, tiled | shop: 1×7 + 1×8 · basement: ×3 (3×1) | static (sway later) | placeholder |
| `vinylDesk` | vinyl table | 2×1 | shop alcove | spin loop | placeholder |
| `displayTable` | display table | 2×1 | shop alcove | static | placeholder |
| `speaker` | speaker | 1×1 | ×2, flank vinyl table | pulse loop | placeholder |
| `box` | box | 1×1 | basement ×5 + shop | static | placeholder |
| `poster` | poster-w-button | 1×1 | shop (basement hint) | glow later | art-needed (later) |
| `book` | readable book | 1×1 | shop (basement hint) | static | art-needed (later) |
| `mannequin` | mannequin | 1×1.5 | shop | static (per outfit) | art-needed (later) |

## `ui/` — React DOM overlays (not atlas)

Driven by the existing `game.events.emit("interaction", hit)` channel:
- dialogue box (Pixel Operator Bold) · interaction prompt (`›`) · "choose your piece" swipe UI
  (basement) · music toggle. Rack + checkout route to normal ecommerce pages (web routes, not assets).

## `fx/`

- room-transition fade/vignette (exists, `WorldScene.startTransition`) · basement ambient darkness
  (exists, `room.ambient`) · door-open intro effect · restrained interaction sparkle.

## `audio/` (later batch)

- title theme · shop ambient · basement ambient · vinyl/music loop · SFX: step, bump, confirm,
  dialogue blip, transition.

## `data/`

- rooms — [`src/game/world/rooms/{main,basement}.ts`](../src/game/world/rooms/)
- registry — [`src/game/art/registry.ts`](../src/game/art/registry.ts)
- animation definitions — registered in [`BootScene`](../src/game/scenes/BootScene.ts)

## Sourcing (decide per-asset)

`create` (custom Aseprite) vs `source` (pack URL + license) is TBD per asset. When sourcing, record
the source + license here. When real art lands, extend `ArtDescriptor` in `registry.ts` with a
`SpriteArt` variant and load atlases in `BootScene` — no `WorldScene` / world-data changes.
