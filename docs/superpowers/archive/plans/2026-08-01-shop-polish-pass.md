# Shop Polish Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ten targeted corrections to the shop world, dialogue script and console shell, following the five-character cast landing.

**Architecture:** Every change is local — a key map entry, a waypoint list, two art definitions, a room-data field, a dialogue array and two shell constants. No new systems and no new abstractions; the basement tint is the only addition to a shared type, and it is one optional field read in one place.

**Tech Stack:** Next.js 15, React 19, TypeScript, Phaser 3, Vitest. No new dependencies.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-01-shop-polish-pass-design.md`.
- Brand black is `#0D0D0D`; brand neutral grey is `#6F6F73`. Exact values, no approximations.
- Game code under `src/game/` uses double quotes and semicolons; `lib/`, `app/` and `components/` use single quotes and no semicolons. Match the file you are editing.
- Art is authored at 32px native (`HIRES_NATIVE_SIZE`) using the `P` palette already defined at the top of `src/game/art/hiresArt.ts`. Never introduce a raw hex into an art definition — add a palette entry or reuse one.
- The floor logo occupies columns 7-9, rows k-m. No NPC route may enter it.
- Run tests with `npx vitest run` and typecheck with `npx tsc --noEmit`, both from the repo root.
- Do not touch the catalog, admin, or product code — a separate plan owns those.

---

### Task 1: Enter as an interact key, and TP's shorter route

