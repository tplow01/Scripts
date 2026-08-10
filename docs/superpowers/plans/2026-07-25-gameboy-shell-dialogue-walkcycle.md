# Game Boy Shell + Dialogue Pass + 3-Frame Walk Cycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Responsive Game Boy shell (portrait / landscape / desktop) with molded utility buttons and in-LCD overlays; the approved dialogue + world changes; Scribbs' new 12-frame (4 directions × 3 frames) walk cycle.

**Architecture:** The shell splits into shared molded-control components picked by a `useShellLayout` orientation hook. Dialogue is data edits in `app/page.tsx`'s PROMPTS table. The walk cycle replaces the 2-frame flip-mirrored sprites with 12 authored frames and a left→both→right→both step loop in `WorldScene`.

**Tech Stack:** Next.js 15, React 19, TypeScript, Phaser 3, Tailwind (inline styles dominate components), Vitest. Asset processing: Python 3 + Pillow in a venv.

**Spec:** `docs/superpowers/specs/2026-07-25-gameboy-shell-responsive-and-dialogue-design.md`

## Global Constraints

- Brand tokens only: ink `#0D0D0D`, paper `#F7F7F5`, pinks `#FF4FA3`/`#FF8AC7`/`#FFB9DC`, LCD grey `#DCDCDA`, body gradient `#D4D4C8→#8C8C84` (existing `BODY` const). Font: Press Start 2P via `next/font/google`.
- Dev server: `PORT=3123 npm run dev` (assume already running; restart only if needed).
- Verify with gstack browse binary `$B=~/.claude/skills/gstack/browse/dist/browse` — screenshots must be Read after capture.
- `npx tsc --noEmit` must pass at every commit. `npm test` must pass at every commit.
- Never edit `PRD.md`/`BRAND.md` (no product/brand direction changes here).
- Working tree already has uncommitted sprite/scene changes (`scribbs-*.png`, `registry.ts`, `BootScene.ts`, `WorldScene.ts`) — Task 1 supersedes and commits over them; do not try to preserve them.

---

### Task 1: Import the 12 Scribbs frames

**Files:**
- Create: `scripts/import-scribbs.py`
- Create: `public/assets/scribbs/scribbs-{down,up,left,right}-{left,both,right}.png` (12 files)
- Delete: `public/assets/scribbs/scribbs-{down,up,side}-{a,b}.png` (6 files)

**Interfaces:**
- Produces: 64×64 PNGs named `scribbs-<dir>-<foot>.png`, dir ∈ down/up/left/right, foot ∈ left/both/right, bottom-aligned on a shared baseline. Task 2 loads exactly these names.

Source frames: `~/Documents/scribbs_*.png`, 6667×6667, character in the upper-left area. Filename mapping (VERIFY VISUALLY in step 3 — "Side" is assumed left-facing):

| Source | Output |
|---|---|
| `scribbs_Front_2_Feet.png` | `scribbs-down-both.png` |
| `scribbs_Front-Left-Foot.png` | `scribbs-down-left.png` |
| `scribbs_Front_Right_Foot.png` | `scribbs-down-right.png` |
| `scribbs_Back_2_Feet.png` | `scribbs-up-both.png` |
| `scribbs_Back_left_Foot.png` | `scribbs-up-left.png` |
| `scribbs_Back-Right-Foot.png` | `scribbs-up-right.png` |
| `scribbs_Left_2_Feet.png` | `scribbs-left-both.png` |
| `scribbs_Side_Left_Foot.png` | `scribbs-left-left.png` |
| `scribbs_Side_Right_Foot.png` | `scribbs-left-right.png` |
| `scribbs_Right_2_Feet.png` | `scribbs-right-both.png` |
| `scribbs_Right_Left_Foot.png` | `scribbs-right-left.png` |
| `scribbs_Right_Right_foot.png` | `scribbs-right-right.png` |

- [ ] **Step 1: Write the import script**

```python
#!/usr/bin/env python3
"""Import hand-authored Scribbs frames into game-ready 64px sprites.

All 12 sources share one canvas scale, so a UNION bounding box across every
frame preserves frame-to-frame alignment (feet stay on the same baseline).
Each frame is cropped to that union box, then nearest-neighbour scaled to fit
a 64x64 canvas, anchored bottom-centre.
"""
from pathlib import Path
from PIL import Image

SRC = Path.home() / "Documents"
OUT = Path(__file__).resolve().parent.parent / "public" / "assets" / "scribbs"

MAPPING = {
    "scribbs_Front_2_Feet.png": "scribbs-down-both.png",
    "scribbs_Front-Left-Foot.png": "scribbs-down-left.png",
    "scribbs_Front_Right_Foot.png": "scribbs-down-right.png",
    "scribbs_Back_2_Feet.png": "scribbs-up-both.png",
    "scribbs_Back_left_Foot.png": "scribbs-up-left.png",
    "scribbs_Back-Right-Foot.png": "scribbs-up-right.png",
    "scribbs_Left_2_Feet.png": "scribbs-left-both.png",
    "scribbs_Side_Left_Foot.png": "scribbs-left-left.png",
    "scribbs_Side_Right_Foot.png": "scribbs-left-right.png",
    "scribbs_Right_2_Feet.png": "scribbs-right-both.png",
    "scribbs_Right_Left_Foot.png": "scribbs-right-left.png",
    "scribbs_Right_Right_foot.png": "scribbs-right-right.png",
}

CANVAS = 64

def content_bbox(img: Image.Image):
    """Bounding box of non-transparent, non-white pixels."""
    rgba = img.convert("RGBA")
    # White background sources: treat near-white as empty too.
    datas = rgba.getdata()
    mask = Image.new("L", rgba.size, 0)
    mask.putdata([255 if a > 8 and not (r > 246 and g > 246 and b > 246) else 0
                  for (r, g, b, a) in datas])
    return mask.getbbox()

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    frames = {src: Image.open(SRC / src) for src in MAPPING}
    boxes = [content_bbox(im) for im in frames.values()]
    left = min(b[0] for b in boxes); top = min(b[1] for b in boxes)
    right = max(b[2] for b in boxes); bottom = max(b[3] for b in boxes)
    w, h = right - left, bottom - top
    scale = CANVAS / max(w, h)
    for src, out in MAPPING.items():
        im = frames[src].convert("RGBA").crop((left, top, right, bottom))
        nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
        im = im.resize((nw, nh), Image.NEAREST)
        canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
        canvas.paste(im, ((CANVAS - nw) // 2, CANVAS - nh))  # bottom-centre
        canvas.save(OUT / out)
        print(f"{src} -> {out} ({nw}x{nh})")

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run it**

```bash
cd /Users/tplow/Documents/Scripts
python3 -m venv /private/tmp/claude-501/-Users-tplow/3cd6596f-a233-40f8-b3d1-283257239642/scratchpad/venv 2>/dev/null || true
/private/tmp/claude-501/-Users-tplow/3cd6596f-a233-40f8-b3d1-283257239642/scratchpad/venv/bin/pip -q install pillow
/private/tmp/claude-501/-Users-tplow/3cd6596f-a233-40f8-b3d1-283257239642/scratchpad/venv/bin/python scripts/import-scribbs.py
```

Expected: 12 lines of `src -> out (WxH)` output, all 12 files present in `public/assets/scribbs/`.

- [ ] **Step 3: Visually verify direction mapping**

Read each of the 12 output PNGs with the Read tool. Confirm: `down-*` faces the viewer, `up-*` shows the back of the head, `left-*` faces left, `right-*` faces right, and each `-left`/`-right` frame has the matching foot forward. If "Side" frames face RIGHT (not left), swap the Side↔Right rows in `MAPPING` and re-run. Also confirm feet sit on the same bottom row across each direction's 3 frames.

- [ ] **Step 4: Delete the old frames and commit**

```bash
git rm -q public/assets/scribbs/scribbs-down-a.png public/assets/scribbs/scribbs-down-b.png \
  public/assets/scribbs/scribbs-up-a.png public/assets/scribbs/scribbs-up-b.png \
  public/assets/scribbs/scribbs-side-a.png public/assets/scribbs/scribbs-side-b.png
