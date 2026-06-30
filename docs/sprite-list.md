# SCR!PTS — Full Sprite List

> Quick-reference checklist of **every sprite needed to build the world**, pulled from
> [`asset-manifest.md`](./asset-manifest.md). Each row is one **`artKey`** resolved by
> [`src/game/art/registry.ts`](../src/game/art/registry.ts).
> Last updated: 2026-06-29 (Map v3).

**Totals:** 21 sprite artKeys — 3 characters, 8 tiles, 10 props.
**Status:** `void` = logic only; everything else baked from descriptors in
[`src/game/art/sprites.ts`](../src/game/art/sprites.ts).

> **2026-06-29 — clean brand-token tile pass:** `floor`, `floor-basement`, `wall`
> (top/side/bottom/fill), `stairs`, `doors`, and `rug` re-authored to the strict
> BRAND.md tokens (paper `#F7F7F5`, ink `#0D0D0D`, grey `#6F6F73`, pink `#FF8AC7`).
> `floor-basement` + `doors` are newly wired (registry → BootScene → WorldScene;
> doors placed in the shop entrance wall). `logo` remains the real
> `/assets/logo.png` decal (smooth-filtered), not a pixel reduction.

**Conventions:** tiles authored at 16px logical (32px on screen); characters 16×24–16×32,
anchored bottom-center (FireRed head-overhang). Brand palette only — ink `#0D0D0D`, paper
`#F7F7F5`, pink `#FF8AC7`, pinkDeep `#FF4FA3`, grey `#6F6F73`. Indexed, no anti-aliasing.
4-directional grid movement (side mirrored, not 8-way).

---

## 1. Characters (`characters/` — animated, 16×24, bottom-anchored)

| # | artKey | who | footprint | anim tags | status |
|---|---|---|---|---|---|
| 1 | `scribbs` | player | 1×1 | idle/walk × down/up/side (side mirrored); later talk, bump | placeholder |
| 2 | `npc-basement` | basement gatekeeper | 1×1 | idle (blink/breathe), talk | placeholder |
| 3 | `npc-heath` | shop checkout host | 1×1 | idle-down, talk | art-needed |

## 2. Environment — tiles (`environment/`)

| # | artKey | use | footprint | status |
|---|---|---|---|---|
| 4 | `floor` | shop floor — clean concrete, paper + grey corner mark | 1×1 | done |
| 5 | `floor-basement` | darker basement floor — ink + grey grid line | 1×1 | done |
| 6 | `wall` | walls (`wall-top` ink horizon / `-side` / `-bottom` / `-fill`) | 1×1 | done |
| 7 | `void` | off-shape tile — draws nothing, blocks | 1×1 | logic only |
| 8 | `stairs` | shop ↔ basement — paper treads, grey risers, pink top step | 1×1 | done |
| 9 | `doors` | 3-wide glass entrance, mounted in the wall | 3×1 | done |
| 10 | `logo` | central floor decal (real `/assets/logo.png`, smooth) | ~5×3 | done (PNG) |
| 11 | `rug` | floor decal — pink fill, ink border + inner rule | 2×2 | done |

## 3. Environment — props (`environment/`, frozen footprints)

| # | artKey | prop | footprint | count / where | anim | status |
|---|---|---|---|---|---|---|
| 12 | `couch` | couch | 5×3 L (4×2 cutout TR; 7 tiles) | shop alcove | static | placeholder |
| 13 | `checkout` | checkout desk | 2×5 L (1×4 cutout BL) | shop left | static | placeholder |
| 14 | `rack` | clothing rail | 1-tile unit, tiled | shop: 1×7 + 1×8 · basement ×3 | static (sway later) | placeholder |
| 15 | `vinylDesk` | vinyl table | 2×1 | shop alcove | spin loop | placeholder |
| 16 | `displayTable` | display table | 2×1 | shop alcove | static | placeholder |
| 17 | `speaker` | speaker | 1×1 | ×2, flank vinyl table | pulse loop | placeholder |
| 18 | `box` | box | 1×1 | basement ×5 + shop | static | placeholder |
| 19 | `poster` | poster-w-button | 1×1 | shop (basement hint) | glow later | art-needed |
| 20 | `book` | readable book | 1×1 | shop (basement hint) | static | art-needed |
| 21 | `mannequin` | mannequin | 1×1.5 | shop | static (per outfit) | art-needed |

---

## Not sprite atlases (but part of "the world")

- **`ui/`** — React DOM overlays, not sprites: dialogue box (Pixel Operator Bold), `›`
  interaction prompt, "choose your piece" swipe UI (basement), music toggle.
- **`fx/`** — room-transition fade/vignette, basement ambient darkness, door-open intro,
  restrained interaction sparkle.
- **`audio/`** (later batch) — title theme, shop ambient, basement ambient, vinyl/music loop,
  SFX: step, bump, confirm, dialogue blip, transition.
- **Product imagery** — clothing/vinyl cut-out PNGs live under `public/products/cutout/`,
  rendered through web routes (not the game atlas).