**Files:**
- Modify: `lib/controls.ts:16-19`
- Modify: `src/game/world/mainRoom.ts` (the `tp` interaction's `patrol.waypoints`)
- Test: `__tests__/controls.test.ts`, `__tests__/characters.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Write the failing tests**

Append to `__tests__/controls.test.ts`:

```typescript
describe('Enter as interact', () => {
  it('maps Enter to the A button alongside z', () => {
    expect(KEY_TO_BTN.Enter).toBe('A')
    expect(KEY_TO_BTN.z).toBe('A')
  })
})
```

Add `KEY_TO_BTN` to that file's existing import from `@/lib/controls` if it is not already imported.

Append to `__tests__/characters.test.ts`, inside the existing `describe('patrolling NPCs')` block:

```typescript
  it('keeps every route clear of the floor logo', () => {
    // The SCR!PTS floor mark occupies columns 7-9, rows k-m (11-13).
    for (const npc of patrols) {
      for (const p of npc.patrol!.waypoints) {
        const onLogo = p.x >= 7 && p.x <= 9 && p.y >= 11 && p.y <= 13
        expect(onLogo, `${npc.id} crosses the logo at ${p.x},${p.y}`).toBe(false)
      }
    }
  })

  it('keeps TP between the sofa and the checkout', () => {
    const tp = patrols.find((p) => p.id === 'tp')!
    for (const p of tp.patrol!.waypoints) {
      expect(p.x).toBeLessThanOrEqual(4)
      expect(p.y).toBeGreaterThanOrEqual(6)
    }
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run __tests__/controls.test.ts __tests__/characters.test.ts`
Expected: FAIL — `KEY_TO_BTN.Enter` is undefined, and TP's route reaches column 6.

- [ ] **Step 3: Add the Enter mapping**

In `lib/controls.ts`, change the `KEY_TO_BTN` definition to:

```typescript
/** KeyboardEvent.key → console button. Lowercase letters; arrows verbatim. */
export const KEY_TO_BTN: Record<string, Btn> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  // Enter interacts like Z: the scene already accepts it, so without this the
  // dialogue layer would swallow Enter and force a switch to Z mid-conversation.
  z: 'A', Enter: 'A', x: 'B',
}
```

- [ ] **Step 4: Shorten TP's route**

In `src/game/world/mainRoom.ts`, replace the `tp` interaction with:

```typescript
    // TP paces the open floor between the sofa and the checkout: down column 4
    // from row f (the first row clear of the sofa's seat zone) to row n, then
    // one tile west to the counter approach. Well clear of the floor logo at
    // columns 7-9. Every waypoint is orthogonally adjacent to the last — this
    // is a hand-authored route, not a pathfinder.
    { id: "tp", type: "npc", tileX: C(4), tileY: R("f"), artKey: "tp-down-both", solid: false,
      patrol: {
        waypoints: [
          { x: C(4), y: R("f") }, { x: C(4), y: R("g") }, { x: C(4), y: R("h") },
          { x: C(4), y: R("i") }, { x: C(4), y: R("j") }, { x: C(4), y: R("k") },
          { x: C(4), y: R("l") }, { x: C(4), y: R("m") }, { x: C(4), y: R("n") },
          { x: C(3), y: R("n") },
        ],
      } },
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run`
Expected: PASS, all files. The existing assertions that every waypoint is walkable and outside a seat zone now cover the new route too.

- [ ] **Step 6: Commit**

```bash
git add lib/controls.ts src/game/world/mainRoom.ts __tests__/controls.test.ts __tests__/characters.test.ts
git commit -m "fix: accept Enter as interact and keep TP off the floor logo"
```

---

### Task 2: Heath faces where he walks at the counter

**Files:**
- Modify: `src/game/scenes/WorldScene.ts` (the two `walkActor` calls inside `playHeathCheckout`)

**Interfaces:**
- Consumes: `walkActor(img, path, character, from, restFacing, lockFacing?, stepMs?)` — already defined in the same file.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Drop the locked facing on the outbound walk**

In `src/game/scenes/WorldScene.ts`, inside `playHeathCheckout`, change:

```typescript
    const path = heathPathAlongCounter(fy);
    await this.walkActor(heath, path, "heath", HEATH_HOME, "right", "right");
```

to:

```typescript
    // No locked facing: he walks facing the way he travels (down or up the
    // counter), and `restFacing` turns him back to the customer on arrival.
    // Locking him to "right" made him shuffle sideways along the counter.
    const path = heathPathAlongCounter(fy);
    await this.walkActor(heath, path, "heath", HEATH_HOME, "right");
```

- [ ] **Step 2: Drop the locked facing on the return walk**

In the same method, change:

```typescript
    const outAt = path[path.length - 1] ?? HEATH_HOME;
    await this.walkActor(heath, inbound, "heath", outAt, "right", "right");
```

to:

```typescript
    const outAt = path[path.length - 1] ?? HEATH_HOME;
    await this.walkActor(heath, inbound, "heath", outAt, "right");
```

- [ ] **Step 3: Verify types and tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean typecheck; all tests pass.

- [ ] **Step 4: Verify in the browser**

Run `npm run dev` and note the printed port (it falls back to 3001 if 3000 is taken). Press START, clear Heath's intro dialogue, then walk to the checkout and press Z facing the counter.
Expected: Heath walks down the counter facing downward, then turns to face right toward you before speaking. He must not travel sideways. Stop the dev server afterwards.

- [ ] **Step 5: Commit**

```bash
git add src/game/scenes/WorldScene.ts
git commit -m "fix: walk Heath along the counter facing his direction of travel"
```

---

### Task 3: Solid black exterior and a shaded staff side

**Files:**
- Modify: `src/game/art/hiresArt.ts` (replace `hiresExtVoidArt`, add `buildStaffFloor`)
- Modify: `src/game/art/registry.ts` (register `floor-staff`)
- Modify: `src/game/world/mainRoom.ts` (four decorations)
- Test: `__tests__/hiresArt.test.ts`, `__tests__/registry.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: art key `"floor-staff"`, resolvable via `resolveTextureKey`.

- [ ] **Step 1: Write the failing tests**

Append to `__tests__/hiresArt.test.ts`, inside the existing `describe('32px production art')` block:

```typescript
  it('fills the exterior void with a single solid colour', () => {
    // Outside the shop is one flat field of brand black — no speckle.
    const chars = new Set(hiresExtVoidArt.rows.join('').split(''))
    expect(chars.size).toBe(1)
    expect(hiresExtVoidArt.palette[[...chars][0]]).toBe('#0D0D0D')
  })

  it('authors the staff floor at native resolution and darker than the shop floor', () => {
    expect(hiresStaffFloorArt.rows).toHaveLength(HIRES_NATIVE_SIZE)
    expect(hiresStaffFloorArt.rows.every((r) => r.length === HIRES_NATIVE_SIZE)).toBe(true)
    expect(hiresStaffFloorArt.rows.join('')).not.toBe(hiresFloorArt.rows.join(''))
  })
```

Extend that file's import to include `hiresExtVoidArt` and `hiresStaffFloorArt`.

Append to `__tests__/registry.test.ts`:

```typescript
describe('staff floor art key', () => {
  it('resolves floor-staff', () => {
    expect(resolveTextureKey('floor-staff')).toBe('floor-staff')
  })
})
```

Add `resolveTextureKey` to that file's import from `@/game/art/registry` if it is not already imported.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run __tests__/hiresArt.test.ts __tests__/registry.test.ts`
Expected: FAIL — `hiresStaffFloorArt` does not exist and the void art has two colours.

- [ ] **Step 3: Make the exterior solid**

In `src/game/art/hiresArt.ts`, replace the `hiresExtVoidArt` definition with:

```typescript
/**
 * Everything outside the shop: one flat field of brand black, matching the
 * camera background so the apron and the backdrop read as a single surface.
 * Deliberately unpatterned — a speckle here made the void look like terrain.
 */
export const hiresExtVoidArt: PixelArt = {
  rows: Array.from({ length: 32 }, () => "k".repeat(32)),
  palette: P,
};
```

The palette's `k` is already `#0D0D0D`.

- [ ] **Step 4: Add the staff floor art**

In `src/game/art/hiresArt.ts`, directly after the `buildFloor` function, add:

```typescript
/**
 * Behind-the-counter floor — the staff side of the checkout. Same slab
 * construction as the shop floor, several shades darker, so the counter reads
 * as a barrier with a working side behind it.
 */
function buildStaffFloor(): PixelArt {
  const g = grid(32, 32, "T");
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    if (x % 16 === 0 || y % 16 === 0) put(g, x, y, "G");
    else if (x % 16 === 1 || y % 16 === 1) put(g, x, y, "t");
    else if ((x * 13 + y * 7) % 71 === 0) put(g, x, y, "h");
  }
  return { rows: rows(g), palette: P };
}
```

Then, next to the other floor exports (`hiresFloorArt` / `hiresBasementFloorArt`), add:

```typescript
export const hiresStaffFloorArt = buildStaffFloor();
```

- [ ] **Step 5: Register the art key**

In `src/game/art/registry.ts`:

Add `hiresStaffFloorArt` to the import list from `./hiresArt`.

Add `"floor-staff",` to the `TEXTURE_KEYS` array, directly after `"floor-basement",`.

Add this line inside `bakeAllTextures`, directly after the `floor-basement` bake:

```typescript
  bakePixelArt(scene, "floor-staff", hiresStaffFloorArt);
```

- [ ] **Step 6: Place the staff floor behind the counter**

In `src/game/world/mainRoom.ts`, add to the `decorations` array, directly above the couch entry:

```typescript
    // The staff side of the checkout — the counter's walkable hole tiles
    // (col 1, rows l–o). Four 1×1 pieces rather than one 1×4: a multi-tile
    // decoration stretches a single tile's art across the whole footprint,
    // which would smear the floor pattern.
    { tileX: C(1), tileY: R("l"), artKey: "floor-staff", solid: false },
    { tileX: C(1), tileY: R("m"), artKey: "floor-staff", solid: false },
    { tileX: C(1), tileY: R("n"), artKey: "floor-staff", solid: false },
    { tileX: C(1), tileY: R("o"), artKey: "floor-staff", solid: false },
```

- [ ] **Step 7: Draw it above the floor but below props**

In `src/game/scenes/WorldScene.ts`, inside `loadRoom`'s decoration loop, the `flatFloor` set decides which art hugs the ground. Change:

```typescript
    const flatFloor = new Set(["emblem", "rug", "mat"]);
```

to:

```typescript
    const flatFloor = new Set(["emblem", "rug", "mat", "floor-staff"]);
```

- [ ] **Step 8: Run the tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean typecheck; all tests pass.

- [ ] **Step 9: Verify in the browser**

Run `npm run dev` and note the port. Press START and look at the checkout.
Expected: the gap behind the counter is visibly darker than the shop floor, and the black area outside the shop is a flat unspeckled field. Stop the dev server afterwards.

- [ ] **Step 10: Commit**

```bash
git add src/game/art/hiresArt.ts src/game/art/registry.ts src/game/world/mainRoom.ts \
  src/game/scenes/WorldScene.ts __tests__/hiresArt.test.ts __tests__/registry.test.ts
git commit -m "feat: solid black exterior and a shaded staff side behind the counter"
```

---

### Task 4: Shade characters in the Basement

**Files:**
- Modify: `src/game/world/types.ts` (add `characterTint` to `Room`)
- Modify: `src/game/world/basement.ts` (set it)
- Modify: `src/game/scenes/WorldScene.ts` (`loadRoom`, `placeProp`, `spawnNpc`)
- Modify: `src/game/actors/NpcActor.ts` (accept and apply a tint)
- Test: `__tests__/characters.test.ts`

**Interfaces:**
- Consumes: `NpcActorOptions` from `src/game/actors/NpcActor.ts`.
- Produces: `Room.characterTint?: number`; `NpcActorOptions.tint?: number`.

- [ ] **Step 1: Write the failing test**

Append to `__tests__/characters.test.ts`:

```typescript
describe('room lighting', () => {
  it('tints characters in the basement and leaves the shop untinted', () => {
    expect(basementRoom.characterTint).toBeDefined()
    expect(mainRoom.characterTint).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run __tests__/characters.test.ts`
Expected: FAIL — `characterTint` is not a property of `Room`.

- [ ] **Step 3: Add the field to the room type**

In `src/game/world/types.ts`, inside `interface Room`, directly after the `ambient` field:

```typescript
  /**
   * Multiply-tint applied to every character in the room. The ambient overlay
   * sits below the player, so without this he reads as lit while the room
   * around him is in shadow. Tinting rather than raising the overlay keeps him
   * readable — under the overlay he would darken exactly as much as the floor.
   */
  characterTint?: number;
```

- [ ] **Step 4: Set it on the Basement**

In `src/game/world/basement.ts`, directly after the `ambient` line:

```typescript
  characterTint: 0x8a8a96,
```

- [ ] **Step 5: Let NPC actors carry a tint**

In `src/game/actors/NpcActor.ts`, add to `NpcActorOptions`:

```typescript
  /** Room lighting tint, if the room sets one. */
  tint?: number;
```

Then in the constructor, directly after the `this.image = scene.add...setDepth(opts.depth);` assignment chain completes, add:

```typescript
    if (opts.tint !== undefined) this.image.setTint(opts.tint);
```

- [ ] **Step 6: Apply the tint in the scene**

In `src/game/scenes/WorldScene.ts`:

In `placeProp`, immediately after the line `if (isCharacter) img.setOrigin(0.5, 1).setDisplaySize(ts, ts * CHARACTER_HEIGHT_TILES);`, add:

```typescript
    if (isCharacter && this.room.characterTint !== undefined) img.setTint(this.room.characterTint);
```

In `spawnNpc`, add `tint: this.room.characterTint,` to the `new NpcActor(this, { ... })` options object.

In `loadRoom`, at the end of the method just before `this.saveSession();`, add:

```typescript
    // Room lighting: the player carries across rooms, so his tint is set on
    // every load rather than once at creation.
    if (this.room.characterTint !== undefined) this.scribbs.setTint(this.room.characterTint);
    else this.scribbs.clearTint();
```

- [ ] **Step 7: Run the tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean typecheck; all tests pass.

- [ ] **Step 8: Verify in the browser**

Run `npm run dev` and note the port. Reach the Basement (play the vinyl deck to reveal the stairs at b6, then step onto them).
Expected: Scribbs and the Basement's Heath are visibly darker than in the shop, sitting in the room's shadow, but still clearly readable. Walking back up restores full brightness. Stop the dev server afterwards.

- [ ] **Step 9: Commit**

```bash
git add src/game/world/types.ts src/game/world/basement.ts src/game/scenes/WorldScene.ts \
  src/game/actors/NpcActor.ts __tests__/characters.test.ts
git commit -m "feat: shade characters to match basement lighting"
```

---

### Task 5: Bookcase in the music alcove

**Files:**
- Modify: `src/game/art/hiresArt.ts` (add `hiresBookcaseArt`)
- Modify: `src/game/art/registry.ts` (register `bookcase`)
- Modify: `src/game/world/mainRoom.ts` (place it)
- Test: `__tests__/mainRoom.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: art key `"bookcase"`.

- [ ] **Step 1: Write the failing test**

Append to `__tests__/mainRoom.test.ts`:

```typescript
describe('music alcove symmetry', () => {
  it('mirrors the record crate with a bookcase about the vinyl desk', () => {
    const at = (x: number, y: number) =>
      (mainRoom.decorations ?? []).find((d) => d.tileX === x && d.tileY === y)
    // Row b: bookcase(1) speaker(2) desk(3-4) speaker(5) crate(6).
    expect(at(1, 2)?.artKey).toBe('bookcase')
    expect(at(2, 2)?.artKey).toBe('speaker')
    expect(at(5, 2)?.artKey).toBe('speaker')
    expect(at(6, 2)?.artKey).toBe('crates')
  })

  it('makes the bookcase solid', () => {
    const bookcase = (mainRoom.decorations ?? []).find((d) => d.artKey === 'bookcase')
    expect(bookcase?.solid).toBe(true)
  })
})
```

Add `mainRoom` to that file's import from `@/game/world/mainRoom` if it is not already imported.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run __tests__/mainRoom.test.ts`
Expected: FAIL — no decoration at (1, 2).

- [ ] **Step 3: Draw the bookcase**

In `src/game/art/hiresArt.ts`, directly after `hiresCratesArt`, add:

```typescript
/** Shelf of records/books — mirrors the crate on the far side of the alcove. */
export const hiresBookcaseArt = fixture(32, 32, (g) => {
  rect(g, 4, 2, 24, 27, "k");   // carcass silhouette
  rect(g, 6, 4, 20, 23, "C");   // back panel
  rect(g, 6, 4, 20, 2, "c");    // lit top edge
  for (let s = 0; s < 3; s++) {
    const top = 6 + s * 7;
    for (let x = 7, i = 0; x < 25; x += 3, i++) {
      rect(g, x, top + (i % 2), 2, 5 - (i % 2), ["p", "b", "m", "y", "r"][(i + s) % 5]);
    }
    rect(g, 6, top + 5, 20, 1, "c"); // shelf board under each row
  }
});
```

- [ ] **Step 4: Register the art key**

In `src/game/art/registry.ts`:

Add `hiresBookcaseArt` to the import list from `./hiresArt`.

Add `"bookcase",` to the `TEXTURE_KEYS` array, directly after `"crates",`.

Add this line inside `bakeAllTextures`, directly after the `crates` bake:

```typescript
  bakePixelArt(scene, "bookcase", hiresBookcaseArt);
```

- [ ] **Step 5: Place it**

In `src/game/world/mainRoom.ts`, in the `decorations` array, directly above the first speaker entry:

```typescript
    // Bookcase (b1) mirroring the record crate at b6 about the vinyl desk, so
    // the music alcove reads symmetrically: bookcase, speaker, desk, speaker, crate.
    { tileX: C(1), tileY: R("b"), artKey: "bookcase", solid: true },
```

- [ ] **Step 6: Run the tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean typecheck; all tests pass. The existing main-room tests confirm the room still has a valid walkable layout.

- [ ] **Step 7: Verify in the browser**

Run `npm run dev` and note the port. Press START and walk north to the music alcove.
Expected: a bookcase stands at the far left of the alcove, balancing the record crate on the right, and Scribbs cannot walk through it. Stop the dev server afterwards.

- [ ] **Step 8: Commit**

```bash
git add src/game/art/hiresArt.ts src/game/art/registry.ts src/game/world/mainRoom.ts __tests__/mainRoom.test.ts
git commit -m "feat: add a bookcase to balance the music alcove"
```

---

### Task 6: Teo's dialogue, and the console shell

**Files:**
- Modify: `app/page.tsx` (the `teo` entry in `PROMPTS`)
- Modify: `components/shell/theme.ts` (`SHELL_PINK` → `SHELL_BODY`)
- Modify: `components/GameBoyShell.tsx` (import, two usages, two `DmgBtn`s)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `SHELL_BODY` exported from `components/shell/theme.ts`, replacing `SHELL_PINK`.

- [ ] **Step 1: Give Teo his three pages**

In `app/page.tsx`, replace the `teo` entry in `PROMPTS` with:

```typescript
  teo: {
    variant: 'message',
    speaker: 'Teo',
    pages: [
      'These just dropped this morning.',
      "I think there's only a few pairs left though.",
      "There's so many sick pieces, I can't choose which one to get… might js have to get a few, don't tell my bank.",
    ],
  },
```

Remove the `TODO(thomas)` comment above the cast's prompt entries — the copy is now the client's own.

- [ ] **Step 2: Turn the console body grey**

In `components/shell/theme.ts`, replace:

```typescript
/** Flat pink shell. One fill, no gradients, no creases — the body is a solid. */
export const SHELL_PINK = '#FF4FA3'
```

with:

```typescript
/** Flat shell body in the brand neutral grey. One fill, no gradients, no creases. */
export const SHELL_BODY = '#6F6F73'
```

The constant is renamed because a constant called `SHELL_PINK` holding a grey misleads the next reader. `WORDMARK_PINK` is unchanged — pink stays the accent against the neutral body.

- [ ] **Step 3: Update the shell to the new constant**

In `components/GameBoyShell.tsx`:

Change the import from `./shell/theme` so `SHELL_PINK` becomes `SHELL_BODY`.

Change `background: SHELL_PINK,` in `rootStyle` to `background: SHELL_BODY,`.

- [ ] **Step 4: Stack the desktop utility buttons**

In `components/GameBoyShell.tsx`, in the desktop branch (`if (layout === 'desktop')`), remove the `labelBeside` prop from both `DmgBtn`s so they read:

```tsx
          <DmgBtn label={UTILITY_LABELS.social} pillWidth={40} onPress={() => onUtility('social')} />
          <DmgBtn label={UTILITY_LABELS.inventory} pillWidth={40} onPress={() => onUtility('inventory')} />
```

`DmgBtn` defaults `labelBeside` to `false`, which stacks the pill above its label — the same arrangement every mobile layout already uses.

- [ ] **Step 5: Confirm no stale references remain**

Run: `grep -rn "SHELL_PINK" components app src lib`
Expected: no matches.

- [ ] **Step 6: Verify types, tests and build**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: clean typecheck, all tests pass, build succeeds.

- [ ] **Step 7: Verify in the browser**

Run `npm run dev` and note the port. Load the site on a desktop-width window.
Expected: the console body is neutral grey with the wordmark still pink; SOCIALS and INVENTORY show the pill above its label, matching mobile. Press START and talk to Teo at the right-hand clothing rail — three pages, the second reading "pairs". Stop the dev server afterwards.

- [ ] **Step 8: Commit**

```bash
git add app/page.tsx components/shell/theme.ts components/GameBoyShell.tsx
git commit -m "feat: grey console body, stacked desktop buttons, Teo's full script"
```

---

## Self-Review

**Spec coverage**

| Spec section | Task |
|---|---|
| 1. Heath's checkout walk | Task 2 |
| 2. Enter as an interact key | Task 1 |
| 3. TP's patrol route | Task 1 |
| 4. Behind-the-counter shading | Task 3 |
| 5. Exterior solid black | Task 3 |
| 6. Basement shading on characters | Task 4 |
| 7. Bookcase | Task 5 |
| 8. Dialogue | Task 6 |
| 9. Shell utility buttons on desktop | Task 6 |
| 10. Console body colour | Task 6 |
| Testing | Tasks 1, 3, 4, 5 assertions; browser checks in 2, 3, 4, 5, 6 |

**Note on Task 3, Step 7.** The spec called for the staff floor at depth 0.55. Rather than introduce a new depth branch, the plan adds `floor-staff` to the existing `flatFloor` set, which already renders at depth 0.6 — above the floor and below props, exactly the layer the spec asked for, using the mechanism the codebase already has.

**Note on verification.** Five of the ten items are visual and cannot be settled by assertions: Heath's facing, the staff-side shading, the basement tint, the bookcase and the shell changes. Each has an explicit browser-verification step naming what to look at. The assertions cover what is checkable — key mapping, route geometry, art resolution and room data.