git add scripts/import-scribbs.py public/assets/scribbs/
git commit -m "feat(art): import 12-frame Scribbs walk sprites (4 dirs x 3 frames)"
```

Note: `BootScene.ts` still references the deleted files until Task 2 — do not run the game between these two tasks.

---

### Task 2: 3-frame walk cycle in the engine

**Files:**
- Modify: `src/game/scenes/BootScene.ts:24-30`
- Modify: `src/game/scenes/WorldScene.ts` (Facing type, dirFor, setFrame, tryMove, create/resume, saveSession)
- Modify: `lib/gameSession.ts` (facing type)

**Interfaces:**
- Consumes: Task 1's `scribbs-<dir>-<foot>.png` texture names.
- Produces: `Facing = "down" | "up" | "left" | "right"`; `setFrame(foot: "left" | "both" | "right")`. `gameSession.pos.facing` uses the new Facing union and drops `flip`.

- [ ] **Step 1: Load the 12 frames in BootScene**

Replace the direction loop in `BootScene.preload()`:

```ts
    // Scribbs walk-cycle art: 4 directions x 3 authored frames (left foot /
    // both feet / right foot), 64px PNGs. Left and right are distinct art —
    // no flip-mirroring.
    const directions = ["down", "up", "left", "right"] as const;
    const feet = ["left", "both", "right"] as const;
    for (const dir of directions) {
      for (const foot of feet) {
        this.load.image(`scribbs-${dir}-${foot}`, `/assets/scribbs/scribbs-${dir}-${foot}.png`);
      }
    }
```

Update the comment block above it (drop the "a/b … c/d reuse" sentence).

- [ ] **Step 2: Rework WorldScene facing + frames**

In `src/game/scenes/WorldScene.ts`:

1. `type Facing = "down" | "up" | "left" | "right";` (line 10)
2. Add a step-parity field near `facing`:

```ts
  private facing: Facing = "down";
  /** Alternates which foot leads each step: false → right foot, true → left. */
  private stepParity = false;
```

3. Initial texture (line 80): `this.add.image(0, 0, "scribbs-down-both")`
4. `dirFor` — distinct facings, no flip:

```ts
  private dirFor(code: string): { dx: number; dy: number; facing: Facing } | null {
    switch (code) {
      case "ArrowLeft":
      case "KeyA":
        return { dx: -1, dy: 0, facing: "left" };
      case "ArrowRight":
      case "KeyD":
        return { dx: 1, dy: 0, facing: "right" };
      case "ArrowUp":
      case "KeyW":
        return { dx: 0, dy: -1, facing: "up" };
      case "ArrowDown":
      case "KeyS":
        return { dx: 0, dy: 1, facing: "down" };
      default:
        return null;
    }
  }
```

5. `stepToward` — drop `this.scribbs.setFlipX(dir.flip);`
6. `setFrame`:

```ts
  /** Pick the texture for the current facing + walk frame. */
  private setFrame(foot: "left" | "both" | "right") {
    this.scribbs.setTexture(`scribbs-${this.facing}-${foot}`);
  }
```

7. `tryMove` — classic GBA cycle (lead foot for the first half of the step,
   both feet on landing; parity alternates the lead foot per step). Replace the
   blocked-return `setFrame("a")` with `setFrame("both")`, and the b/c/d
   sequence with:

```ts
    this.moving = true;
    this.setFrame(this.stepParity ? "left" : "right");
    this.stepParity = !this.stepParity;
    this.time.delayedCall(PLAYER_STEP_MS / 2, () => {
      if (this.moving) this.setFrame("both");
    });
```

   and in the tween's `onComplete`, replace `this.setFrame("a")` with `this.setFrame("both")`.
8. `create()` resume block — remove `this.scribbs.setFlipX(resume.flip);` and change `this.setFrame("a")` to `this.setFrame("both")`.
9. `playHeathIntro` — change `this.setFrame("a")` to `this.setFrame("both")`.
10. `interactAhead` — facing math no longer uses flipX:

```ts
    if (this.facing === "down") dy = 1;
    else if (this.facing === "up") dy = -1;
    else dx = this.facing === "left" ? -1 : 1;
```

11. `saveSession` — drop the `flip` field:

```ts
    gameSession.pos = {
      roomId: this.room.id,
      tileX: this.tileX,
      tileY: this.tileY,
      facing: this.facing,
    };
