# Five-Character Cast — Design

**Date:** 2026-08-01
**Status:** Approved for planning

## Goal

Replace the current mix of one authored player sprite and six procedural NPCs
with a named cast of exactly five hand-drawn characters, and move the walk
animation to a FireRed/LeafGreen cadence shared by the player and NPCs.

## Cast

| Character | Room | Placement | Behaviour |
|---|---|---|---|
| Scribbs | main | player spawn | Player-controlled (unchanged role) |
| Heath | main | behind the checkout | Existing intro + checkout walk sequences, now on authored art |
| Heath | basement | replaces `basement-npc` | Static; independent instance with its own dialogue |
| Teo | main | vertical clothing rail | Patrols 2–3 tiles up/down, slow, pausing at each end |
| TP | main | sofa ↔ checkout | Walks a fixed loop between the two, pausing at each end |
| Karl | main | beside the sofa | Static, facing into the room |

Karl stands *beside* the sofa rather than on it — the source art contains only
standing walk poses, and faking a seated pose by occluding his legs behind the
couch back distorts his proportions.

The two Heath instances are independent. They are never co-visible, so no
continuity logic is required.

All five characters are solid; the player cannot walk through them.

## 1. Asset pipeline

Generalise `scripts/import-scribbs.py` into `scripts/import-sprites.py`,
covering all five characters.

**Source:** `~/Documents/Sprites/{Karl,Teo,TP,Scribbs,Heath}/`, 12 PNGs each at
6667×6667 with real alpha channels.

**Name mapping:**

- Direction: `Front→down`, `Back→up`, `Left→left`, `Right→right`
- Frame: bare filename→`both`, `_Left→left`, `_Right→right`
- e.g. `Karl_Sprites_Front_Left.png` → `karl-down-left.png`

**Cropping and scaling:**

- Bounding box comes from **alpha alone**. The existing script also treats
  near-white pixels as empty; with real alpha that is unnecessary and would
  erase light-coloured garments.
- **Per-character union bounding box** across that character's 12 frames. This
  preserves the foot baseline frame to frame — the same guarantee the current
  Scribbs import provides.
- Each character is scaled **independently to a common target content height of
  59px**, which is Scribbs' current rendered height
  (`scribbs-down-both.png` content bbox = 43×59 within its 64px canvas). All
  five characters therefore render at equal size, and Scribbs' existing
  on-screen size is unchanged.
- Nearest-neighbour resampling only.

**Output:** `public/assets/{scribbs,heath,teo,tp,karl}/{name}-{down|up|left|right}-{both|left|right}.png`
— 64×64 canvas, bottom-centre anchored, 12 frames per character, 60 PNGs total.

All 12 frames are imported for every character, including the static ones, so
any character can be given motion later without re-running an import.

## 2. Loading and the character registry

Today Scribbs is special-cased in `BootScene.preload` while every NPC is baked
procedurally in `registry.ts`. That split collapses.

- New `src/game/art/characters.ts`: a single table mapping character id →
  asset folder + default facing.
- `BootScene.preload` loops that table, loading 12 frames per character. The
  hand-written Scribbs loop is removed.
- `registry.ts` drops the character bakes: `npc`, `npcRail`, `npcSitter`,
  `npcGazer`, `npcShopper`, `cashier`, and `cashier-walk-a` through `-d`. The
  corresponding definitions are deleted from `hiresArt.ts`. Prop art in
  `hiresArt.ts` is untouched.
- `CHARACTER_KEYS` in `WorldScene` becomes the new five-id set.

The procedural NPCs `npcShopper` and `npcGazer` are deleted outright rather
than kept as anonymous background shoppers — mixing procedural art with
authored PNGs would clash visually.

## 3. Movement: `NpcPatrol`

One module, driving both Teo and TP from data:

- A waypoint list, a step interval, and a pause duration at each endpoint.
- **Blocked rule:** if the next tile is occupied by the player or another NPC,
  hold position and retry on the next tick. NPCs never clip through anything.
- Interacting with a patrolling NPC pauses their patrol for the duration of the
  dialogue; it resumes on close.

Teo: 2–3 tiles along the vertical rail. TP: sofa ↔ checkout.

## 4. Animation: FireRed/LeafGreen walk cycle

A shared `WalkCycle` module used by the player and by `NpcPatrol`, so every
character animates identically.

- **One tile = one stride.** The step frame is held for the entire tile move,
  alternating foot each tile. The current code reverts to `both` at 65% through
  each step (`WorldScene.ts`), which makes continuous walking read as a series
  of restarts. That behaviour is removed.
- **Neutral (`both`) only when stopped** — on input release, on collision, and
  on turn-in-place. Never mid-walk.
- **~250ms per tile**, up from the current `PLAYER_STEP_MS = 210`.
- **Turn-in-place:** pressing a new direction from a standstill turns the
  character to face it without moving, for ~130ms, before the first step
  begins. Only a sustained press walks. This applies to the player in all
  cases, matching FRLG.
- NPCs use the same module at a slower step interval with endpoint pauses.

## 5. Dialogue

Teo, TP, Karl and basement-Heath each register as interactables in
`app/page.tsx` alongside the existing entries, following Heath's current
pattern: a name tab (`TEO` / `TP` / `KARL` / `HEATH`) plus 1–2 pages of copy.

Lines ship as placeholders marked with `TODO` comments; Thomas writes the final
copy.

## Out of scope

- Seated art for Karl or anyone else.
- Free-roam wandering. TP follows a fixed sofa↔checkout route, not a
  random walk.
- Changes to prop art, world layout, or room geometry.
