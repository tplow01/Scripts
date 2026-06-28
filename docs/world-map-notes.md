# World Map — Working Notes (WIP)

> Scratchpad for the in-progress map/UX design discussion. **Not canonical** — once the
> layout is settled, the decisions here get folded into `PRD.md` and this file can be
> trimmed or removed. Brand rules live in `BRAND.md`. Last updated: 2026-06-28.

## Where we are

Designing the layout of the SCR!PTS store map. **Map v2** (cleaner whiteboard sketch) is in,
with a legend/key. Three areas now defined: **Main**, **Basement**, **Lounge**.

### Map v2 — legend (from the whiteboard key)

| Symbol | Meaning |
|---|---|
| `X` | boxes (props/decor) |
| `I` | clothing rack (interact → shopping interface) |
| `DT` | display table |
| `VD` | vinyl desk |
| `●` | NPC |
| `Ω` | mannequin |
| `S` | speaker |

### Map v2 — areas

**Main room**
- **Checkout** bottom-left (Heath NPC), arrow up into the room.
- **Spawn** near bottom-center; a "walk" path leads in from the entrance.
- **Couch** on the left wall.
- **Rugs** in the center; **boxes (X)**, **clothing racks (I)**, **display tables / mannequins** around.
- **"Table (Book talking about 'Basement')"** top-left — a readable book that *hints* at the Basement.
- **"Poster w/ button for →"** along the top wall — an interactive poster/button tied to the
  Basement (reveals/points to it). Exact behaviour TBD (see open Qs).
- A **circular-arrow doodle** bottom-left — meaning unclear (see open Qs).

**Basement** (hidden area)
- Entered via **stairs** ("Stairs →"); has its own **Spawn** point.
- Contains **boxes (X)**, an **NPC (●)**, a curved counter shape. Darker, mythology-not-sales (per PRD).

**Lounge** — this is the old "social media lounge", now clearly a **music/vinyl lounge**
- **Couch**, a **Vinyl Desk (VD)** centered with a **speaker (S)** on each side, **NPC(s)**.
- Fits the brand's music pillar (vinyl + sound), community hangout vibe.

### Decisions locked so far

- **Reference feel:** Pokémon FireRed interior; classic Pokémon dialogue voice (per `BRAND.md`).
- **Camera:** follows Scribbs, **moderately zoomed in** — most of a room visible, not single-screen-locked.
- **Space:** continuous where it makes sense; **Basement is a fade transition** into a darker area.
- **Clothing rack interaction:** opens the **AWGE-style shopping interface** (per `BRAND.md`), then
  returns to the world.
- **Display tables & mannequins:** **KEPT** (they're in the v2 key).

### Architecture principle (locked) — future-proof the visuals

Build so graphics can be **upgraded later as a swap, not a rewrite**:
- Separate **world data** (positions of walls, racks, art slots, desk, basement stairs +
  interaction logic) from **art** (referenced by keys/IDs, never baked in).
- Maps authored in **Tiled**; art in swappable tilesets/spritesheets.
- Stable **tile grid / coordinate system** independent of art resolution.
- v1 can use placeholder pixel art; level up visuals later without touching gameplay logic.

→ Fold this into the PRD's Technical Architecture section once layout is final.

## Resolved by Map v2

- **Lounge angle** → it's a **music/vinyl lounge** (vinyl desk + speakers + couch), not a
  "social media" feature. Renames the old "social media lounge".
- **"Drop 05" / booth** → not in v2; treat as **dropped** unless Heath reintroduces it.
- **Display tables & mannequins** → **kept** in the main room.
- **Basement access** → via **stairs**, with two in-world hints in the main room: the
  **book on a table** and the **poster-with-button**.

## Open questions (to resolve next)

1. **Poster button** — what exactly does it do? (reveal the hidden stairs? unlock/teleport?
   just lore/flavor?) And is the Basement gated until the player finds the hint?
2. **Connections** — how does the player travel Main ⇄ Lounge ⇄ Basement? Corridors (continuous)
   or fade-transition doorways? (v1 had a left corridor; v2 draws the three as separate blocks.)
3. **Circular-arrow doodle** (bottom-left of Main) — what is it? (a logo spot? a turntable/360
   object? a spinning prop?)
4. **Basement contents** — what's the NPC's role + what's sold/shown down there (vs. the PRD's
   "mythology not sales" + hard exclusion rules)?

## Next inputs expected from Heath/Karl

- Confirm connections between the three areas.
- UX detail on the rack → AWGE shopping-interface transition.