```

(The cashier-walk `b/c/d` phases in `walkActor` are a separate texture family — leave untouched.)

- [ ] **Step 3: Update gameSession type**

In `lib/gameSession.ts`, update the pos type: facing becomes `"down" | "up" | "left" | "right"` and the `flip: boolean` field is removed (match the existing shape of the file — it's a small in-memory singleton).

- [ ] **Step 4: Typecheck + run + verify**

```bash
npx tsc --noEmit && npm test
```

Expected: both pass. Then walk all four directions in the browser:

```bash
B=~/.claude/skills/gstack/browse/dist/browse
$B goto http://localhost:3123
$B js "true"   # ensure page alive
```

Press Enter to start (`$B press Enter`), then hold arrows (`$B press ArrowUp` etc.), screenshot after moves in each direction and Read the screenshots: confirm distinct left vs right art and alternating feet (capture two screenshots mid-walk).

- [ ] **Step 5: Commit**

```bash
git add src/game/scenes/BootScene.ts src/game/scenes/WorldScene.ts lib/gameSession.ts src/game/art/registry.ts
git commit -m "feat(game): 3-frame GBA walk cycle with distinct left/right art"
```

---

### Task 3: Crate slide + stairs move (world data)

**Files:**
- Modify: `src/game/world/types.ts` (add `slideTo` to Placed; propActive/buildBlockedSet honour it)
- Modify: `src/game/world/mainRoom.ts:49-101` (stairs + crates to c6)
- Modify: `src/game/scenes/WorldScene.ts` (`revealSecret` slides right, keeps crate)
- Test: `__tests__/mainRoom.test.ts`

**Interfaces:**
- Produces: `Placed.slideTo?: { tileX: number; tileY: number }` — a concealing prop with `slideTo` stays active after its flag reveals, relocated to `slideTo` (drawn there + solid there). WorldScene animates the move.

- [ ] **Step 1: Write the failing tests**

In `__tests__/mainRoom.test.ts`, update/add (the existing "hides the secret stairs" test keeps passing — stairs still concealed pre-reveal):

```ts
  it("keeps the record crate in the world after the reveal, parked right of the stairs", () => {
    const crate = (mainRoom.decorations ?? []).find((d) => d.artKey === "crates")!;
    expect(crate.tileX).toBe(6); // beside the right speaker (c5)
    expect(crate.slideTo).toEqual({ tileX: 7, tileY: 2 }); // against the wall (c8+ is wall)
    const revealed = new Set(["basement-entrance"]);
    // Still active (slid, not despawned)…
    expect(propActive(crate, revealed)).toBe(true);
    // …and blocks its NEW tile, while the stairs tile (c6) is walkable.
    const blocked = buildBlockedSet(mainRoom, revealed);
    expect(blocked.has("7,2")).toBe(true);
    expect(blocked.has("6,2")).toBe(false);
  });

  it("stairs sit under the crate at c6", () => {
    const stairs = mainRoom.interactions.find((i) => i.type === "stairs")!;
    expect(stairs.tileX).toBe(6);
    expect(stairs.tileY).toBe(2);
  });
```

Import `propActive` and `buildBlockedSet` from `@/game/world/types` at the top if not present.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- mainRoom`
Expected: FAIL — crate.tileX is 7, `slideTo` undefined, stairs.tileX is 7.

- [ ] **Step 3: Implement**

`src/game/world/types.ts` — in the `Placed` interface, after `concealing?: string;`:

```ts
  /**
   * Where a `concealing` prop parks after its flag reveals. With `slideTo` the
   * prop STAYS in the world post-reveal (drawn + solid at the new tile) instead
   * of despawning — e.g. the record crate sliding off the secret stairs.
   */
  slideTo?: { tileX: number; tileY: number };
```

`propActive` — a concealing prop with `slideTo` never deactivates:

```ts
export function propActive(p: Placed, revealed: Set<string>): boolean {
  if (p.revealedBy && !revealed.has(p.revealedBy)) return false;
  if (p.concealing && !p.slideTo && revealed.has(p.concealing)) return false;
  return true;
}
```

`buildBlockedSet` — solid footprint uses the slid position post-reveal. In the `add` closure, before computing holes/footprint:

```ts
  const add = (p: Placed) => {
    if (!p.solid || !propActive(p, revealed)) return;
    const slid = p.concealing && p.slideTo && revealed.has(p.concealing)
      ? { ...p, tileX: p.slideTo.tileX, tileY: p.slideTo.tileY }
      : p;
    const holes = new Set((slid.holes ?? []).map((h) => `${slid.tileX + h.dx},${slid.tileY + h.dy}`));
    for (const t of footprint(slid)) {
      const key = `${t.x},${t.y}`;
      if (!holes.has(key)) blocked.add(key);
    }
  };
```

`src/game/world/mainRoom.ts` — stairs to c6 (line 51) and crates to c6 with slideTo (line 101):

```ts
    { id: "stairs", type: "stairs", tileX: C(6), tileY: R("b"), artKey: "stairs", solid: false,
      revealedBy: "basement-entrance", target: { roomId: "basement" }, transition: "fade" },
```

```ts
    // Record crate concealing the secret stairs (b6, snug against the right
    // speaker). Playing the vinyl slides it right to b7, parking it against
    // the wall — it stays visible and solid there.
    { tileX: C(6), tileY: R("b"), artKey: "crates", solid: true, concealing: "basement-entrance",
      slideTo: { tileX: C(7), tileY: R("b") } },
```

Update the comment at line 49-50 ("SECRET stairs (top, b7)" → b6).

`src/game/scenes/WorldScene.ts` `revealSecret` — slide-to-park instead of fade-out (only when the cover has slideTo; keep the old fade for covers without one). Also: `loadRoom` must draw an already-revealed crate at its slid position. In `loadRoom`'s decoration loop, replace the concealing branch:

```ts
      if (deco.concealing) {
        const slid = deco.slideTo && gameSession.revealed.has(deco.concealing);
        const at = slid ? { ...deco, ...deco.slideTo } : deco;
        const img = this.placeProp(at, 2.2, false);
        if (!slid) this.coverObjects.push(img);
        continue;
      }
```

And in `revealSecret`, replace the covers tween:

```ts
    covers.forEach((c) => {
      const deco = (this.room.decorations ?? []).find(
        (d) => d.concealing === flag && d.slideTo,
      );
      if (deco?.slideTo) {
        // Park the cover at its slid tile — stays visible and solid.
        const w = deco.wTiles ?? 1;
        this.tweens.add({
          targets: c,
          x: deco.slideTo.tileX * ts + (w * ts) / 2,
          duration: 420,
          ease: "Cubic.easeOut",
        });
      } else {
        this.tweens.add({
          targets: c, x: c.x - ts * 1.5, alpha: 0, duration: 420,
          ease: "Cubic.easeIn", onComplete: () => c.destroy(),
        });
      }
    });
```

- [ ] **Step 4: Run tests**

Run: `npm test && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Verify in-game**

Browse: start game, walk to the vinyl deck (top-left), press Z twice to trigger the reveal, screenshot: crate should slide one tile right and remain visible; stairs appear at its old spot; walking onto c7 blocked, c6 enters the basement.

- [ ] **Step 6: Commit**

```bash
git add src/game/world/types.ts src/game/world/mainRoom.ts src/game/scenes/WorldScene.ts __tests__/mainRoom.test.ts
git commit -m "feat(world): crate parks beside the wall on reveal; stairs move to b6"
```

---

### Task 4: Dialogue rewrite

**Files:**
- Modify: `app/page.tsx` (PROMPTS, HEATH_INTRO_PAGES, btnify)

**Interfaces:**
- Consumes: `products` from `@/lib/products` (array of `{ name: string, ... }` — confirm the export name by reading `lib/products.ts` first; it exports a product list used by the inventory grid).
- Produces: PROMPTS entries may have function-valued pages resolved at open time.

- [ ] **Step 1: Make pages dynamic-capable**

In `app/page.tsx`, pages become `string | (() => string)`; resolve at render. Change the PromptDef type:

```ts
type PromptPage = string | (() => string);

