# Full-App Scaffold (v0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a running Next.js + Phaser 3 app where Scribbs walks one placeholder room (camera following), brand tokens are the single source of truth, and art is swappable without touching world data.

**Architecture:** World data (positions + interaction logic) lives as plain TS data, fully separate from an art registry (keys → descriptors). A Phaser `WorldScene` is the glue that reads both and renders. A client-only React component mounts Phaser inside Next.js. Brand colours/fonts come from one `tokens.ts` consumed by both Tailwind and Phaser.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Phaser 3, Tailwind CSS, Vitest.

## Global Constraints

- Brand colours (exact, from `BRAND.md`): Primary Black `#0D0D0D`, White `#F7F7F5`, Primary Pink `#FF8AC7`, Secondary Pink `#FF4FA3`, Neutral Grey `#6F6F73`. Do not invent new colours.
- Brand fonts: Game world → Pixel Operator Bold; Brand → Fashion Whacks; Body → Inter / Geist. v0 references names with system fallbacks.
- Node 22 / npm 11. Package manager: npm.
- World data contains NO art/pixels — positions, IDs, behaviour only. Art lives only in the registry.
- Phaser must be client-only (`ssr: false`) — never imported during SSR.

---

### Task 1: Project initialization

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `postcss.config.mjs`, `tailwind.config.ts`, `vitest.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- Modify: `.gitignore` (add `.next/`, `coverage/`)

**Produces:** a booting Next.js app; `npm run dev`, `npm run build`, `npm test` scripts.

- [ ] Step 1: Write `package.json` with deps (next, react, react-dom, phaser) and devDeps (typescript, @types/*, tailwindcss, postcss, autoprefixer, vitest, @vitejs/plugin-react, jsdom). Scripts: `dev`, `build`, `start`, `test`, `lint`.
- [ ] Step 2: Write tsconfig (paths `@/*` → `./src/*`), next.config, postcss + tailwind config (brand tokens reference theme/tokens), vitest config (jsdom, globals).
- [ ] Step 3: Write `app/layout.tsx`, `app/page.tsx` (placeholder), `app/globals.css` (Tailwind directives + brand CSS vars).
- [ ] Step 4: `npm install`. Expected: clean install.
- [ ] Step 5: `npm run build`. Expected: success.
- [ ] Step 6: Commit `chore: initialize Next.js + Phaser + Tailwind + Vitest scaffold`.

### Task 2: Brand theme tokens

**Files:**
- Create: `src/theme/tokens.ts`, `__tests__/tokens.test.ts`

**Produces:** `colors` (named hex map) + `colorsNum` (Phaser 0x ints) + `fonts`.

- [ ] Step 1: Write failing test asserting `colors.primaryPink === '#FF8AC7'` (and the other four), and `colorsNum.primaryPink === 0xff8ac7`.
- [ ] Step 2: Run `npm test` — FAIL (module missing).
- [ ] Step 3: Implement `tokens.ts`: `colors`, `colorsNum` (derived via `parseInt(hex.slice(1),16)`), `fonts { game, brand, body }`.
- [ ] Step 4: Run `npm test` — PASS.
- [ ] Step 5: Commit `feat: add brand theme tokens (single source of truth)`.

### Task 3: World data — types + main room

**Files:**
- Create: `src/game/world/types.ts`, `src/game/world/mainRoom.ts`, `__tests__/mainRoom.test.ts`

**Interfaces / Produces:**
- `type TileType = 'floor' | 'wall'`
- `interface Interaction { id: string; type: 'rack'|'checkout'|'stairs'; tileX: number; tileY: number; artKey: string }`
- `interface Room { id: string; tileSize: number; width: number; height: number; tiles: TileType[][]; spawn: {tileX:number;tileY:number}; interactions: Interaction[] }`
- `const mainRoom: Room`
- `function isWalkable(room: Room, tileX: number, tileY: number): boolean`

- [ ] Step 1: Write failing tests: spawn is within bounds and on a floor tile; every interaction sits on a floor (walkable) tile; `tiles` dimensions equal `height`×`width`; border tiles are walls.
- [ ] Step 2: Run `npm test` — FAIL.
- [ ] Step 3: Implement `types.ts` and `mainRoom.ts` (a ~12×9 room: wall border, floor interior, spawn near bottom-center, interactions: `checkout` bottom-left, `rack` right side, `stairs` top). Implement `isWalkable`.
- [ ] Step 4: Run `npm test` — PASS.
- [ ] Step 5: Commit `feat: add world-data layer (room types + main room)`.

### Task 4: Art registry

**Files:**
- Create: `src/game/art/registry.ts`, `__tests__/registry.test.ts`

**Interfaces / Produces:**
- `interface ArtDescriptor { kind: 'rect'; color: number; width: number; height: number }`
- `function resolveArt(key: string): ArtDescriptor` (throws on unknown key)
- registry covers: `scribbs`, `floor`, `wall`, `rack`, `checkout`, `stairs`.

- [ ] Step 1: Write failing tests: `resolveArt('scribbs')` returns a descriptor; every `interaction.artKey` in `mainRoom` resolves; `resolveArt('nope')` throws.
- [ ] Step 2: Run `npm test` — FAIL.
- [ ] Step 3: Implement `registry.ts` using `colorsNum` from tokens for placeholder rectangles.
- [ ] Step 4: Run `npm test` — PASS.
- [ ] Step 5: Commit `feat: add swappable art registry (placeholder rects)`.

### Task 5: Phaser scenes + mount + page

**Files:**
- Create: `src/game/config.ts`, `src/game/scenes/BootScene.ts`, `src/game/scenes/WorldScene.ts`, `src/game/PhaserGame.tsx`
- Modify: `app/page.tsx` (mount the game client-only)

**Interfaces:**
- Consumes: `mainRoom`, `isWalkable` (Task 3); `resolveArt` (Task 4); `colorsNum`, `fonts` (Task 2).
- `WorldScene` renders tiles + interactions from `resolveArt`, spawns Scribbs at `mainRoom.spawn`, moves on a tile grid with arrow keys/WASD blocked by `isWalkable`, camera follows with `setZoom(2)`, and logs an interaction event when Scribbs enters an interaction tile.

- [ ] Step 1: Implement `config.ts` (Phaser.Game config: type AUTO, pixelArt true, backgroundColor from tokens, scene list, scale FIT).
- [ ] Step 2: Implement `BootScene` (no real assets; immediately starts `WorldScene`).
- [ ] Step 3: Implement `WorldScene`: build tilemap from `mainRoom.tiles` via `add.rectangle` using `resolveArt`; place interaction rects; create Scribbs rectangle at spawn; grid movement with cooldown, blocked by `isWalkable`; `cameras.main.startFollow(scribbs).setZoom(2)`; on entering an interaction tile, `console.log` + emit event.
- [ ] Step 4: Implement `PhaserGame.tsx` (`'use client'`; create `new Phaser.Game(config)` in a `useEffect` against a container ref; destroy on unmount).
- [ ] Step 5: Mount in `app/page.tsx` via `dynamic(() => import('@/game/PhaserGame'), { ssr: false })`.
- [ ] Step 6: `npm run build` — success. `npm run dev` — manual check: room renders, Scribbs moves with camera follow, interaction logs fire.
- [ ] Step 7: Commit `feat: render playable placeholder room (movement + camera + interaction stub)`.

### Task 6: Docs + push

- [ ] Step 1: Add a short `README.md` (run/build/test commands + architecture pointer to PRD/BRAND/spec).
- [ ] Step 2: Add a PRD Change Log entry noting v0 scaffold landed.
- [ ] Step 3: Commit and `git push origin main`.

## Self-Review

- **Spec coverage:** stack (T1), brand tokens (T2), world-data/art separation (T3+T4), playable room w/ movement+camera+interaction (T5), success criteria build/test (all), docs/push (T6). ✓
- **Placeholders:** none — each task names exact files, signatures, and test assertions.
- **Type consistency:** `Room`/`Interaction`/`isWalkable` (T3) consumed verbatim in T4/T5; `resolveArt`/`ArtDescriptor` (T4) consumed in T5; `colorsNum`/`fonts` (T2) consumed in T4/T5. ✓
