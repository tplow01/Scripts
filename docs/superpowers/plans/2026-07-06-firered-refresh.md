# FireRed Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** FireRed-quality NPC sprites (Heath/Teo/Thomas/Karl/Gomes), a high-end entrance facade + street scene, a true-to-logo floor emblem, Heath waiting at the till while the cart drawer is open, and sticky headers on the Inventory/Basement pages.

**Architecture:** All game art stays on the hand-authored ASCII `PixelArt` pipeline (`src/game/art/sprites.ts` → `registry.ts` → baked textures). Character art is replaced *behind existing keys*, so world data and scene code don't change. The street scene is decorative tiles drawn outside the room bounds in `loadRoom` (main room only). The till fix adds a `"cart"` event bridge mirroring the existing `"dialog"` bridge.

**Tech Stack:** Next.js 15 (App Router) + React 19 + TypeScript, Phaser 3, vitest, Tailwind. Dev server usually on `localhost:3003`. Headless browser for verification: `~/.claude/skills/gstack/browse/dist/browse`.

**Spec:** `docs/superpowers/specs/2026-07-06-firered-refresh-design.md`

## Global Constraints

- Characters/tiles authored at 16×16 native (`ART_NATIVE_SIZE = 16`); multi-tile art at 16 × tiles.
- All art uses the shared `PAL` palette in `sprites.ts`; new colours are ADDED to `PAL`, never inline.
- Every new texture key must be added to BOTH `TEXTURE_KEYS` and `bakeAllTextures` in `src/game/art/registry.ts`.
- Basement room art/dialogue/void untouched (stays pure `#1C1A22`).
- Scribbs player frames and the basement NPC untouched.
- No nameplates except Heath's (`speaker: "Heath"`, already wired).
- After every task: `npx tsc --noEmit` and `npx vitest run` must pass.
- The repo working tree already carries uncommitted session work — commit ONLY the files each task names.

---

### Task 1: Heath waits at the till while the cart drawer is open

**Files:**
- Modify: `app/page.tsx` (cart-state bridge)
- Modify: `src/game/scenes/WorldScene.ts` (`cartOpen` tracking, `waitForCartClose`, `playHeathCheckout`)

**Interfaces:**
- Consumes: `useCart().isOpen` (React state, `lib/cart.tsx`); existing `game.events` bridge.
- Produces: `"cart"` game event `(open: boolean)`; `WorldScene.waitForCartClose(): Promise<void>`. No other task depends on these.

- [ ] **Step 1: Bridge cart state into the game (app/page.tsx)**

In `app/page.tsx`, change the `useCart()` destructure (currently `const { openCart } = useCart();`) to:

```tsx
const { openCart, isOpen: cartIsOpen } = useCart();
```

