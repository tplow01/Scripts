# Branch: `tp-testing` — what's in here

This branch consolidates **three previously-separate tracks** of SCR!PTS into one working app:
the **game layer** (Phaser pixel-art world), the **web/commerce layer** (the shop pages from the
`Product` branch), and the **design docs**. Everything builds and runs together.

> **Run it:** `npm install && npm run dev` → http://localhost:3000
> **Test/build:** `npm test` (20 tests) · `npm run build` (all routes prerender)

---

## 1. The game — Pokémon-FireRed-style world (`src/game/`)

A Phaser 3 world rendered with **baked pixel-art sprites**, laid out to the measured **Map v3**.
World data is kept separate from art (everything is referenced by `artKey`), so sprites can be
swapped without touching layout or logic.

| File | What it is |
|---|---|
| `src/game/world/types.ts` | World-data types: `Room`, `Interaction`, `Decoration`, tile footprints, solid-prop collision, room `target`/`transition`, `ambient`. |
| `src/game/world/mainRoom.ts` | **Shop floor** — 15×15 L-shape (Map v3). The exact `a–o × 1–15` layout. |
| `src/game/world/basement.ts` | **Basement** — 11×6 L-shape, rack-framed NPC room, dark ambient. |
| `src/game/world/rooms.ts` | Room registry (`getRoom`, `startRoomId`) + room-generic walkability. |
| `src/game/scenes/WorldScene.ts` | Renderer + movement. Tile grid, camera-follow, tweened FireRed movement, **stairs fade transition** (Shop ↔ Basement), and the **walk-in-through-the-doors intro**. |
| `src/game/scenes/BootScene.ts` | Bakes all textures, then starts the world. |
| `src/game/art/sprites.ts` | Every sprite definition (Scribbs, rack, checkout, vinyl, speaker, couch, box, npc, emblem, tiles…) in the brand palette. |
| `src/game/art/pixelArt.ts` | The baker: turns palette-char grids into Phaser textures. |
| `src/game/art/registry.ts` | Maps `artKey` → baked texture key. |
| `src/game/art/wallVariant.ts` | Picks wall cap/side/base art for FireRed depth (incl. the L-shape edges). |
| `src/game/config.ts`, `PhaserGame.tsx` | Phaser config + the client-only React mount. |
| `__tests__/` | Unit tests for room data, wall variants, and the art registry. |

**Controls:** arrows / WASD to move · `Z` / Space / Enter to interact · walk onto the top stairs to
descend to the Basement.

**The map, in writing:** see **[`docs/world-layout.md`](./world-layout.md)** — the full ASCII maps and
per-asset tile coordinates for both rooms.

---

## 2. The web / commerce layer (`app/`, `components/`, `lib/`, `types/`)

The shop pages, brought in from the repo's `Product` branch and wired to run under Next 15 / React 19.

| Route | File | What it is |
|---|---|---|
| `/` | `app/page.tsx` | The Phaser game (the world above). |
| `/loading` | `app/loading/page.tsx` | Game Boy / GBA title screen ("PRESS START"). |
| `/inventory` | `app/inventory/page.tsx` | Main product grid (1-800-Cyber-Love line). |
| `/basement` | `app/basement/page.tsx` | The hidden "THE BASEMENT" product grid. |
| `/cart` | `app/cart/page.tsx` | Cart page. |
| `/products/[slug]` | `app/products/[slug]/` | Product detail pages (12 products). |

- `components/` — NavBar, BasementNavBar, InventoryGrid, BasementGrid, ProductCard, CartDrawer, footers.
- `lib/` — `products.ts` (catalogue + image paths), `cart.tsx` (CartProvider/useCart), `motion.ts`, `utils.ts`.
- `types/product.ts` — the `Product` type.
- Integration wiring: `app/layout.tsx` (CartProvider + Bebas font), `tailwind.config.ts` (content globs),
  `tsconfig.json` (`@/*` resolves both `src/` and root), `package.json` (added framer-motion, clsx,
  tailwind-merge).

---

## 3. Product images (`public/products/cutout/`)

15 garment cut-outs (Anxiety / Love / Confusion / Rage in White + Army Green, MJ, Are You Okay
White/Green/Black, plus back shots) wired to the slugs in `lib/products.ts`. The inventory and
basement grids render these.

---

## 4. Docs (`docs/` + root)

| File | What it is |
|---|---|
| `docs/world-layout.md` | **The map in writing** — ASCII maps + exact tile coordinates for the Shop and Basement. |
| `docs/asset-manifest.md` | Every art asset, its footprint/size, and status. |
| `docs/world-map-notes.md` | Working notes behind the map design. |
| `tpedits.md` | Session log of the game-layer work (sprites, title screen, world). |
| `PRD.md`, `BRAND.md`, `CLAUDE.md` | Product playbook, brand bible, agent guide. |

---

## Status

- ✅ `npm run build` clean — `/`, `/loading`, `/inventory`, `/basement`, `/cart`, `/products/[slug]`.
- ✅ `npm test` — 20 passing.
- ⏳ Not yet wired: loading screen → game hand-off; basement NPC uses the generic sprite; products
  are pre-order stubs (no checkout backend).
