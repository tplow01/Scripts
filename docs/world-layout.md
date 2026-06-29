# SCR!PTS — World Layout (Shop + Basement)

> Exact tile layout of both areas, matching the measured wireframes and the implemented
> room data ([`src/game/world/rooms/main.ts`](../src/game/world/rooms/main.ts),
> [`basement.ts`](../src/game/world/rooms/basement.ts)). Last updated: 2026-06-29.

## Coordinate system

- The **interior** is addressed by the player's notation: **rows `a`–`o` top→bottom**,
  **columns `1`–N left→right**. e.g. `a7` = row a, column 7.
- Each room is wrapped in a **1-tile wall border**, so in code: tile `y = rowIndex + 1`
  (a→1), tile `x = columnNumber` (col 1 → x1; border at x0). The tables below use the
  interior `a1` notation; the grids show the wall ring as `#`.
- **Tile = 32px.** A footprint of `W×H` tiles = `(32·W)×(32·H)` px. Characters are 1×1 on the
  grid but authored taller (head overhang, anchored bottom-center).

---

## SHOP FLOOR — interior 15 wide × 15 tall

L-shaped: the **top-right block (cols 8–15 × rows a–g) is cut away** (`void`). 225 − 56 = **169
walkable tiles**.

### Map

```
   col:  1 2 3 4 5 6 7 8 9 10 11 12 13 14 15
        ##################################
  a     # . S V V S . T · · ·  ·  ·  ·  · #
  b     # . . . . . . . · · ·  ·  ·  ·  · #
  c     # C . . . . . . · · ·  ·  ·  ·  · #
  d     # C . . . . . . · · ·  ·  ·  ·  · #
  e     # C C C C C . . · · ·  ·  ·  ·  · #
  f     # . . . . . . . · · ·  ·  ·  ·  · #
  g     # . . . . . . . · · ·  ·  ·  ·  · #
  h     # . . . . . . . R R R  R  R  R  R #
  i     # . . . . . . . . . .  .  .  .  R #
  j     # . . . . . . . . . .  .  .  .  R #
  k     # K K . . . L L L L L  .  .  .  R #
  l     # . K . . . L L L L L  .  .  .  R #
  m     # . K . . . L L L L L  .  .  .  R #
  n     # . K . . . . . . . .  .  .  .  R #
  o     # . K . . . . D D D .  .  .  .  . #
        ##################################
```

Legend: `#` wall · `.` floor · `·` void (cut-out, not walkable) · `S` speaker · `V` vinyl
deck · `T` basement stairs · `C` couch · `K` checkout · `R` clothing rail · `L` logo (walkable
floor decal) · `D` doors (walk-in entrance, walkable)

### Assets

| Asset | artKey | Footprint | px | Tiles (interior) |
|---|---|---|---|---|
| Basement stairs | `stairs` | 1×1 | 32×32 | `a7` |
| Speaker (L) | `speaker` | 1×1 | 32×32 | `a2` |
| Vinyl deck | `vinylDesk` | 2×1 | 64×32 | `a3 a4` |
| Speaker (R) | `speaker` | 1×1 | 32×32 | `a5` |
| Couch (L-shape) | `couch` | 5×3 L (7 tiles) | 160×96 | arm `c1 d1 e1` + base `e1 e2 e3 e4 e5` |
| Checkout (L-shape) | `checkout` | 2×5 L (6 tiles) | 64×160 | top `k1 k2` + col `k2 l2 m2 n2 o2` |
| Clothing rail — horizontal | `rack` | 7×1 | 224×32 | `h8 h9 h10 h11 h12 h13 h14` |
| Clothing rail — vertical | `rack` | 1×7 | 32×224 | `h15 i15 j15 k15 l15 m15 n15` |
| Logo (floor decal, walkable) | `logo` | 5×3 | 160×96 | `k6`–`m10` (rows k–m × cols 6–10) |
| Doors (3-wide, walkable) | `doors` | 3×1 | 96×32 | `o7 o8 o9` |
| **Spawn** (centre door) | — | — | — | `o8` — auto-walks up on entry |

---

## BASEMENT — interior 11 wide × 6 tall

L-shaped: the **top-left block (cols 1–6 × rows a–c) is cut away** (`void`). Floor = bottom
strip (rows d–f, all cols) + right block (rows a–c, cols 7–11) = **48 walkable tiles**. Darker
via a black `ambient` overlay (alpha 0.45). Entered by stairs from the Shop (fade transition).

### Map

```
   col:  1 2 3 4 5 6 7 8 9 10 11
        ########################
  a     # · · · · · · R R R  R  R #
  b     # · · · · · · R . N  .  R #
  c     # · · · · · · R . .  .  R #
  d     # X . . . . . . . .  .  . #
  e     # T P . . . . . . .  .  X #
  f     # X . . . . . . . .  X  X #
        ########################
```

Legend: `#` wall · `.` floor · `·` void · `T` stairs (up to Shop) · `P` spawn · `R` clothing
rail · `N` basement NPC · `X` box

### Assets

| Asset | artKey | Footprint | px | Tiles (interior) |
|---|---|---|---|---|
| Stairs (→ Shop) | `stairs` | 1×1 | 32×32 | `e1` |
| **Spawn** | — | — | — | `e2` (arrives from Shop) |
| Box | `box` | 1×1 | 32×32 | `d1` |
| Box | `box` | 1×1 | 32×32 | `f1` |
| Clothing rail — top | `rack` | 3×1 | 96×32 | `a8 a9 a10` |
| Clothing rail — left | `rack` | 1×3 | 32×96 | `a7 b7 c7` |
| Clothing rail — right | `rack` | 1×3 | 32×96 | `a11 b11 c11` |
| Basement NPC | `npc` | 1×1 | 32×32 | `b9` |
| Box | `box` | 1×1 | 32×32 | `f10` |
| Box | `box` | 1×1 | 32×32 | `f11` |
| Box | `box` | 1×1 | 32×32 | `e11` |

---

## Asset dimension summary

| artKey | Footprint (tiles) | px (W×H) | Notes |
|---|---|---|---|
| `scribbs` | 1×1 | 16×24 author | player; pink beanie; walk cycle |
| `npc` (`npc-basement`) | 1×1 | 16×24 author | basement gatekeeper |
| `couch` | 5×3 L (cutout top-right) | 160×96 | shop alcove |
| `checkout` | 2×5 L (cutout bottom-left) | 64×160 | shop left |
| `rack` | 1-tile unit, tiled | 32×32 unit | shop 7×1 + 1×7; basement 3× (3-runs) |
| `vinylDesk` | 2×1 | 64×32 | spin loop later |
| `speaker` | 1×1 | 32×32 | ×2; pulse loop later |
| `box` | 1×1 | 32×32 | shop 0, basement ×5 |
| `stairs` | 1×1 | 32×32 | shop↔basement |
| `doors` | 3×1 | 96×32 | shop entrance, walkable |
| `logo` | 5×3 | 160×96 | walkable floor decal |
| `floor` / `wall` | 1×1 | 32×32 | tiles (`void` = not drawn, not walkable) |

> Not placed this round (art keys reserved): `displayTable`, `rug`, `poster`, `book`,
> `mannequin`, `npc-heath`. See [`asset-manifest.md`](./asset-manifest.md) for the full list.