Add this effect after the existing "Desktop keys while a Yes/No dialogue is open" effect (order doesn't matter, keep effects grouped):

```tsx
// Cart drawer state → game. Heath (WorldScene.playHeathCheckout) waits at the
// till until the drawer closes, like a real cashier mid-transaction.
useEffect(() => {
  gameRef.current?.events.emit("cart", cartIsOpen);
}, [cartIsOpen]);
```

And in `onGame`, directly after the existing `game.events.emit("dialog", false);` handshake line, add:

```tsx
game.events.emit("cart", false);
```

- [ ] **Step 2: Track cart state + wait helper (WorldScene.ts)**

Add a field next to `pendingDialogClose`:

```ts
/** True while the React cart drawer is open (the till is in use). */
private cartOpen = false;
/** One-shot hook a Heath sequence uses to wait for the cart drawer to close. */
private pendingCartClose: (() => void) | null = null;
```

In `create()`, after the `onDialog` listener block, add (and mirror the cleanup):

```ts
// Cart drawer open/closed — Heath's till sequence waits on this.
const onCart = (open: boolean) => {
  this.cartOpen = open;
  if (!open && this.pendingCartClose) {
    const done = this.pendingCartClose;
    this.pendingCartClose = null;
    done();
  }
};
this.game.events.on("cart", onCart);
```

In the `SHUTDOWN` handler add:

```ts
this.game.events.off("cart", onCart);
```

Add the wait helper next to `waitForDialogClose` (same re-arming fallback pattern):

```ts
/** Wait for the cart drawer to close; resolves immediately if it isn't open. */
private waitForCartClose(): Promise<void> {
  if (!this.cartOpen) return Promise.resolve();
  return new Promise<void>((resolve) => {
    this.pendingCartClose = resolve;
    const fallback = () => {
      if (this.pendingCartClose !== resolve) return; // already resolved
      if (this.cartOpen) {
        this.time.delayedCall(INTRO_FALLBACK_MS, fallback);
        return;
      }
      this.pendingCartClose = null;
      resolve();
    };
    this.time.delayedCall(INTRO_FALLBACK_MS, fallback);
  });
}
```

- [ ] **Step 3: Make playHeathCheckout wait out the till session**

In `playHeathCheckout`, between `await this.waitForDialogClose();` and the "Slide back" block, insert:

```ts
// Grace beat: a "Yes" opens the drawer a moment after the dialogue closes
// (React state → effect → event). Wait it out, then hold position while the
// till (cart drawer) is open. A "No" sails straight through.
await new Promise<void>((r) => this.time.delayedCall(300, () => r()));
await this.waitForCartClose();
```

- [ ] **Step 4: Typecheck + tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors; 21 tests pass.

- [ ] **Step 5: Browser verification**

With the dev server running (`npm run dev`, port from its output — usually 3003), using `B=~/.claude/skills/gstack/browse/dist/browse`:

```bash
$B goto http://localhost:3003 && sleep 3 && $B press Enter && sleep 6
$B press z && sleep 1.5 && $B press z && sleep 1.5 && $B press z && sleep 1.5 && $B press z && sleep 1  # close intro (4 presses: 3 pages + close; typewriter may absorb one)
# walk to counter row n: up 1, left 5
$B press ArrowUp && sleep 0.4
for i in 1 2 3 4 5; do $B press ArrowLeft; sleep 0.35; done
$B press z && sleep 2.5   # Heath slides to row n, asks "Are you ready to checkout?" (wait for typewriter)
$B press z && sleep 1     # Yes → drawer opens
$B screenshot /tmp/heath-holding.png --viewport   # EXPECT: cart drawer open, Heath still at row n (not home)
$B js "[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')==='Close cart'||b.closest('[class*=drawer]'))?.click(); 'tried'" 
# If that JS close doesn't work, inspect CartDrawer.tsx for the close button's aria-label and use it.
sleep 1.5 && $B screenshot /tmp/heath-back.png --viewport  # EXPECT: drawer closed, Heath back at (1,l)
```

Read both screenshots. Pass criteria: in the first, Heath's sprite is beside the player's row with the drawer open; in the second, he's back behind the register. Also verify the "No" path: re-interact, ArrowDown+z (No) → Heath slides back after ~300ms without the drawer.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx src/game/scenes/WorldScene.ts
git commit -m "feat: Heath holds the till until the cart drawer closes"
```

---

### Task 2: Palette additions + Heath's FireRed sprite (white beanie, MJ tee)

**Files:**
- Modify: `src/game/art/sprites.ts` (PAL additions + `cashierArt` replacement)

**Interfaces:**
- Consumes: `PAL`, `PixelArt` type, `OUT = "#14121A"`.
- Produces: new PAL chars used by ALL later art tasks — copy these exact entries: `"*"` skin highlight `#F5CBA3`, `"%"` light-brown hair `#8A5A34`, `"&"` light-brown hair shade `#6B4226`, `"~"` sandy-blond hair `#D8B36A`, `"^"` sandy-blond shade `#B08A45`, `"?"` gold `#D9A94A`, `"/"` gold shade `#A87B2C`, `"("` pink highlight `#FFB3DA`, `"<"` asphalt `#1B1822`, `">"` asphalt speckle `#262230`. Also: `cashierArt` stays the export name (registry untouched).

- [ ] **Step 1: Add the new palette entries**

In `sprites.ts`, at the end of the `PAL` object (after the `B: "#1A1A1A"` line), add:

```ts
  // ── FireRed character refresh (Heath/Teo/Thomas/Karl/Gomes) + exterior ──
  "*": "#F5CBA3", // skin highlight (3-tone skin: * highlight, S mid, n shade)
  "%": "#8A5A34", // light-brown hair (Heath's curls)
  "&": "#6B4226", // light-brown hair shade
  "~": "#D8B36A", // sandy-blond hair (Thomas)
  "^": "#B08A45", // sandy-blond shade
  "?": "#D9A94A", // gold (door handles, lamp)
  "/": "#A87B2C", // gold shade
  "(": "#FFB3DA", // pink highlight (logo 3-tone: ( highlight, P mid, p shade)
  "<": "#1B1822", // exterior asphalt
  ">": "#262230", // asphalt speckle / dither
```

- [ ] **Step 2: Replace `cashierArt` with Heath**

Replace the entire `cashierArt` definition (the `/** Cashier ... */` block) with:

```ts
/**
 * Heath (artKey "cashier") — the shop host at the till. White ribbed beanie
 * with light-brown curls peeking out, white MJ tee (tiny dark figure on the
 * chest), charcoal trousers. FireRed shading: 3-tone skin, 2-tone hair,
 * auto-outline. Faces down; flipped in world data to face the checkout.
 */
export const cashierArt: PixelArt = {
  palette: PAL,
  outline: OUT,
  rows: [
    "................",
    "....========....",
    "...==========...",
    "...=99999999=...",
    "...%%&SSSS&%%...",
    "...%*SOSSOS*%...",
    "....nSSSSSSn....",
    "....nnSSSSnn....",
    "...==========...",
    "..============..",
    "..====9KK9====..",
    "..====9KK9====..",
    "...333....333...",
    "...333....333...",
    "...BB......BB...",
    "................",
  ],
};
```

Reading guide (same for all sprites in this plan): rows 1–3 beanie (`=` white, `9` ribbed fold), row 4 curls (`%`/`&`) framing the forehead, rows 5–7 face (`*` highlight, `S` mid, `n` shade, `O` eyes), rows 8–11 tee (`=` white with `9` soft shade and a `K`-ink MJ-figure chest accent), rows 12–13 charcoal trousers (`3`), row 14 shoes (`B`).

- [ ] **Step 3: Typecheck + tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: pass (no key changes; art-only).

- [ ] **Step 4: Visual check**

Dev server running; `B=~/.claude/skills/gstack/browse/dist/browse`:

```bash
$B goto http://localhost:3003 && sleep 3 && $B press Enter && sleep 5
$B screenshot /tmp/heath-sprite.png --viewport
```

Read the screenshot: Heath walks the intro — beanie should read as a white cap with a fold line, hair visible at the temples, white tee, dark chest dot. Iterate on the grid until it reads cleanly at game zoom (small edits to rows are expected here — this is pixel art). Judge against the FireRed reference bar: 3-tone shading, crisp outline, no mush.

- [ ] **Step 5: Commit**

```bash
git add src/game/art/sprites.ts
git commit -m "feat: Heath FireRed sprite — white beanie, curls, MJ tee"
```

---

### Task 3: Shopper sprites — Teo, Thomas, Karl, Gomes

**Files:**
- Modify: `src/game/art/sprites.ts` (replace the `NPC_TEMPLATE`/`npcSprite` family)

**Interfaces:**
- Consumes: PAL chars from Task 2 (`*`, `~`, `^`, `%`, `&`).
- Produces: same export names (`npcRailArt`, `npcGazerArt`, `npcSitterArt`, `npcShopperArt`) — registry and world data untouched.

- [ ] **Step 1: Replace the template family with four individuals**

Delete `NPC_TEMPLATE`, `npcSprite`, and the four `npcSprite(...)` exports. Replace with four hand-authored sprites. Shared anatomy: rows 1–3 hair, rows 4–6 face (3-tone skin), row 7 neck/shoulders, rows 8–11 tee with chest accent, rows 12–13 legs, row 14 shoes.

```ts
/**
 * The shop-floor regulars, FireRed style. Likeness = hair + the SCR!PTS tee
 * each wears (base colour + a small chest accent — all designs are sold in
 * the shop). Internal names only; no nameplates.
 */

// Teo (artKey "npcRail") — messy black hair, LOVE tee (green, pink heart).
export const npcRailArt: PixelArt = {
  palette: PAL,
  outline: OUT,
  rows: [
    "................",
    "...HhHHhHHhH....",
    "..HHHHHHHHHHH...",
    "..HhHHHHHHHhH...",
    "...H*SSSSSS*....",
    "...HSOSSSOSS....",
    "....nSSSSSSn....",
    "....nnSSSSnn....",
    "...mmmmmmmmmm...",
    "..mmmmmmmmmmmm..",
    "..mmmk(PP(kmmm..",
    "..mmmmkPPkmmmm..",
    "...WWW....WWW...",
    "...WWWD..WWWD...",
    "...BBB....BBB...",
    "................",
  ],
};

// Thomas (artKey "npcGazer") — sandy curls, CONFUSION tee (white, pink ?).
export const npcGazerArt: PixelArt = {
  palette: PAL,
  outline: OUT,
  rows: [
    "................",
    "....~^~~~^~.....",
    "...~~~~~~~~~....",
    "...^~~~~~~~^....",
    "...~*SSSSSS*....",
    "...~SOSSSOSS....",
    "....nSSSSSSn....",
    "....nnSSSSnn....",
    "...==========...",
    "..============..",
    "..===9(PP(9===..",
    "..====9PP9====..",
    "...JJJ....JJJ...",
    "...JJJj..JJJj...",
    "...BBB....BBB...",
    "................",
  ],
};

// Karl (artKey "npcSitter") — dark hair, ARE YOU OKAY tee (black, pink cross).
// Same standing pose (he's placed on the couch cushions, reads as lounging).
export const npcSitterArt: PixelArt = {
  palette: PAL,
  outline: OUT,
  rows: [
    "................",
    "....HHHHHHHH....",
    "...HhHHHHHHhH...",
    "...HHHHHHHHHH...",
    "...H*SSSSSS*....",
    "...HSOSSSOSS....",
    "....nSSSSSSn....",
    "....nnSSSSnn....",
    "...3333333333...",
    "..333333333333..",
    "..334(PPPP(433..",
    "..3334(PP(4333..",
    "...WWW....WWW...",
    "...WWWD..WWWD...",
    "...BBB....BBB...",
    "................",
  ],
};

// Gomes (artKey "npcShopper") — black spiky hair, RAGE tee (white, pink/blue).
export const npcShopperArt: PixelArt = {
  palette: PAL,
  outline: OUT,
  rows: [
    "................",
    "...H.HH.HH.H....",
    "...HHhHHhHHH....",
    "..HHHHHHHHHHH...",
    "...H*SSSSSS*....",
    "...HSOSSSOSS....",
    "....nSSSSSSn....",
    "....nnSSSSnn....",
    "...==========...",
    "..============..",
    "..==9(JPPJ(9==..",
    "..===9(PP(9===..",
    "...WWW....WWW...",
    "...WWWD..WWWD...",
    "...BBB....BBB...",
    "................",
  ],
};
```

- [ ] **Step 2: Typecheck + tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: pass. (`npcArt` — the generic basement shopper — still exists untouched above this block; don't remove it.)

- [ ] **Step 3: Visual check**

```bash
$B goto http://localhost:3003 && sleep 3 && $B press Enter && sleep 5
# close intro, then walk the floor to see each NPC; screenshot each encounter
$B press z && sleep 1.5 && $B press z && sleep 1.5 && $B press z && sleep 1.5 && $B press z && sleep 1
for i in 1 2 3 4 5 6; do $B press ArrowUp; sleep 0.35; done
$B screenshot /tmp/npcs-floor.png --viewport
```

Read it. Check: four visually distinct people (hair silhouettes differ: messy vs curls vs neat vs spiky), tees read as white/green/black bases with pink chest accents, no orphan pixels. Iterate rows as needed.

- [ ] **Step 4: Commit**

```bash
git add src/game/art/sprites.ts
git commit -m "feat: FireRed shopper sprites — Teo, Thomas, Karl, Gomes in SCR!PTS tees"
```

---

### Task 4: Floor emblem — true logo lockup

**Files:**
- Modify: `src/game/art/sprites.ts` (`buildEmblem`)

**Interfaces:**
- Consumes: PAL `(` pink highlight (Task 2), existing `P`/`p`/`K`.
- Produces: same `emblemArt` export, same 80×80 canvas / 3×3-tile footprint.

- [ ] **Step 1: Rewrite `buildEmblem()`**

Replace the function body with (keep the signature and export):

```ts
/**
 * SCR!PTS floor logo — the real brand lockup as a pixel inlay (80×80):
 * pink comet (big 4-point star upper-right, tapering streak down-left to a
 * small star) ABOVE the `scr!pts` wordmark. 3-tone pink for the logo's 3D
 * look: `(` highlight (upper-left of forms), `P` mid, `p` shade.
 */
function buildEmblem(): string[] {
  const N = 80;
  const g: string[][] = Array.from({ length: N }, () => Array(N).fill("."));

  // ── Comet: big star upper-right → small star lower-left of the top half.
  const bx = 62, by = 12, sx = 16, sy = 40;
  const star = (cx: number, cy: number, r: number) => {
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const dx = x - cx, dy = y - cy;
        const spike = (Math.abs(dx) <= 1 && Math.abs(dy) <= r * 1.6) ||
          (Math.abs(dy) <= 1 && Math.abs(dx) <= r * 1.6);
        const body = Math.abs(dx) + Math.abs(dy) <= r;
        if (body || spike) {
          // 3-tone: highlight toward top-left, shade toward bottom-right.
          g[y][x] = dx + dy < -Math.floor(r / 2) ? "(" : dx + dy > Math.floor(r / 2) ? "p" : "P";
        }
      }
  };
  // Tapering streak, thick at the big star.
  const len = Math.hypot(bx - sx, by - sy);
  for (let t = 0; t <= 1; t += 1 / (len * 2)) {
    const cx = bx + (sx - bx) * t;
    const cy = by + (sy - by) * t;
    const th = 4.5 * (1 - t) + 0.5;
    for (let y = -6; y <= 6; y++)
      for (let x = -6; x <= 6; x++) {
        const d = Math.hypot(x, y);
        if (d <= th) {
          const px = Math.round(cx + x), py = Math.round(cy + y);
          if (px >= 0 && px < N && py >= 0 && py < N) {
            g[py][px] = d > th - 1.2 ? "p" : y < -th / 3 ? "(" : "P";
          }
        }
      }
  }
  star(sx, sy, 4);
  star(bx, by, 9);

  // ── Wordmark `scr!pts` — bolder 8w×11h glyphs (2px strokes) so it holds at
  // floor scale. `!` is the brand 4-point star.
  const X = "K";
  const G: Record<string, string[]> = {
    s: ["..#####.", ".##...##", ".##.....", "..#####.", ".....##.", ".##...##", "..#####.", "........", "........", "........", "........"],
    c: ["..#####.", ".##...##", ".##.....", ".##.....", ".##.....", ".##...##", "..#####.", "........", "........", "........", "........"],
    r: [".##.###.", ".###..##", ".##.....", ".##.....", ".##.....", ".##.....", ".##.....", "........", "........", "........", "........"],
    "!": ["...##...", "..####..", ".######.", "###..###", ".######.", "..####..", "...##...", "........", "........", "........", "........"],
    p: [".######.", ".##...##", ".##...##", ".######.", ".##.....", ".##.....", ".##.....", "........", "........", "........", "........"],
    t: ["...##...", "...##...", ".######.", "...##...", "...##...", "...##.##", "....###.", "........", "........", "........", "........"],
  };
  const word = ["s", "c", "r", "!", "p", "t", "s"];
  let cx = 6;
  const y0 = 56;
  for (const ch of word) {
    const glyph = G[ch];
    for (let gy = 0; gy < glyph.length; gy++)
      for (let gx = 0; gx < glyph[gy].length; gx++)
        if (glyph[gy][gx] === "#" && y0 + gy < N && cx + gx < N) g[y0 + gy][cx + gx] = X;
    cx += glyph[0].length + 2;
  }

  return g.map((r) => r.join(""));
}
```

- [ ] **Step 2: Typecheck + tests**

Run: `npx tsc --noEmit && npx vitest run` — expected pass.

- [ ] **Step 3: Visual check**

```bash
$B goto http://localhost:3003 && sleep 3 && $B press Enter && sleep 5
$B press z && sleep 1.5 && $B press z && sleep 1.5 && $B press z && sleep 1.5 && $B press z && sleep 1
for i in 1 2 3; do $B press ArrowUp; sleep 0.35; done
$B screenshot /tmp/emblem.png --viewport
```

Read it: the emblem (floor, cols 7–9 × rows j–l) should show the comet arcing over a legible bold `scr!pts` with visible pink highlight/shade — compare against `~/Downloads/full logo transparent 2.PNG`. Adjust star radii / `y0` / `cx` spacing to fit the 80px canvas without clipping (wordmark total width: 7 glyphs × 8 + 6 × 2 = 68px, starts at x=6 → ends at 74 ✓).

- [ ] **Step 4: Commit**

```bash
git add src/game/art/sprites.ts
git commit -m "feat: floor emblem rebuilt to the true scr!pts logo lockup"
```

---

### Task 5: High-end entrance facade

**Files:**
- Modify: `src/game/art/sprites.ts` (`buildDoors` replacement + new `displayWindowArt`, mat glow)
- Modify: `src/game/art/registry.ts` (new key `display-window`)
- Modify: `src/game/world/mainRoom.ts` (facade decorations)
- Test: `__tests__/registry.test.ts`

**Interfaces:**
- Consumes: PAL `?`//`/` gold (Task 2), existing glass `I`/`Y`, ink `@`, paper `=`, mannequin idiom from `mannequinArt`.
- Produces: texture key `"display-window"` (32×16, 2×1 tiles); replaced `doors` art (48×16 with integrated fascia sign). Design deviation from spec, agreed here: the fascia sign is drawn INTO the doors art (no separate `sign` key — a 3-tile-wide art has exactly enough width for the wordmark), and the planters reuse the existing `tree` key (it's already sculpted-topiary styled).

- [ ] **Step 1: Failing test for the new registry key**

In `__tests__/registry.test.ts`, find the test that checks resolvable keys (it asserts `resolveTextureKey` behaviour) and add a case:

```ts
it("resolves the entrance display window", () => {
  expect(resolveTextureKey("display-window")).toBe("display-window");
});
```

Run: `npx vitest run __tests__/registry.test.ts`
Expected: FAIL with `Unknown art key: "display-window"`.

- [ ] **Step 2: Replace `buildDoors()` — luxury glass + fascia**

Replace the `buildDoors` function and keep the `doorsArt` export line:

```ts
/**
 * Entrance (3×1 = 48×16): luxury storefront doors with an integrated fascia.
 * Top 5px: ink fascia band with the wordmark dotted in paper. Below: full-
 * height glass double doors — slim ink frames, warm interior glow at the
 * bottom of the glass, gold handle pixels at the centre mullion.
 */
function buildDoors(): string[] {
  const W = 48, H = 16, MULL = 24;
  const rows: string[] = [];
  // Tiny 3×5 wordmark letters for the fascia (paper on ink), "scr!pts".
  const FASCIA = [
    "................................................",
    ".=== == ==..=..== === ===.......................",
    ".=...=..=.=.=..=.=..=..=........................",
    ".===.=..==..=..==.=..=..........................",
    "...=.=..=.=.=..=..=..=..........................",
  ];
  for (let y = 0; y < H; y++) {
    let row = "";
    for (let x = 0; x < W; x++) {
      if (y < 5) {
        // Fascia: ink band, wordmark dots from the FASCIA map (centred-ish).
        row += FASCIA[y]?.[x] === "=" ? "=" : "@";
        continue;
      }
      const frame = x <= 1 || x >= W - 2 || y === 5; // jambs + head under fascia
      const mullion = x === MULL - 1 || x === MULL;
      const handle = (x === MULL - 3 || x === MULL + 2) && y >= 8 && y <= 11;
      const glow = y >= 12 && !frame && !mullion; // warm interior light
      if (frame || mullion) row += "@";
      else if (handle) row += "?";
      else if (glow) row += "o";
      else row += "I"; // glass
    }
    rows.push(row);
  }
  return rows;
}
```

(The FASCIA letter map is a starting point — refine the 3×5 letterforms during the visual check so "scripts" reads; at 48px wide only a stylised mark is possible. If it reads as noise, fall back to a clean paper rule line + centred 4-point star `P` instead — implementer's call, judged on the screenshot.)

- [ ] **Step 3: Add `displayWindowArt` (2×1 tiles, mannequin in glass)**

After `doorsArt`, add:

```ts
/**
 * Display window (2×1 = 32×16): fascia-topped glass vitrine with a tee'd
 * mannequin and a warm spotlight pool. Placed flanking the entrance doors;
 * the second placement is flipped for variety.
 */
export const displayWindowArt: PixelArt = {
  palette: PAL,
  outline: "#0D0D0D",
  rows: [
    "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@",
    "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@",
    "@IIIIIIIIIIIIIIIIIIIIIIIIIIIII@",
    "@IIIIIII===IIIIIIIIImmmIIIIIII@",
    "@IIIIII=====IIIIIIImmmmmIIIIII@",
    "@IIIIII==P==IIIIIIImmPmmIIIIII@",
    "@IIIIII=====IIIIIIImmmmmIIIIII@",
    "@IIIIIII===IIIIIIIImmmIIIIIIII@",
    "@IIIIIII=I=IIIIIIIIm.mIIIIIIII@",
    "@IIIIIIIYIYIIIIIIIIYmYIIIIIII@@",
    "@IIIIIIIIIIIIIIIIIIIIIIIIIIII@@",
    "@IIooooIIIIIIIIIIIIIIooooIIII@@",
    "@IooooooIIIIIIIIIIIIooooooIII@@",
    "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@",
    "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@",
    "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@",
  ],
};
```

(Note: every row must be exactly 32 chars — verify with a quick count; adjust the two mannequin silhouettes — one white tee `=`, one green `m`, each with a pink `P` chest dot — and `o` spotlight pools during the visual check.)

- [ ] **Step 4: Register the key**

In `registry.ts`: import `displayWindowArt` in the import block, add `"display-window"` to `TEXTURE_KEYS`, and add to `bakeAllTextures`:

```ts
bakePixelArt(scene, "display-window", displayWindowArt);
```

Run: `npx vitest run __tests__/registry.test.ts` — expected: PASS.

- [ ] **Step 5: Warm the mat**

In `buildMat` (sprites.ts), change the field char so the mat glows warm against the pale floor — replace `else ch = "o";` with:

```ts
else ch = (x + y) % 7 === 0 ? "L" : "o"; // warm flecks in the cream field
```

- [ ] **Step 6: Place the facade in mainRoom**

In `mainRoom.ts` decorations, replace the entrance block (the two lines placing `doors` and `mat`) with:

```ts
    // ── Entrance facade (all on the bottom border wall row, non-walkable) ──
    // Luxury glass doors + integrated fascia sign (cols 7–9).
    { tileX: C(7), tileY: HEIGHT - 1, artKey: "doors", wTiles: 3 },
    // Display windows flanking the doors: tee'd mannequins in glass.
    { tileX: C(5), tileY: HEIGHT - 1, artKey: "display-window", wTiles: 2 },
    { tileX: C(10), tileY: HEIGHT - 1, artKey: "display-window", wTiles: 2, flip: true },
    // Sculpted topiary bookending the storefront.
    { tileX: C(4), tileY: HEIGHT - 1, artKey: "tree" },
    { tileX: C(12), tileY: HEIGHT - 1, artKey: "tree" },
    // Doormat just inside (walkable, warm-flecked).
    { tileX: C(7), tileY: R("o"), artKey: "mat", wTiles: 3 },
```

- [ ] **Step 7: Typecheck + full tests**

Run: `npx tsc --noEmit && npx vitest run` — expected: all pass (22 tests now).

- [ ] **Step 8: Visual check**

```bash
$B goto http://localhost:3003 && sleep 3 && $B press Enter && sleep 5 && $B screenshot /tmp/facade.png --viewport
```

Read it (camera starts at the entrance): doors with ink fascia + gold handles, a lit vitrine each side with a mannequin, topiary bookends, warm mat. Iterate art until it reads "high-end storefront" at game zoom. Wall-row decorations render via `placeProp` — check nothing z-fights with the wall tiles (decorations draw above tiles; `doors`/`window` family are in the `onWall` depth set in `WorldScene.loadRoom` — add `"display-window"` to that `onWall` set in `WorldScene.ts` so windows sit at wall depth: `const onWall = new Set(["poster", "window", "doors", "display-window"]);`).

- [ ] **Step 9: Commit**

```bash
git add src/game/art/sprites.ts src/game/art/registry.ts src/game/world/mainRoom.ts src/game/scenes/WorldScene.ts __tests__/registry.test.ts
git commit -m "feat: high-end entrance facade — fascia doors, display windows, topiary, warm mat"
```

---

### Task 6: Street scene + textured void (main room only)

**Files:**
- Modify: `src/game/art/sprites.ts` (exterior tile builders)
- Modify: `src/game/art/registry.ts` (keys `ext-pavement`, `ext-kerb`, `ext-asphalt`, `ext-lamp`)
- Modify: `src/game/scenes/WorldScene.ts` (exterior apron in `loadRoom`, per-room camera bg)
- Test: `__tests__/registry.test.ts`

**Interfaces:**
- Consumes: PAL `<`/`>` asphalt (Task 2), pavement greys `9`/`0`/`a`, gold `?`, warm `L`.
- Produces: the four `ext-*` texture keys; no other task depends on this.

- [ ] **Step 1: Failing test for the exterior keys**

Add to `__tests__/registry.test.ts`:

```ts
it("resolves the exterior street tiles", () => {
  for (const k of ["ext-pavement", "ext-kerb", "ext-asphalt", "ext-lamp"]) {
    expect(resolveTextureKey(k)).toBe(k);
  }
});
```

Run: `npx vitest run __tests__/registry.test.ts` — expected: FAIL (`Unknown art key: "ext-pavement"`).

- [ ] **Step 2: Author the exterior tiles (sprites.ts)**

Add near the other builders:

```ts
/**
 * Exterior street tiles (main-room void treatment). Pavement = light slabs
 * with joint lines; kerb = pavement with an edge stone along the bottom;
 * asphalt = near-black with a sparse dither so the void reads as ground.
 */
function buildExtPavement(): string[] {
  const rows: string[] = [];
  for (let y = 0; y < TILE; y++) {
    let row = "";
    for (let x = 0; x < TILE; x++) {
      const joint = y === 0 || x === 0 || x === 8; // slab joints (half-tile slabs)
      const speckle = (x * 7 + y * 3) % 23 === 0;
      row += joint ? "0" : speckle ? "a" : "9";
    }
    rows.push(row);
  }
  return rows;
}

function buildExtKerb(): string[] {
  const rows = buildExtPavement();
  // Kerb stone along the bottom 4px: lit top edge + grey face + dark lip.
  for (let y = TILE - 4; y < TILE; y++) {
    rows[y] = (y === TILE - 4 ? "2" : y === TILE - 1 ? "K" : "+").repeat(TILE);
  }
  return rows;
}

function buildExtAsphalt(): string[] {
  const rows: string[] = [];
  for (let y = 0; y < TILE; y++) {
    let row = "";
    for (let x = 0; x < TILE; x++) {
      row += (x * 5 + y * 11) % 29 === 0 ? ">" : "<"; // sparse dither
    }
    rows.push(row);
  }
  return rows;
}

export const extPavementArt: PixelArt = { rows: buildExtPavement(), palette: PAL };
export const extKerbArt: PixelArt = { rows: buildExtKerb(), palette: PAL };
export const extAsphaltArt: PixelArt = { rows: buildExtAsphalt(), palette: PAL };

/** Streetlamp (1×2 tiles = 16×32): slim post, gold head, warm light pool. */
export const extLampArt: PixelArt = {
  palette: PAL,
  outline: OUT,
  rows: [
    "................",
    "......????......",
    ".....?LLLL?.....",
    ".....?LLLL?.....",
    "......????......",
    ".......GG.......",
    ".......GG.......",
    ".......GG.......",
    ".......GG.......",
    ".......GG.......",
    ".......GG.......",
    ".......GG.......",
    ".......GG.......",
    ".......GG.......",
    ".......GG.......",
    ".......GG.......",
    ".......GG.......",
    ".......GG.......",
    ".......GG.......",
    ".......GG.......",
    ".......GG.......",
    ".......GG.......",
    ".......GG.......",
    ".......GG.......",
    ".......GG.......",
    "......GGGG......",
    ".....GGGGGG.....",
    "....LLLLLLLL....",
    "...LLLLLLLLLL...",
    "....LLLLLLLL....",
    ".....LLLLLL.....",
    "................",
  ],
};
```

- [ ] **Step 3: Register the keys**

registry.ts: import `extPavementArt, extKerbArt, extAsphaltArt, extLampArt`; add `"ext-pavement", "ext-kerb", "ext-asphalt", "ext-lamp"` to `TEXTURE_KEYS`; add bakes:

```ts
bakePixelArt(scene, "ext-pavement", extPavementArt);
bakePixelArt(scene, "ext-kerb", extKerbArt);
bakePixelArt(scene, "ext-asphalt", extAsphaltArt);
bakePixelArt(scene, "ext-lamp", extLampArt);
```

Run: `npx vitest run __tests__/registry.test.ts` — expected: PASS.

- [ ] **Step 4: Draw the apron in `loadRoom` (WorldScene.ts)**

In `loadRoom`, immediately BEFORE the floor/walls loop, add:

```ts
// ── Exterior treatment (main room only): the void beyond the walls reads
// as city ground, not dead space. Top/left/right: dithered asphalt apron.
// Below the entrance: sidewalk (pavement + kerb) then asphalt road, with a
// streetlamp by the doors. All decorative — outside bounds, never walkable.
const APRON = 4;
if (roomId === "main") {
  this.cameras.main.setBackgroundColor("#1B1822"); // matches ext-asphalt
  for (let y = -APRON; y < this.room.height + APRON; y++) {
    for (let x = -APRON; x < this.room.width + APRON; x++) {
      const inside = x >= 0 && x < this.room.width && y >= 0 && y < this.room.height;
      if (inside) continue;
      let key = "ext-asphalt";
      if (y >= this.room.height) {
        // Street in front of the shop: 2 sidewalk rows, kerb, then road.
        const d = y - this.room.height;
        key = d === 0 ? "ext-pavement" : d === 1 ? "ext-kerb" : "ext-asphalt";
      }
      this.placeTile(resolveTextureKey(key), x, y, -0.5);
    }
  }
  // Streetlamp on the sidewalk beside the doors (cols 7–9 are the doors).
  const ts = this.room.tileSize;
  const lamp = this.add
    .image(11 * ts + ts / 2, this.room.height * ts + ts, resolveTextureKey("ext-lamp"))
    .setDisplaySize(ts, ts * 2)
    .setDepth(-0.4);
  this.roomObjects.push(lamp);
} else {
  this.cameras.main.setBackgroundColor("#1C1A22"); // basement: untouched void
}
```

Also DELETE the `this.cameras.main.setBackgroundColor("#1C1A22");` line from `create()` (the per-room branch now owns it).

- [ ] **Step 5: Typecheck + tests**

Run: `npx tsc --noEmit && npx vitest run` — expected: all pass (23 tests).

- [ ] **Step 6: Visual check**

```bash
$B goto http://localhost:3003 && sleep 3 && $B press Enter && sleep 5 && $B screenshot /tmp/street.png --viewport
```

Read it: below the entrance wall — sidewalk slabs, kerb line, dark road, lamp with a warm pool; top-right cutout area now dithered asphalt instead of flat void. Then walk to the vinyl deck, play it, descend to the basement, screenshot: basement void must still be pure dark (no apron). Return upstairs, confirm apron redraws (loadRoom runs per room swap — `roomObjects` cleanup handles teardown).

- [ ] **Step 7: Commit**

```bash
git add src/game/art/sprites.ts src/game/art/registry.ts src/game/scenes/WorldScene.ts __tests__/registry.test.ts
git commit -m "feat: street scene + textured void around the shop (main room only)"
```

---

### Task 7: Sticky headers — Inventory + Basement pages

**Files:**
- Modify: `components/NavBar.tsx:18`
- Modify: `components/BasementNavBar.tsx:12`

**Interfaces:** none (pure CSS classes).

- [ ] **Step 1: NavBar sticky**

In `components/NavBar.tsx`, change the header element's className from:

```tsx
<header className="relative flex items-center px-4 md:px-16 lg:px-[200px] pt-6 md:pt-10 lg:pt-[64px] pb-4 md:pb-8 lg:pb-[48px]">
```

to:

```tsx
<header className="sticky top-0 z-50 bg-white flex items-center px-4 md:px-16 lg:px-[200px] pt-6 md:pt-10 lg:pt-[64px] pb-4 md:pb-8 lg:pb-[48px]">
```

(`relative` → `sticky top-0`; keep `relative` positioning context implicitly — sticky elements are positioned, so the absolutely-centred title still anchors to the header. Solid `bg-white` so the grid doesn't show through.)

- [ ] **Step 2: BasementNavBar sticky**

Same change in `components/BasementNavBar.tsx:12`, with the basement's background:

`relative` → `sticky top-0 z-50 bg-[#0d0d0d]`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit` — expected: clean.

- [ ] **Step 4: Browser verification**

```bash
$B goto http://localhost:3003/inventory && sleep 2
$B js "window.scrollTo(0, 800); 'scrolled'" && sleep 0.5
$B screenshot /tmp/inv-sticky.png --viewport
$B goto http://localhost:3003/basement && sleep 2
$B js "window.scrollTo(0, 800); 'scrolled'" && sleep 0.5
$B screenshot /tmp/base-sticky.png --viewport
```

Read both: back arrow + title + bag pinned at the top over the scrolled grid, solid background, cart badge intact. Check the title link doesn't overlap the icons at mobile width too: `$B viewport 390x844` and repeat, then `$B viewport 1280x720` to restore.

- [ ] **Step 5: Commit**

```bash
git add components/NavBar.tsx components/BasementNavBar.tsx
git commit -m "feat: sticky back/title/cart headers on inventory + basement pages"
```

---

### Task 8: Full verification playthrough

**Files:** none (verification only; fix regressions in place).

- [ ] **Step 1: Suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean, 23 tests.

- [ ] **Step 2: Fresh full playthrough (desktop viewport)**

With `B=~/.claude/skills/gstack/browse/dist/browse`, fresh `goto` → Enter → screenshot the intro (Heath's new sprite + facade + street visible at the entrance) → close intro → walk the floor (screenshot each NPC + the emblem) → counter → Yes → drawer open, screenshot (Heath holding) → close drawer, screenshot (Heath home) → counter → No (Heath returns straight away) → vinyl → basement (void still black, NPC prompt unchanged) → return. Read every screenshot; judge against the FireRed reference bar.

- [ ] **Step 3: Mobile spot-check**

`$B viewport 390x844`, reload, start via the on-screen A button (dispatch `pointerdown` with `pointerId:1` on the A span's parent), confirm the intro text says "press A" and the new sprites render. Restore viewport after.

- [ ] **Step 4: Update the outstanding-work doc**

In `docs/needed-from-thomas.md`, mark done: the sprite refresh, emblem, entrance/street ("Done this session" section), and remove the Heath side-view/walk-frame items ONLY if superseded (they are not — keep them listed; the new Heath art is still front-facing single-frame).

- [ ] **Step 5: Commit**

```bash
git add docs/needed-from-thomas.md
git commit -m "docs: update outstanding-assets list after FireRed refresh"
```
