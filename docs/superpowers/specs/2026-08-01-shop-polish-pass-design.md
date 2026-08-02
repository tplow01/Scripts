# Shop Polish Pass — Design

**Date:** 2026-08-01
**Status:** Approved for planning

## Goal

Ten targeted corrections across the game world, the dialogue script and the
console shell, following the five-character cast landing. No new systems.

## 1. Heath's checkout walk

`playHeathCheckout` passes `lockFacing: "right"` to `walkActor`, so Heath slides
along the counter facing sideways — a shuffle, not a walk.

Drop the `lockFacing` argument on both the outbound and inbound counter walks.
`walkActor` then faces him in the direction of travel (down or up along column
1) and its `restFacing` parameter — already `"right"` — turns him to the
customer on arrival. This removes an argument; it adds no code path.

Heath's first-entry intro walk is unaffected.

## 2. Enter as an interact key

`KEY_TO_BTN` in `lib/controls.ts` maps `z → A` and `x → B`. `WorldScene.onKey`
independently accepts `Enter`, so today Enter can *open* a prompt but does
nothing once the React dialogue owns input — the player must switch to Z to page
through.

Add `Enter: 'A'` to `KEY_TO_BTN`. Existing keys are unchanged.

## 3. TP's patrol route

TP currently walks column 6 from the sofa (row d) to row n, then west to column
3 — passing directly beside the floor logo (columns 7-9, rows k-m) and across
the entrance walkway.

New route, confined to the open floor between the sofa and the checkout:

- Column 4, rows f → n, then one tile west to column 3, row n.

Row f is the first row clear of the sofa seat zone (which covers row e, columns
1-5), so the patrol never enters a seat and never triggers the seat-entry rules.
Column 4 is three columns clear of the logo.

## 4. Behind-the-counter shading

The walkable gap behind the checkout (column 1, rows l-o — the counter's `holes`)
renders as ordinary shop floor, so the counter does not read as having a staff
side behind it.

Add a `floor-staff` art key: the existing floor tile darkened, authored at the
same 32px native size. Place it as **four separate 1×1 decorations** at
(1, l), (1, m), (1, n), (1, o), drawn at depth 0.55 — above the floor, below
props. Four 1×1 pieces rather than one 1×4 decoration, because a multi-tile
decoration stretches a single tile's art across the footprint and would distort
the floor pattern.

Non-solid: Heath stands there and the walk-behind-counter paths cross it.

## 5. Exterior solid black

`hiresExtVoidArt` fills with `"k"` but speckles roughly 1 pixel in 97 with `"z"`
(`(x * 11 + y * 7) % 97 === 0`). Outside the shop must be one solid brand black.

Replace it with a flat `#0D0D0D` fill — the same value as the camera background
already set for the main room, so the apron and the background become a single
uninterrupted field.

## 6. Basement shading on characters

The Basement's ambient overlay sits at depth 5. Characters render at depth 3
(NPCs) and 10 (the player), so the player passes *over* the darkening and reads
as lit while the room around him is in shadow.

Tint the characters instead of moving the overlay: on entering the Basement,
apply a dark tint to Scribbs and to the room's NPCs; clear it on leaving. Tinting
keeps the player readable, which raising the overlay above depth 10 would not —
he would darken exactly as much as the floor.

The tint is applied in `loadRoom` from a per-room value, so a future dim room
needs data rather than a new branch.

## 7. Bookcase

The music alcove (row b) currently reads: speaker (2), vinyl desk (3-4),
speaker (5), record crate (6). It is asymmetric — the crate has no counterpart.

Add a `bookcase` art key and place it solid at **b1**, mirroring the crate about
the vinyl desk: bookcase, speaker, desk, speaker, crate. b1 is free floor today.

The crate's conceal/slide-right behaviour over the secret stairs is unchanged.

## 8. Dialogue

Most of the script already matches. Verified as correct and **not changed**:

- Heath's three intro pages, including page 2 — `{B}` already renders as "X" on
  desktop (`app/page.tsx:360`).
- The checkout exchange: "You find some dope pieces?" → Checkout Yes/No.
- The Basement's closing line: "You have to check these pieces out, they are
  insane!"
- Karl's sofa line and TP's collection-dependent line plus "This spot is
  sweeeeeet! The staff is awesome and the pieces are sick!"

Changed — **Teo** takes three pages, absorbing the line left homeless when the
fourth generic shopper was cut:

1. "These just dropped this morning."
2. "I think there's only a few **pairs** left though." (currently "pieces")
3. "There's so many sick pieces, I can't choose which one to get… might js have
   to get a few, don't tell my bank."

## 9. Shell utility buttons on desktop

The desktop utility rail renders its two `DmgBtn`s with `labelBeside`, putting
the label to the right of the pill; every mobile layout stacks the pill above its
label. Remove `labelBeside` from both desktop buttons so all layouts read pill
above, label below.

## 10. Console body colour

`SHELL_PINK = '#FF4FA3'` in `components/shell/theme.ts` becomes `#6F6F73`, the
brand neutral grey. Rename the constant to `SHELL_BODY` — "pink" would no longer
be true — and update its two references in `GameBoyShell.tsx`.

`WORDMARK_PINK`, the start screen, and every in-game pink accent are unchanged:
pink stays the accent against a neutral body.

## Testing

- `KEY_TO_BTN` maps Enter to A alongside z.
- TP's waypoints are orthogonally adjacent, walkable, outside every seat zone,
  and never enter columns 7-9 (the logo footprint).
- The bookcase's tile is walkable floor in the room grid before it is placed, and
  solid afterwards.
- `hiresExtVoidArt` contains exactly one distinct colour.
- The four `floor-staff` decorations sit on the checkout's `holes` tiles and are
  non-solid.
- Existing suites continue to pass unchanged.

Visual items (shell grey, button stacking, basement tint, checkout shading,
Heath's facing) are verified in the browser, not by assertion.

## Out of scope

- The catalog split and admin work (separate spec).
- Any change to the cast, the walk cycle, or room geometry beyond the tiles named
  above.
- Backend, auth, Stripe, Supabase.
