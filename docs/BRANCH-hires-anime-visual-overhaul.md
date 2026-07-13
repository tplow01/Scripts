# Branch: `codex/hires-anime-visual-overhaul`

This branch is the isolated production-graphics overhaul. `main` remains clean.

## Visual direction

- Original SCR!PTS art only; PokeMMO and similar overworld games are broad
  readability references, never asset sources.
- 32×32 native environment tiles.
- 32×40 bottom-anchored characters on a 1×1 collision tile.
- Fashion-model proportions, oversized garments, visible collection graphics,
  headphones/jewellery, and strong anime-inspired hair silhouettes.
- Integer camera scaling, nearest-neighbour rendering, and pixel-clean lighting.

## Implemented

- Original Scribbs directional/walk frames.
- Original Heath idle and walking frames.
- Four distinct shop models plus the Basement NPC, with six hair families.
- Higher-resolution showroom/Basement floors and all wall variants.
- Higher-resolution racks, checkout, stairs, vinyl desk, speakers, stock boxes,
  crates, couch, and entrance mat.
- Correct 32×40 bottom anchoring for player, NPCs, and scripted Heath sequences.
- Layered entrance/lounge/till/Basement light pools and animated dust motes.
- Original rainy-night title tableau: moving skyline, train, reflections, rain,
  and walking Heath/Scribbs figures.
- Removed runtime loading of the supplied GBA sprite frames.
- Restored the exact pre-overhaul comet + `scr!pts` floor emblem and plain-pink
  entrance mat as brand invariants; high-resolution art must not reinterpret them.
- Refined anatomy with separated sleeves, visible hands, larger eyes, profile
  nose/ear details, back-facing construction, and directional arm/leg motion.
- Added a PokeMMO-inspired (reference-only) four-phase cycle for every Scribbs
  direction and Heath's scripted walk: lead, passing lift, opposite lead, idle.
- The canonical 480px logo now has a native 96px nearest-neighbour floor asset,
  eliminating both procedural geometry drift and browser-dependent resampling.

## Source map

| Area | File |
|---|---|
| High-resolution art | `src/game/art/hiresArt.ts` |
| Texture registration | `src/game/art/registry.ts` |
| Character anchoring, lights, animation | `src/game/scenes/WorldScene.ts` |
| Deterministic boot | `src/game/scenes/BootScene.ts` |
| Cinematic city | `components/PixelCityIntro.tsx` |
| Title composition | `components/StartScreen.tsx` |

## Verification

Run `npm test`, `npx tsc --noEmit`, and `npm run build`. Then play from the
title screen at desktop and mobile sizes, checking the Lobby entrance, lounge,
checkout sequence, hidden-stair reveal, Basement transition, and return path.
