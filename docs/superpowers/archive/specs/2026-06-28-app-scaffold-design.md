# SCR!PTS — Full-App Scaffold (v0) Design Spec

**Date:** 2026-06-28 · **Status:** Approved (user waived review, "just execute")

> Scope: stand up the foundation for the SCR!PTS flagship game-store described in `PRD.md`,
> with the brand rules in `BRAND.md` baked in, and the **swappable-visuals** architecture proven
> by a single playable placeholder room. Real art, commerce, and the other rooms come later.

## Goal

A running Next.js + Phaser 3 app where Scribbs walks around one placeholder room with the
camera following, an interaction stub fires at the checkout/rack tile, the brand colour/font
tokens are the single source of truth, and graphics can later be upgraded as a **swap, not a
rewrite**.

## Stack & tooling

- **Next.js 15 (App Router) + TypeScript + React 19** — web shell; future home of commerce/admin.
- **Phaser 3** — the game, mounted in a **client-only** component (`dynamic(..., { ssr: false })`).
- **Tailwind CSS** — UI styling, brand tokens wired into the theme.
- **Vitest** — unit tests for pure logic (world data + art registry). No canvas/render tests in v0.
- **npm** (node 22 / npm 11).

## Architecture — swappable visuals (the point of v0)

- **`src/game/world/`** — *world data*: rooms as plain data (tile grid, collision, spawn point,
  interaction objects `{ id, type, tileX, tileY }` for `rack` / `checkout` / `stairs`).
  **No art, no pixels — positions, IDs, and behaviour only.**
- **`src/game/art/registry.ts`** — *art registry*: maps art **keys** → asset descriptors
  (placeholder = a colour + size; later = spritesheet paths). Swap art here without touching
  world data or scenes.
- **`src/game/scenes/WorldScene.ts`** — reads world data + art registry and renders. The glue.
- **`src/theme/tokens.ts`** — single source of truth for brand colours + font names (exactly
  matching `BRAND.md`), consumed by both Tailwind config and Phaser.

### Brand tokens (from BRAND.md — do not invent new ones)

Colours: Primary Black `#0D0D0D`, White `#F7F7F5`, Primary Pink `#FF8AC7`,
Secondary Pink `#FF4FA3`, Neutral Grey `#6F6F73`.
Fonts: Game world → **Pixel Operator Bold**; Brand → **Fashion Whacks**; Body → **Inter / Geist**.
(v0 references the names + falls back to system fonts; real font files load later.)

## Playable in v0

- One **placeholder Main room**: tile grid, wall collision, doormat spawn, rendered with simple
  **coloured-rectangle placeholder art** (no asset files yet — proves the swap pipeline).
- **Scribbs**: placeholder sprite, 4-direction grid movement (arrow keys / WASD), **camera follows
  at moderate zoom** (locked decision from world-map-notes).
- One **interaction stub**: stepping onto a checkout/rack tile fires a logged interaction event
  (the real AWGE shopping interface is later work).

## Repo layout

```
Scripts/
  app/                  # layout.tsx, page.tsx (mounts game), globals.css
  src/
    game/
      PhaserGame.tsx     # client-only mount
      config.ts          # Phaser config (zoom, scale)
      scenes/            # BootScene.ts, WorldScene.ts
      world/             # mainRoom.ts, types.ts        ← no art
      art/registry.ts    # art keys → descriptors        ← swappable
    theme/tokens.ts      # brand colours + fonts
  public/assets/         # real art lands here later
  __tests__/             # vitest: world data + registry
  (PRD.md, BRAND.md, CLAUDE.md, docs/ already exist)
```

## Success criteria

- `npm install` clean.
- `npm run dev` → browser shows the room; Scribbs moves with camera follow; interaction stub fires.
- `npm test` passes (world-data + registry logic).
- `npm run build` succeeds.

## Out of scope (deliberate, YAGNI)

Real pixel art; the AWGE shopping UI; Supabase / Stripe / Resend; the `/admin` dashboard; the
mobile D-pad; the Lounge and Basement rooms. Each has a clear slot to land in later.

## Testing strategy

TDD the pure logic: room-data invariants (spawn in bounds, interactions on walkable tiles) and
the art registry (every world art key resolves; unknown key throws). Rendering/input is verified
by running it, not unit-tested in v0.
