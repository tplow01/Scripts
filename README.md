# SCR!PTS

A browser-based Pokémon-FireRed-style pixel world that **is** the SCR!PTS flagship store.

> **Read first:** [`PRD.md`](./PRD.md) (the playbook / source of truth) and
> [`BRAND.md`](./BRAND.md) (the brand bible). [`CLAUDE.md`](./CLAUDE.md) requires both each session.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000 — walk Scribbs with arrow keys / WASD
npm run build    # production build
npm test         # unit tests (world data + art registry)
```

## What's here (v0 scaffold)

A running Next.js + Phaser 3 app with one playable placeholder room: Scribbs moves on a tile
grid, the camera follows, and stepping on the checkout / rack / stairs tiles fires a stub
interaction event (see the browser console).

## Architecture — swappable visuals

Graphics are built to be **upgraded as a swap, not a rewrite**. The layers:

| Layer | Path | Responsibility |
|---|---|---|
| World data | `src/game/world/` | Rooms as plain data: tile grid, spawn, interactions. **No art.** |
| Art registry | `src/game/art/registry.ts` | Maps art **keys** → drawable descriptors (v0 = placeholder rects). Swap here. |
| Scene (glue) | `src/game/scenes/WorldScene.ts` | Reads world data + registry and renders; drives movement/camera. |
| Brand tokens | `src/theme/tokens.ts` | Single source of truth for brand colours + fonts (from `BRAND.md`). |
| Mount | `src/game/PhaserGame.tsx` | Client-only Phaser mount; dynamically imported (`ssr: false`). |

Upgrading to real pixel art means changing the registry + adding assets — world data and
gameplay logic stay untouched.

## Not built yet (deliberate)

Real pixel art · the AWGE-style shopping interface · Supabase / Stripe / Resend · the `/admin`
dashboard · mobile D-pad · the Lounge and Basement rooms. See
[`docs/superpowers/specs/2026-06-28-app-scaffold-design.md`](./docs/superpowers/specs/2026-06-28-app-scaffold-design.md)
for scope, and [`docs/world-map-notes.md`](./docs/world-map-notes.md) for the map design.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Phaser 3 · Tailwind CSS · Vitest.
