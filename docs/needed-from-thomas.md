# Needed from Thomas — assets, copy, and open decisions

Living checklist of everything blocking a "no more placeholders" pass on the
in-game shop + its dialogue UI. Update/delete lines as they land. See also
[`asset-manifest.md`](./asset-manifest.md) for the full pixel-art plan (still
mostly `placeholder` status — that's the big one, tracked separately).

## Assets (images)

- [ ] **Loading-screen imagery.** Confirmed coming; decide whether the outer
  GameBoyShell border stays or goes once it's in. Leave margins clear until
  then (per earlier note — don't build edge decoration around it).
- [ ] **Heath side-view sprite** (facing right). His art (`cashier` in
  `src/game/art/sprites.ts` / registered in `src/game/art/registry.ts`) is
  front-facing only, so "Heath faces the checkout" is currently a horizontal
  mirror of the front sprite (`flip: true` on the `cashier` interaction in
  `src/game/world/mainRoom.ts`), not a true side pose. A real side-view frame
  would sell the FireRed clerk-behind-counter look properly.
- [ ] **Heath second walk frame.** His intro walk (`playHeathIntro` /
  `HEATH_INTRO_PATH` in `src/game/scenes/WorldScene.ts` /
  `src/game/world/mainRoom.ts`) currently glides a single static frame with no
  leg animation. A walk-cycle frame (or two) would fix that.
- [ ] Everything else in [`asset-manifest.md`](./asset-manifest.md) is still
  `placeholder`/coloured-rectangle — out of scope for this pass but the
  eventual next big lift.

## Copy to review (all placeholder, written by me — flag anything off-voice)

- **Heath's intro** (`HEATH_INTRO_PAGES` in `app/page.tsx`): "Yo! Welcome to
  SCR!PTS — a home for creative culture. I'm Heath." / "Walk up to anything
  and press {A} to check it out." / "When you're ready, bring your pieces to
  the counter. I'll sort you out."
- **Heath at the counter** (`PROMPTS.cashier`): "Heath here — take your time
  looking around." / "When you're ready, bring your pieces to the counter."
- **Basement NPC's secretive line** (`PROMPTS["basement-npc"]`): "Shhh… how
  did you find this place?" / "…Well. Since you're already down here —" /
  "Check out my favourite pieces?"
- Floor-shopper flavour lines (`npc-rail`, `npc-gazer`, `npc-sofa`,
  `npc-checkout` in `app/page.tsx`) — unchanged from before, still worth a
  pass if the brand voice has shifted.

## Open decisions

- **Nameplates:** the new FireRed-style dialogue box (`components/DialogPrompt.tsx`)
  can show a speaker tab (e.g. "HEATH") above the box. Right now only Heath
  has one (`speaker: "Heath"` on his prompts) — the other floor NPCs
  (rail-browser, rail-gazer, sofa-sitter, checkout customer) stay anonymous
  and untagged. Confirm that's right, or give them names too.
- **Outer border** for the loading screen (see above) — keep the GameBoyShell
  bezel or go full-bleed once the art arrives?

## Done this session (for reference, not action items)

- Dialogue box rebuilt as a pixel-art FireRed-style window (stepped/faceted
  corners, no border-radius) with a letter-by-letter typewriter reveal, a
  blinking pixel ▼ advance cue, and a nested pixel ▶ selector for YES/NO that
  now pops into the box's top-right corner instead of floating detached.
  First press mid-typing snaps to full text; the next press actually advances
  — matches classic GBA text-box feel. All in `components/DialogPrompt.tsx`.
- FireRed-remade sprite refresh: Heath's white-beanie cashier sprite plus four
  new floor-shopper sprites (Teo, Thomas, Karl, Gomes), the floor emblem
  rebuilt to the true scr!pts logo, a luxury entrance facade (fascia doors,
  display windows, topiary, warm mat), and a street scene (sidewalk/kerb/
  asphalt/lamp) visible outside the bottom wall of the main room (basement
  void stays pure dark). Verified end-to-end in a full playthrough — Heath
  waits at the till while the cart drawer is open, the vinyl deck reveals the
  basement stairs, and the basement NPC dialogue works. Heath's art is still
  front-facing single-frame (see the side-view/walk-frame asks above, which
  remain outstanding — this pass didn't add new poses).
