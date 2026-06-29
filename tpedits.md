# tpedits — Session Log

A running log of work done on the SCR!PTS game layer, kept by Thomas's Claude Code sessions.

---

## Session: 2026-06-28 → 2026-06-29

### Context discovered
- Repo `tplow01/Scripts` has **two parallel tracks** that were never merged:
  - **`main`** (karldif01's work): the **game layer** — Next.js + Phaser 3 scaffold in `src/`. Playable placeholder room (tile grid, wall collision, event-driven WASD/arrow movement, camera follow), swappable art registry (coloured-rect placeholders), brand tokens, Vitest tests. Latest commit `0be4b81` fixed canvas framing + made movement event-driven.
  - **`Product`** (Thomas's work): the **web/commerce layer** — `app/` + `components/` with inventory, basement, product detail pages, cart, cart drawer, legal pages.
- Decision: **work on the game layer** (`main` branch). Web layer merge deferred.

### Game layer state (Karl's work, `main`)
- `src/game/PhaserGame.tsx` — mounts Phaser into Next.js (client-only via `next/dynamic`).
- `src/game/config.ts` — Phaser config; canvas sized to room (12×9 × 32px), FIT scale.
- `src/game/scenes/BootScene.ts` — boots straight to WorldScene (no assets yet).
- `src/game/scenes/WorldScene.ts` — renders room from world data + art registry; tile-by-tile movement; interaction stubs (rack/checkout/stairs) emit events + console.log.
- `src/game/world/mainRoom.ts` — 12×9 room, wall border, spawn at (6,7), 3 interactions: checkout (1,7), rack (10,3), stairs (6,1).
- `src/game/art/registry.ts` — maps artKey → coloured rectangle (placeholders).
- `src/theme/tokens.ts` — brand colours (ink #0D0D0D, paper #F7F7F5, pink #FF8AC7, pinkDeep #FF4FA3, grey #6F6F73) + fonts.
- Verified live: Phaser v3.90 boots clean; room renders; Scribbs (pink) spawns; rack (white), checkout (bright pink), stairs (pink) visible as rectangles.
- Known gaps: floor & wall both near-black so room boundary is invisible inside canvas; all rectangles (no sprites); canvas centred in grey page bg; no link from loading screen → game.

### Built this session: Loading / Title screen (`app/loading/page.tsx`)
A standalone page (not wired to anything yet) — a Game Boy / GBA-SP styled title screen.
- **Reference**: AWGE.com title screen (white screen, big pixel logo, "PRESS START", "© 2026"), reworked into a Game Boy device.
- **Font**: `Press Start 2P` via `next/font/google`.
- **Desktop/tablet**: full-viewport metallic-grey body with a recessed black device; light-grey LCD screen with dot-matrix texture; the grey reads as a raised surface (diagonal bevel: bright top-left, dark bottom-right) with the black device sunk into it (strong inset shadows on all 4 edges). Device drop shadow.
- **Mobile**: full-bleed Game Boy split 50/50 — top half = screen (grey surround + black bezel + LCD), bottom half = controls. Classic layout: D-pad (110px) + diagonal A/B buttons (56px, deep-red gradient) in the top row; speaker slits + SELECT/START pills centered below.
- **Screen content**: `SCR!PTS` logo (pixel, drop-shadow), tagline **"Storytelling through clothing"**, blinking `› PRESS START`, `© SCR!PTS 2026` pinned to bottom.
- **Screen realism**: 5% scanline overlay, dot matrix, corner vignette, inset shadow (LCD recessed), soft glow bloom from screen edges onto bezel, light bleed.
- **Edge highlights**: left + top edges ~10–16% lighter to simulate light on a physical edge.
- **Palette**: brand pink was tried then dropped in favour of the grey/black GBA look + light LCD with black text.

### Environment
- Working copy lives at `/Users/tplow/Documents/Scripts` (cloned fresh from `git@github.com:tplow01/Scripts.git`, on `main`).
- Loading screen copied in from earlier temp working dir.
- Dev server: `npm run dev` → http://localhost:3000 (game) and http://localhost:3000/loading (title screen).

### Game art pass — placeholder rectangles → real Pokémon-style pixel art
Replaced Karl's coloured-rectangle v0 with a real baked pixel-art pipeline, keeping his
world-data / art-registry separation intact.
- **`src/game/art/pixelArt.ts`** — baker: turns a grid of palette chars into a Phaser
  CanvasTexture (16px native; chunky pixels scaled up by the camera). Idempotent; pads short
  rows so a miscount renders a gap instead of crashing.
- **`src/game/art/sprites.ts`** — all art definitions + shared on-brand palette (ink/paper/pink):
  - Floor: calm cream boutique tile (1px seam on top/left edges → clean grid).
  - Wall: charcoal with a brand-pink trim line + dark baseboard.
  - Rack: rolling clothing rail, metal frame + pink & charcoal garments hanging.
  - Checkout: wood counter with a register + mint screen.
  - Stairs: dark steps receding (to Basement).
  - Poster: pink-framed SCR!PTS poster (wall decoration).
  - Scribbs: real character (dark hair, pink headphones, cream hoodie, jeans) — down/up/side
    facings, A (stand) + B (step) frames each; left = right mirrored.
- **`src/game/art/registry.ts`** — rewritten: `bakeAllTextures(scene)` bakes everything in Boot;
  `resolveTextureKey(artKey)` maps world keys → texture keys. (Old `resolveArt` rect API removed.)
- **`src/game/world/types.ts`** — added optional `decorations: Decoration[]` (visual-only art).
- **`src/game/world/mainRoom.ts`** — enlarged 12×9 → **16×13** boutique; populated: 5 racks,
  checkout, stairs, 4 posters; spawn (8,10).
- **`src/game/scenes/BootScene.ts`** — bakes textures before world starts.
- **`src/game/scenes/WorldScene.ts`** — renders textured tiles/decorations/props; Scribbs is a
  directional sprite with **tweened glide movement (~120ms/tile)**, faces travel direction,
  2-frame walk; turn-in-place when blocked. Camera: integer zoom that **covers the viewport** +
  follows Scribbs (lerp) + recomputes on resize; bounds = room; bg `#1C1A22`.
- **`src/game/config.ts`** — `Scale.RESIZE` (canvas fills container), `roundPixels`, dark bg.
- **`next.config.mjs`** — `devIndicators: false` (kills the "N" dev badge).
- **Tests** — updated `registry.test.ts` (resolveTextureKey) + `mainRoom.test.ts` (unique types);
  **all 12 pass** (`npx vitest run`).
- Verified live via headless browser: Phaser v3.90 boots clean (no errors), room renders as a real
  boutique, Scribbs walks with facing + camera-follow confirmed by driving arrow keys.

### FireRed graphics — Stage 1 (procedural FireRed-grade upgrade)
Plan: `/Users/tplow/.claude/plans/hazy-launching-tarjan.md`. User chose staged approach (polish now,
real asset pipeline later) + open-licensed pack for Stage 2. Constraint: no ripped Nintendo assets.
- **`src/game/art/pixelArt.ts`** — added `outline?` auto-outline (paints a dark desaturated edge into the
  transparent ring around any silhouette → FireRed prop/character outlines) + `bakeShadow()` (soft
  elliptical contact shadow via radial gradient).
- **`src/game/art/sprites.ts`** — rewritten with **per-material shading ramps** (highlight/mid/shadow)
  and a consistent top-left light: floor tile with bevel (highlight TL, shade BR, grout seam); **three
  wall variants** — `wall-top` (lit cap + dark cap surface + pink trim + face + baseboard), `wall-side`,
  `wall-bottom`; rack/checkout/stairs reshaded + outlined; Scribbs's 6 frames redone with ramps +
  auto-outline (kept frame keys).
- **`src/game/art/wallVariant.ts`** (new, pure) — `wallVariant(room,x,y)` → top/side/bottom by edge;
  top wins at top corners. Unit-tested.
- **`src/game/art/registry.ts`** — bakes floor + 3 wall variants + props + `shadow` (SHADOW_KEY) +
  Scribbs frames; `resolveTextureKey` allowlist includes wall variants.
- **`src/game/scenes/WorldScene.ts`** — walls render via `wallVariant`; contact shadow under each prop
  and under Scribbs (his shadow tweens with him); depth order floor 0 / deco 1 / shadow 1.5 / props 2 /
  char-shadow 9 / char 10.
- **Tests** — added `__tests__/wallVariant.test.ts`; updated `registry.test.ts` for new keys + every
  room-produced wall variant. **17 tests pass** (`npx vitest run`).
- Verified live (headless browse, drove arrow keys): outlined+shaded Scribbs in down/up facings,
  shadows present and following, beveled floor, wall variants (side-wall pink trim at edge), camera
  follow, **zero console errors**. (Top-wall cap not framed on-screen during QA but is unit-tested and
  uses the same baker.)

### Stage 2 (next): real asset pipeline + open-licensed FireRed-style pack
Per plan: license-vet a CC0/CC-BY 16px interior pack → `public/assets/` + `docs/asset-licenses.md`;
add `preload()` in BootScene; make registry frame-aware (`{texture,frame}`); Phaser anims for Scribbs;
reskin to brand palette. Tiled deferred until multi-room.

### Large explorable shop matching the whiteboard map (IMG_0023.heic)
Goal: turn the single room into a big, explorable FireRed shop matching Heath's whiteboard map
(Main room). Read the map (HEIC→PNG via `sips`); legend: X=boxes, I=rack, DT=display table,
VD=vinyl desk, ●=NPC, Ω=mannequin, S=speaker.
- **New prop art** (`sprites.ts`, FireRed-shaded + auto-outlined): displayTable, vinylDesk, mannequin,
  speaker, box, npc (pink-hoodie shopper, distinct from Scribbs), couch (2-wide builder), rug (2×2
  builder, non-solid). Extended palette (couch/cardboard/turntable/npc-skin chars).
- **World model** (`world/types.ts`): `Interaction`/`Decoration` now share `Placed` with `wTiles`,
  `hTiles`, `solid`. Added `footprint(p)` + `buildBlockedSet(room)`. Expanded `InteractionType`
  (rack/checkout/stairs/displayTable/vinylDesk/npc/poster).
- **Room** (`world/mainRoom.ts`): enlarged **16×13 → 24×18**, carved an **L-shape void** (bottom-right)
  so it's an irregular explorable floor plan. Placed per the map: racks (left wall + right wall +
  centre island), 2 display tables, vinyl desk, 3 NPCs, couch + rug lounge, 2 mannequins, 2 speakers,
  2 stock boxes, checkout (2-wide, bottom-left), stairs + poster-with-button (top → Basement),
  decorative wall posters. `isWalkable` now also rejects tiles blocked by solid fixtures.
- **wallVariant** (`art/wallVariant.ts`): rewritten to classify by **floor-adjacency** (supports the
  irregular shape + interior walls): floor-below→`wall-top`, floor-above→`wall-bottom`,
  floor-beside→`wall-side`, fully enclosed→`wall-fill` (plain dark, no trim — keeps the void from
  showing stray pink trim stripes). New `wall-fill` art + registry bake.
- **WorldScene**: renders multi-tile props via footprint (centre + scaled to wTiles×hTiles) with
  contact shadows; depth order floor/rug/poster/shadow/props/char. Movement already blocked by solid
  fixtures (walk *around* them). Added **face-and-press-Z/Space/Enter interaction** against the faced
  tile (`interactAhead`); stairs keep step-on.
- **Tests** (20 pass): rewrote `mainRoom.test.ts` (reachability instead of walkable-on-tile; solid
  blocks tile but tile stays floor; stairs step-on; void not walkable; core types present); updated
  `wallVariant.test.ts` for neighbour semantics incl. void + corners; `registry.test.ts` covers new
  keys + every room-produced wall variant.
- Verified live (browse, spaced key presses to respect the 120ms move-lock): large shop renders
  (tables, vinyl desk, mannequin, NPCs, boxes, couch, racks, checkout, poster, rug, L-void); collision
  blocks props; **checkout interaction fired** (`[SCRIPTS] interaction: checkout`); camera follows /
  pans (explorable); clean compiles, no runtime errors.
  Note: still TODO — wire interactions to real behaviour (inventory/cart/basement/dialogue), build the
  Basement room, mobile D-pad. Props use a step-count that's hard to drive blind in QA (move-lock), not
  a gameplay issue.

### Graphics refinement pass — match FireRed Pokémon-Center fidelity
Reference: HGSS/FireRed Pokémon Center interiors (warm wood floors, center floor emblem, back-wall
windows, dense decor, angled corners). Pushed the procedural art much closer.
- **`sprites.ts`** — floor rebuilt as **warm light-oak planks** (2 planks/tile: seam + lit top +
  shaded bottom + deterministic grain flecks). Added a faint **floor emblem** (concentric rings +
  centre band, 96px/6-tile, SCR!PTS take on the Poké Ball inlay). New decor: **window** (wood frame,
  sky glass, muntin bar + greenery), **potted plant**, **leafy tree**, **framed mat** (2-wide, pink
  frame/cream/ink). Palette += oak tones, leaf greens, terracotta, glass.
- **`registry.ts`** — bake + allowlist emblem/window/plant/tree/mat.
- **`mainRoom.ts`** — **beveled the 3 open corners** (45° notches → octagonal outline like the ref;
  bottom-right stays the L-void). Decorated: emblem under room centre (6×6), windows + posters along
  the back wall, couch+rug lounge, 2 trees + 3 plants framing the floor, framed mat bottom-centre.
- **`WorldScene.ts`** — decoration layering by type: flat floor art (emblem 0.4 / rug,mat 0.6),
  wall art (poster,window 1), solid props (couch/mannequin/speaker/box/plant/tree 2 + shadow).
- **20 tests still pass**; clean compile; verified live (browse): wood floor + grain, centre emblem,
  back-wall windows alternating with posters, diamond rug, trees/plants, framed mat — reads as a
  decorated FireRed store interior. No runtime errors.
  Possible further polish: taller 2-row back wall, more counter detailing, character shading — and the
  planned Stage 2 (open-licensed tileset pack) for true pixel-perfect fidelity.

### Next up (candidates)
- Wire loading screen → game (PRESS START → enter world).
- Wire interactions: rack → inventory page, stairs → basement (currently console.log stubs).
- "Face-to-interact" (press Z) instead of step-on-tile; make props block movement.
- Populate the room more (rug/island/plants); add NPCs + dialogue.
- Mobile D-pad controls (reuse the loading-screen Game Boy buttons).