type PromptDef =
  | { variant: "choice"; question: string; kind: PromptKind; speaker?: string }
  | { variant: "message"; pages: PromptPage[]; speaker?: string }
  | { variant: "messageChoice"; pages: PromptPage[]; question: string; kind: PromptKind; speaker?: string };
```

Add a resolver next to `btnify` and use it everywhere a page is rendered/counted (pages.length usage is unaffected — only the text lookup changes):

```ts
  const pageText = (p: PromptPage) => (typeof p === "function" ? p() : p);
```

Rendered message text becomes `text={btnify(pageText(prompt.pages[page]))}`.

- [ ] **Step 2: Apply the copy changes**

At the top add: `import { products } from "@/lib/products";` (adjust to the actual export name found in `lib/products.ts`).

```ts
const HEATH_INTRO_PAGES = [
  "… Yooo. My name is Heath. I'm the founder of SCR!PTS. Welcome to our world!",
  "Walk up to anything and press {A} to check it out — {B} to go back.",
  "When you're ready, come back up — I'll check you out!",
];
```

PROMPTS changes (leave `rack`, `cashier`, `vinyl` handling, `rail-*` untouched):

```ts
  // Heath at the counter: a quick word, then the Yes/No.
  checkout: {
    variant: "messageChoice",
    speaker: "Heath",
    pages: ["You find some dope pieces?"],
    question: "Checkout?",
    kind: "cart",
  },
  "npc-rail": {
    variant: "message",
    pages: ["These just dropped this morning.", "I think there's only a few pairs left though."],
  },
  "npc-gazer": {
    variant: "message",
    pages: ["There's so many sick pieces, I can't choose which one to get… might js have to get a few, don't tell my bank."],
  },
  "npc-sofa": {
    variant: "message",
    pages: ["This pretty sick store huh? I'd check out the vinyls — some of my favorites in there."],
  },
  "npc-checkout": {
    variant: "message",
    pages: [
      () => {
        const p = products[Math.floor(Math.random() * products.length)];
        return `Just copped the ${p.name.toUpperCase()} tee.`;
      },
      "This spot is sweeeeeet! The staff is awesome and the pieces are sick!",
    ],
  },
  "basement-npc": {
    variant: "messageChoice",
    pages: ["Shhh… how did you find this place?", "You have to check these pieces out, they are insane!"],
    question: "Check out my favourite pieces?",
    kind: "basement",
  },
```

`btnify` gains the {B} swap:

```ts
  const btnify = (s: string) =>
    s.replaceAll("{A}", mobile ? "A" : "Z").replaceAll("{B}", mobile ? "B" : "X");
```

Note: if a product name already ends in "tee"/"Tee", drop the literal " tee." suffix — check `lib/products.ts` names first and adjust the line to avoid "TEE tee".

- [ ] **Step 3: Verify**

`npx tsc --noEmit && npm test` → PASS. Browse: start the game, read Heath's intro (3 pages with new copy, Z and X named on desktop), talk to each NPC, trigger checkout at the counter (speech page then "Checkout?" Yes/No). Reload the page a few times and re-talk to npc-checkout to see the product name vary.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat(dialogue): founder intro, checkout speech-choice, NPC pass, dynamic post-checkout line"
```

---

### Task 5: `useShellLayout` hook

**Files:**
- Create: `lib/useShellLayout.ts`
- Modify: `app/page.tsx` (replace `useIsMobile`)

**Interfaces:**
- Produces: `useShellLayout(): "desktop" | "portrait" | "landscape" | null` (null pre-mount). `page.tsx` passes `layout` to `GameBoyShell` and derives `mobile = layout !== "desktop"` for existing dialogue/btnify logic.

- [ ] **Step 1: Write the hook**

```ts
'use client'

import { useEffect, useState } from 'react'

export type ShellLayout = 'desktop' | 'portrait' | 'landscape'

/**
 * Which Game Boy shell layout to render. Touch devices (or narrow viewports)
 * get a handheld layout picked by orientation; mouse-driven desktops keep the
 * full-bleed bezel. null until mounted (avoid a hydration flash).
 */
export function useShellLayout(): ShellLayout | null {
  const [layout, setLayout] = useState<ShellLayout | null>(null)
  useEffect(() => {
    const touch = window.matchMedia('(max-width: 1024px), (pointer: coarse)')
    const portrait = window.matchMedia('(orientation: portrait)')
    const update = () =>
      setLayout(!touch.matches ? 'desktop' : portrait.matches ? 'portrait' : 'landscape')
    update()
    touch.addEventListener('change', update)
    portrait.addEventListener('change', update)
    return () => {
      touch.removeEventListener('change', update)
      portrait.removeEventListener('change', update)
    }
  }, [])
  return layout
}
```

- [ ] **Step 2: Swap it into page.tsx**

Remove the `useIsMobile` function. In `Home`:

```ts
  const layout = useShellLayout();
  const mobile = layout === null ? null : layout !== "desktop";
```

(Import `useShellLayout` from `@/lib/useShellLayout`; the `mobile === null` guard and all `mobile` usages stay as-is. Pass `layout={layout}` to `GameBoyShell` — prop added in Task 7; until then keep passing `mobile={mobile}`.)

- [ ] **Step 3: Verify + commit**

`npx tsc --noEmit` → PASS (GameBoyShell still takes `mobile` until Task 7).

```bash
git add lib/useShellLayout.ts app/page.tsx
git commit -m "feat(shell): orientation-aware useShellLayout hook"
```

---

### Task 6: Shared molded controls + utility strip + SystemOverlay

**Files:**
- Create: `components/shell/DPad.tsx`
- Create: `components/shell/RoundBtn.tsx`
- Create: `components/shell/PillBtn.tsx`
- Create: `components/shell/ConsoleUtilityStrip.tsx`
- Create: `components/shell/SystemOverlay.tsx`

**Interfaces:**
- Produces (consumed by Task 7's GameBoyShell):
  - `DPad({ size, hold }: { size: number; hold: (b: Btn) => HoldHandlers })` where `HoldHandlers = { onPointerDown; onPointerUp; onPointerCancel }`
  - `RoundBtn({ label, onPress, size }: { label: 'A' | 'B'; onPress: (b: Btn) => void; size?: number })`
  - `PillBtn({ label, onPress }: { label: Btn; onPress: (b: Btn) => void })`
  - `ConsoleUtilityStrip({ compact, muted, active, onAction }: { compact?: boolean; muted: boolean; active: 'social' | 'keys' | null; onAction: (a: 'social' | 'inventory' | 'mute' | 'keys') => void })`
  - `SystemOverlay({ kind, mobile, onClose }: { kind: 'social' | 'keys'; mobile: boolean; onClose: () => void })`
  - `Btn` type moves to `components/shell/DPad.tsx` and is re-exported from `GameBoyShell` (so `app/page.tsx`'s `import { type Btn } from "@/components/GameBoyShell"` keeps working).

- [ ] **Step 1: DPad — molded cross with etched arrows**

`components/shell/DPad.tsx`:

```tsx
'use client'

export type Btn = 'up' | 'down' | 'left' | 'right' | 'A' | 'B' | 'MENU' | 'SELECT' | 'START'

export type HoldHandlers = {
  onPointerDown: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  onPointerCancel: (e: React.PointerEvent) => void
}

const ARM = 'linear-gradient(180deg, #34342F 0%, #232320 100%)'

/** Etched arrow triangle pointing in a direction (Delta-style D-pad face). */
function Arrow({ dir, size }: { dir: 'up' | 'down' | 'left' | 'right'; size: number }) {
  const s = size
  const points = {
    up: `${s / 2},0 ${s},${s} 0,${s}`,
    down: `0,0 ${s},0 ${s / 2},${s}`,
    left: `${s},0 ${s},${s} 0,${s / 2}`,
    right: `0,0 ${s},${s / 2} 0,${s}`,
  }[dir]
  return (
    <svg width={s} height={s} style={{ opacity: 0.5 }}>
      <polygon points={points} fill="#141412" />
    </svg>
  )
}

/**
 * Molded D-pad cross: dark charcoal arms with etched arrow triangles and a
 * centre dot, four hold-to-walk pointer zones on top.
 */
export default function DPad({ size, hold }: { size: number; hold: (b: Btn) => HoldHandlers }) {
  const arrow = Math.round(size * 0.11)
  const pad = Math.round(size * 0.075)
  return (
    <div style={{ position: 'relative', width: size, height: size, touchAction: 'none' }}>
      {/* Arms */}
      <div style={{
        position: 'absolute', top: '34%', left: 0, right: 0, height: '32%',
        background: ARM, borderRadius: size * 0.09,
        boxShadow: '0 3px 6px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -2px 3px rgba(0,0,0,0.5)',
      }} />
      <div style={{
        position: 'absolute', left: '34%', top: 0, bottom: 0, width: '32%',
        background: ARM, borderRadius: size * 0.09,
        boxShadow: '0 3px 6px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -2px 3px rgba(0,0,0,0.5)',
      }} />
      {/* Centre dot */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: size * 0.18, height: size * 0.18, borderRadius: '50%',
        background: 'radial-gradient(circle at 40% 35%, #3A3A35, #1D1D1B)',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6)',
      }} />
      {/* Etched arrows */}
      <div style={{ position: 'absolute', top: pad, left: '50%', transform: 'translateX(-50%)' }}><Arrow dir="up" size={arrow} /></div>
      <div style={{ position: 'absolute', bottom: pad, left: '50%', transform: 'translateX(-50%)' }}><Arrow dir="down" size={arrow} /></div>
      <div style={{ position: 'absolute', left: pad, top: '50%', transform: 'translateY(-50%)' }}><Arrow dir="left" size={arrow} /></div>
      <div style={{ position: 'absolute', right: pad, top: '50%', transform: 'translateY(-50%)' }}><Arrow dir="right" size={arrow} /></div>
      {/* Hold zones */}
      <div {...hold('up')} style={{ position: 'absolute', top: 0, left: '28%', width: '44%', height: '40%' }} />
      <div {...hold('down')} style={{ position: 'absolute', bottom: 0, left: '28%', width: '44%', height: '40%' }} />
      <div {...hold('left')} style={{ position: 'absolute', left: 0, top: '28%', width: '40%', height: '44%' }} />
      <div {...hold('right')} style={{ position: 'absolute', right: 0, top: '28%', width: '40%', height: '44%' }} />
    </div>
  )
}
```

- [ ] **Step 2: RoundBtn + PillBtn**

`components/shell/RoundBtn.tsx`:

```tsx
'use client'

import { Press_Start_2P } from 'next/font/google'
import type { Btn } from './DPad'

const pressStart = Press_Start_2P({ weight: '400', subsets: ['latin'], display: 'swap' })

/** Dark molded round face button (A / B), Delta-style. */
export default function RoundBtn({
  label, onPress, size = 56,
}: { label: 'A' | 'B'; onPress: (b: Btn) => void; size?: number }) {
  return (
    <div
      onPointerDown={(e) => { e.preventDefault(); onPress(label) }}
      style={{
        width: size, height: size, borderRadius: '50%',
        background: 'radial-gradient(circle at 38% 32%, #3B3B36 0%, #232320 55%, #191917 100%)',
        boxShadow: '0 4px 10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -3px 4px rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', touchAction: 'none',
      }}
    >
      <span className={pressStart.className} style={{ fontSize: size * 0.24, color: 'rgba(247,247,245,0.35)' }}>
        {label}
      </span>
    </div>
  )
}
```

`components/shell/PillBtn.tsx` — move the existing `PillBtn` + `pill`/`pillLbl` styles out of `GameBoyShell.tsx` verbatim, restyled dark:

```tsx
'use client'

import { Press_Start_2P } from 'next/font/google'
import type { Btn } from './DPad'

const pressStart = Press_Start_2P({ weight: '400', subsets: ['latin'], display: 'swap' })

/** A dark molded pill button (MENU / SELECT / START) with its label below. */
export default function PillBtn({ label, onPress }: { label: Btn; onPress: (b: Btn) => void }) {
  return (
    <div
      onPointerDown={(e) => { e.preventDefault(); onPress(label) }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer', touchAction: 'none' }}
    >
      <div style={{
        width: 44, height: 13,
        background: 'linear-gradient(180deg, #34342F 0%, #232320 100%)',
        borderRadius: 7,
        boxShadow: '0 2px 5px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -2px 3px rgba(0,0,0,0.5)',
      }} />
      <span className={pressStart.className} style={{ fontSize: 5, color: '#4A4A44', letterSpacing: 0.5 }}>
        {label}
      </span>
    </div>
  )
}
```

- [ ] **Step 3: ConsoleUtilityStrip — small angled icon buttons**

`components/shell/ConsoleUtilityStrip.tsx`:

```tsx
'use client'

/** 12x12 pixel-art glyphs drawn as SVG rect grids (1 unit = 1 "pixel"). */
function Glyph({ kind, muted }: { kind: 'social' | 'inventory' | 'mute' | 'keys'; muted?: boolean }) {
  const px = (pts: Array<[number, number]>, fill: string) =>
    pts.map(([x, y], i) => <rect key={i} x={x} y={y} width={1} height={1} fill={fill} />)
  const ink = '#2B2B27'
  let cells: React.ReactNode = null
  if (kind === 'social') {
    // Link/share: two nodes joined by a diagonal chain
    cells = px([[2,2],[3,2],[2,3],[3,3],[4,4],[5,5],[6,6],[7,7],[8,8],[9,8],[8,9],[9,9]], ink)
  } else if (kind === 'inventory') {
    // Tee shirt
    cells = px([[3,2],[4,2],[7,2],[8,2],[2,3],[3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],[3,4],[8,4],[4,5],[5,5],[6,5],[7,5],[4,6],[7,6],[4,7],[7,7],[4,8],[5,8],[6,8],[7,8]], ink)
  } else if (kind === 'mute') {
    // Speaker cone (+ cross when muted)
    cells = (
      <>
        {px([[2,4],[3,4],[2,5],[3,5],[2,6],[3,6],[4,3],[4,7],[5,2],[5,8],[6,2],[6,3],[6,4],[6,5],[6,6],[6,7],[6,8]], ink)}
        {muted && px([[8,3],[9,4],[10,5],[9,6],[8,7],[10,3],[8,5],[10,7]], '#8B1A42')}
      </>
    )
  } else {
    // Question mark
    cells = px([[4,2],[5,2],[6,2],[3,3],[7,3],[7,4],[6,5],[5,6],[5,7],[5,9]], ink)
  }
  return <svg viewBox="0 0 12 12" width={14} height={14} shapeRendering="crispEdges">{cells}</svg>
}

/**
 * The four out-of-game hardware buttons (Socials / Inventory / Mute / Keys),
 * styled as small angled silkscreened buttons molded into the console body.
 * In-flex only — never absolutely positioned over siblings.
 */
export default function ConsoleUtilityStrip({
  compact = false, muted, active, onAction,
}: {
  compact?: boolean
  muted: boolean
  active: 'social' | 'keys' | null
  onAction: (a: 'social' | 'inventory' | 'mute' | 'keys') => void
}) {
  const actions = ['social', 'inventory', 'mute', 'keys'] as const
  return (
    <div style={{ display: 'flex', gap: compact ? 8 : 12, justifyContent: 'center', alignItems: 'center' }}>
      {actions.map((a, i) => (
        <button
          key={a}
          aria-label={a}
          onClick={() => onAction(a)}
          style={{
            width: compact ? 26 : 30, height: compact ? 20 : 22,
            transform: `rotate(${i % 2 ? 8 : -8}deg)`,
            background: active === a || (a === 'mute' && muted)
              ? 'linear-gradient(180deg, #B9B9AC 0%, #9C9C90 100%)'
              : 'linear-gradient(180deg, #C9C9BD 0%, #ACACA0 100%)',
            border: 'none', borderRadius: 5, padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.35), inset 0 -2px 2px rgba(0,0,0,0.28), 0 2px 3px rgba(0,0,0,0.3)',
            cursor: 'pointer', touchAction: 'manipulation',
          }}
        >
          <Glyph kind={a} muted={muted} />
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: SystemOverlay — in-LCD pause panel**

`components/shell/SystemOverlay.tsx`:

```tsx
'use client'

import { Press_Start_2P } from 'next/font/google'

const pressStart = Press_Start_2P({ weight: '400', subsets: ['latin'], display: 'swap' })

const SOCIALS = [
  { label: 'Instagram', href: 'https://instagram.com' },
  { label: 'YouTube', href: 'https://youtube.com' },
  { label: 'TikTok', href: 'https://tiktok.com' },
]

/**
 * Pause-menu-style overlay rendered INSIDE the LCD (same host as the game
 * canvas / start screen): dimmed screen + pixel-frame panel. Socials list or
 * the platform-aware key legend. Tap outside (or B/X/Escape, handled by the
 * shell) closes it.
 */
export default function SystemOverlay({
  kind, mobile, onClose,
}: { kind: 'social' | 'keys'; mobile: boolean; onClose: () => void }) {
  const keys: [string, string][] = mobile
    ? [['D-PAD', 'Move'], ['A', 'Interact'], ['B', 'Back'], ['START', 'Start']]
    : [['ARROWS', 'Move'], ['Z', 'Interact'], ['X', 'Back'], ['ENTER', 'Start']]
  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 8,
        background: 'rgba(13,13,13,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0D0D0D', border: '3px solid #F7F7F5', borderRadius: 4,
          boxShadow: '0 0 0 3px #0D0D0D',
          padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10,
        }}
      >
        <span className={pressStart.className} style={{ fontSize: 7, color: '#FF8AC7', letterSpacing: 1 }}>
          {kind === 'social' ? 'SOCIALS' : 'CONTROLS'}
        </span>
        {kind === 'social'
          ? SOCIALS.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                 className={pressStart.className}
                 style={{ fontSize: 8, color: '#F7F7F5', letterSpacing: 0.5 }}>
                {s.label}
              </a>
            ))
          : keys.map(([k, v]) => (
              <div key={k} className={pressStart.className}
                   style={{ fontSize: 7, color: '#F7F7F5', display: 'flex', gap: 16, justifyContent: 'space-between' }}>
                <span style={{ color: '#FF8AC7' }}>{k}</span><span>{v}</span>
              </div>
            ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Typecheck + commit**

```bash
npx tsc --noEmit
git add components/shell/
git commit -m "feat(shell): shared molded controls, utility strip, in-LCD system overlay"
```

---

### Task 7: GameBoyShell rewrite (3 layouts) + page wiring + delete UtilityBar

**Files:**
- Rewrite: `components/GameBoyShell.tsx`
- Modify: `app/page.tsx` (props)
- Delete: `components/UtilityBar.tsx`

**Interfaces:**
- Consumes: Task 5 `ShellLayout`, Task 6 components.
- Produces: `GameBoyShell({ screen, onPress, onRelease, layout, onInventory, muted, onToggleMute, onOverlayChange })` — `layout: ShellLayout`; `onOverlayChange(open: boolean)` fires when a SystemOverlay opens/closes so the page can freeze Phaser (`gameRef.current?.events.emit("dialog", open)`). Re-exports `type Btn` from `./shell/DPad`.

- [ ] **Step 1: Rewrite GameBoyShell**

Replace `components/GameBoyShell.tsx` entirely:

```tsx
'use client'

import { Press_Start_2P } from 'next/font/google'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import DPad, { type Btn } from './shell/DPad'
import RoundBtn from './shell/RoundBtn'
import PillBtn from './shell/PillBtn'
import ConsoleUtilityStrip from './shell/ConsoleUtilityStrip'
import SystemOverlay from './shell/SystemOverlay'
import type { ShellLayout } from '@/lib/useShellLayout'

export type { Btn }

const pressStart = Press_Start_2P({ weight: '400', subsets: ['latin'], display: 'swap' })

const BODY = `linear-gradient(160deg, #D4D4C8 0%, #BCBCB0 25%, #A8A89C 55%, #989890 75%, #8C8C84 100%)`
const SHEEN = `
  linear-gradient(90deg, rgba(255,255,255,0.14) 0px, rgba(255,255,255,0.04) 3px, transparent 10px),
  linear-gradient(180deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.03) 3px, transparent 10px)
`

/** Speaker-grille dot pattern (Delta landscape flank filler). */
function Grille({ width, height }: { width: number; height: number }) {
  return (
    <div style={{
      width, height,
      backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.35) 1.5px, transparent 1.5px)',
      backgroundSize: '9px 9px',
    }} />
  )
}

/** The LCD module — bezel + recessed screen hosting `children` (+ overlay). */
function ScreenModule({
  children, overlay, compact = false, wordmarkBelow = false, style = {},
}: {
  children: ReactNode
  overlay: ReactNode
  compact?: boolean
  wordmarkBelow?: boolean
  style?: React.CSSProperties
}) {
  const inset = compact ? 8 : 18
  const label = (
    <div style={{
      height: compact ? 22 : 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, zIndex: 1,
    }}>
      <span className={pressStart.className} style={{ fontSize: compact ? 6 : 8, color: '#3A3A3A', letterSpacing: 4 }}>
        SCR!PTS
      </span>
    </div>
  )
  return (
    <div style={{ background: '#111111', display: 'flex', flexDirection: 'column', position: 'relative', ...style }}>
      <div style={{
        flex: 1, margin: `${inset}px ${inset}px 0 ${inset}px`,
        background: '#DCDCDA', borderRadius: 4, position: 'relative', overflow: 'hidden', zIndex: 1,
      }}>
        {children}
        {overlay}
      </div>
      {wordmarkBelow || !compact ? label : <div style={{ height: inset }} />}
    </div>
  )
}

export default function GameBoyShell({
  screen, onPress, onRelease, layout, onInventory, muted, onToggleMute, onOverlayChange,
}: {
  screen: ReactNode
  onPress: (b: Btn) => void
  /** Fired when a held button is let go (D-pad hold-to-walk). */
  onRelease?: (b: Btn) => void
  layout: ShellLayout
  onInventory: () => void
  muted: boolean
  onToggleMute: () => void
  /** SystemOverlay open/close — the page freezes Phaser input while open. */
  onOverlayChange?: (open: boolean) => void
}) {
  const [overlayKind, setOverlayKind] = useState<'social' | 'keys' | null>(null)

  const setOverlay = useCallback((k: 'social' | 'keys' | null) => {
    setOverlayKind((prev) => {
      const next = prev === k ? null : k
      onOverlayChange?.(next !== null)
      return next
    })
  }, [onOverlayChange])

  const closeOverlay = useCallback(() => {
    setOverlayKind((prev) => {
      if (prev !== null) onOverlayChange?.(false)
      return null
    })
  }, [onOverlayChange])

  // Desktop keys close an open overlay (X / Escape), matching B on touch.
  useEffect(() => {
    if (!overlayKind) return
    const onKey = (e: KeyboardEvent) => {
      if (['KeyX', 'Escape'].includes(e.code)) { e.preventDefault(); closeOverlay() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [overlayKind, closeOverlay])

  const press = (b: Btn) => (e: React.PointerEvent) => {
    e.preventDefault()
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* noop */ }
    if (overlayKind && (b === 'B' || b === 'A' || b === 'START')) { closeOverlay(); return }
    onPress(b)
  }
  const release = (b: Btn) => (e: React.PointerEvent) => { e.preventDefault(); onRelease?.(b) }
  const hold = (b: Btn) => ({
    onPointerDown: press(b),
    onPointerUp: release(b),
    onPointerCancel: release(b),
  })
  const pressPlain = (b: Btn) => {
    if (overlayKind && (b === 'B' || b === 'A' || b === 'START')) { closeOverlay(); return }
    onPress(b)
  }

  const onUtility = (a: 'social' | 'inventory' | 'mute' | 'keys') => {
    if (a === 'inventory') { closeOverlay(); onInventory(); return }
    if (a === 'mute') { onToggleMute(); return }
    setOverlay(a)
  }

  const overlay = overlayKind
    ? <SystemOverlay kind={overlayKind} mobile={layout !== 'desktop'} onClose={closeOverlay} />
    : null

  const rootStyle: React.CSSProperties = {
    background: BODY, userSelect: 'none', WebkitUserSelect: 'none',
    WebkitTouchCallout: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'none',
  }

  // ── DESKTOP: full-bleed bezel; utility strip molded into the bottom edge.
  if (layout === 'desktop') {
    return (
      <div className="h-dvh w-screen flex flex-col" style={rootStyle}>
        <div style={{ flex: 1, position: 'relative', padding: '40px 40px 0 40px', display: 'flex' }}>
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: SHEEN }} />
          <div style={{
            position: 'relative', flex: 1, borderRadius: 16, overflow: 'hidden',
            boxShadow: '0 2px 0 rgba(255,255,255,0.12), 0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.5)',
          }}>
            <ScreenModule overlay={overlay} style={{ width: '100%', height: '100%' }}>{screen}</ScreenModule>
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 16,
              boxShadow: 'inset 0 6px 16px rgba(0,0,0,0.95), inset 0 -3px 8px rgba(0,0,0,0.6), inset 5px 0 12px rgba(0,0,0,0.6), inset -5px 0 12px rgba(0,0,0,0.6)',
            }} />
          </div>
        </div>
        <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ConsoleUtilityStrip muted={muted} active={overlayKind} onAction={onUtility} />
        </div>
      </div>
    )
  }

  // ── LANDSCAPE: LCD centre, D-pad left flank, A/B + grille right flank.
  if (layout === 'landscape') {
    return (
      <div className="h-dvh w-screen flex" style={rootStyle}>
        {/* Left flank */}
        <div style={{ width: 150, flexShrink: 0, position: 'relative', display: 'flex', flexDirection: 'column', padding: '10px 12px' }}>
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: SHEEN }} />
          <div style={{ alignSelf: 'flex-start' }}><PillBtn label="MENU" onPress={pressPlain} /></div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DPad size={110} hold={hold} />
          </div>
        </div>
        {/* Centre: screen + SELECT/START + wordmark below */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <ScreenModule overlay={overlay} compact wordmarkBelow style={{ flex: 1, minHeight: 0 }}>{screen}</ScreenModule>
          <div style={{ height: 34, display: 'flex', gap: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <PillBtn label="SELECT" onPress={pressPlain} />
            <PillBtn label="START" onPress={pressPlain} />
          </div>
        </div>
        {/* Right flank */}
        <div style={{ width: 150, flexShrink: 0, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 12px' }}>
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: SHEEN }} />
          <Grille width={70} height={54} />
          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            {/* A upper-right, B lower-left (Delta diagonal) */}
            <div style={{ position: 'relative', width: 118, height: 108, touchAction: 'none' }}>
              <div style={{ position: 'absolute', top: 0, right: 0 }}><RoundBtn label="A" onPress={pressPlain} size={52} /></div>
              <div style={{ position: 'absolute', bottom: 0, left: 0 }}><RoundBtn label="B" onPress={pressPlain} size={52} /></div>
            </div>
          </div>
          <ConsoleUtilityStrip compact muted={muted} active={overlayKind} onAction={onUtility} />
        </div>
      </div>
    )
  }

  // ── PORTRAIT: LCD top, molded control panel below, utility strip on the
  // bottom edge. All rows flex — nothing overlaps down to 320x568.
  return (
    <div className="h-dvh w-screen flex flex-col" style={rootStyle}>
      <div style={{ height: '50%', padding: '16px 16px 0 16px', display: 'flex', alignItems: 'stretch', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: SHEEN }} />
        <ScreenModule overlay={overlay} compact style={{
          flex: 1, borderRadius: '10px 10px 0 0', overflow: 'hidden',
          boxShadow: 'inset 0 3px 8px rgba(0,0,0,0.8), inset 2px 0 6px rgba(0,0,0,0.4), inset -2px 0 6px rgba(0,0,0,0.4)',
        }}>
          {screen}
        </ScreenModule>
      </div>

      <div style={{ height: '50%', display: 'flex', flexDirection: 'column', padding: '12px 28px 10px 28px', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: SHEEN }} />
        <div style={{ height: 1, background: 'rgba(0,0,0,0.12)', flexShrink: 0 }} />

        {/* Row 1: D-pad + A/B — flexes to absorb short viewports */}
        <div style={{ flex: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 0 }}>
          <DPad size={110} hold={hold} />
          <div style={{ position: 'relative', width: 120, height: 110, touchAction: 'none' }}>
            <div style={{ position: 'absolute', top: 0, right: 0 }}><RoundBtn label="A" onPress={pressPlain} /></div>
            <div style={{ position: 'absolute', bottom: 0, left: 0 }}><RoundBtn label="B" onPress={pressPlain} /></div>
          </div>
        </div>

        {/* Row 2: MENU · SELECT · START */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', minHeight: 30 }}>
          <div style={{ flex: 1 }}><PillBtn label="MENU" onPress={pressPlain} /></div>
          <div style={{ display: 'flex', gap: 22 }}>
            <PillBtn label="SELECT" onPress={pressPlain} />
            <PillBtn label="START" onPress={pressPlain} />
          </div>
          <div style={{ flex: 1 }} />
        </div>

        {/* Row 3: utility strip on the bottom edge of the body */}
        <div style={{ flexShrink: 0, paddingTop: 6, paddingBottom: 4 }}>
          <ConsoleUtilityStrip compact muted={muted} active={overlayKind} onAction={onUtility} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire page.tsx**

In `app/page.tsx`, the shell call becomes:

```tsx
      <GameBoyShell
        layout={layout!}
        screen={screen}
        onPress={handlePress}
        onRelease={handleRelease}
        onInventory={() => router.push("/inventory")}
        muted={muted}
        onToggleMute={() => setMuted((m) => !m)}
        onOverlayChange={(open) => gameRef.current?.events.emit("dialog", open)}
      />
```

(`layout` is non-null here — the `mobile === null` early-return guard above already covers `layout === null`.)

- [ ] **Step 3: Delete UtilityBar**

```bash
git rm components/UtilityBar.tsx
```

- [ ] **Step 4: Verify + commit**

`npx tsc --noEmit && npm test` → PASS.

```bash
git add components/GameBoyShell.tsx app/page.tsx
git commit -m "feat(shell): responsive 3-layout Game Boy shell with molded controls"
```

---

### Task 8: Visual verification pass (all viewports)

**Files:** none (screenshots only; fix regressions inline in the shell components if found)

- [ ] **Step 1: Screenshot matrix**

```bash
B=~/.claude/skills/gstack/browse/dist/browse
$B goto http://localhost:3123
for vp in 320x568 375x667 390x844 844x390 1024x768 1440x900; do
  $B viewport $vp
  $B screenshot /tmp/shell-$vp.png
done
```

Read every screenshot. Checks:
- 320×568 / 375×667 / 390×844 (portrait): D-pad cross with etched arrows, dark A/B diagonal, pills, utility strip on the bottom edge — nothing overlapping, nothing clipped.
- 844×390 / 1024×768 (landscape, coarse-pointer emulation may fall back to desktop in headless — if browse reports desktop layout, verify landscape by evaluating `window.matchMedia('(orientation: landscape)').matches` and temporarily widening the touch query via devtools emulation is NOT available; instead verify landscape by resizing below 1024 width: 844×390 qualifies via `max-width: 1024px`): LCD centred, D-pad left, A/B + grille right, SELECT/START under the screen, utility cluster bottom-right.
- 1440×900 (desktop): bezel with utility strip molded into the bottom bar.

- [ ] **Step 2: Overlay + interaction checks**

At 1440×900 and 375×667: click each utility button. SOCIAL/KEYS → overlay INSIDE the LCD (screenshot each); clicking the same button again closes it; Escape closes on desktop; MUTE toggles the icon's crossed state; INV navigates to `/inventory` (then navigate back). Confirm zero console errors: `$B console --errors`.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A components/shell components/GameBoyShell.tsx
git commit -m "fix(shell): visual polish from viewport verification pass" # only if fixes were made
```

---

### Task 9: Full walkthrough + spec change-log

**Files:**
- Modify: `PRD.md` is NOT touched; add a line to the spec's status if desired — skip docs otherwise.

- [ ] **Step 1: End-to-end dogfood**

In browse at 1440×900: fresh load → PRESS START → Heath intro (3 new pages, X mentioned) → talk to all four floor NPCs (verify new copy; npc-checkout names a real product) → play vinyl → crate slides right and stays → descend to basement → basement NPC (new final line) → return → counter checkout (speech page then "Checkout?") → answer No. `$B console --errors` → clean.

- [ ] **Step 2: Final gates**

```bash
npx tsc --noEmit && npm test && npm run build
```

Expected: all pass.

- [ ] **Step 3: Commit anything outstanding**

```bash
git status --short   # should be clean; commit stragglers with an appropriate message if not
```
