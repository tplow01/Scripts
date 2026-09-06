# Sound Map

Every UI sound effect in SCR!PTS, what triggers it, and why. Uses [`uisfx`](https://uisfx.com) —
one semantic cue name (e.g. `select`, `error`) can be re-skinned by swapping the *pack* without
touching any of this wiring. See `lib/sfx.tsx` for the pack choice and rationale.

**Format:** `sound = what thing, what causes it`

**Packs:**
- **Shop** (inventory, basement, product pages, cart, checkout) → `studio`
- **Game** (the playable world at `/`) → `arcade`, swapped in/out on route mount/unmount

---

## Shop — commerce (`lib/cart.tsx`)

These fire from the cart's own `add`/`remove`/`openCart`/`closeCart` functions, so every
entry point into the cart (product page, checkout, game prompts) gets the same sound for free.

| Sound | What thing | What causes it |
|---|---|---|
| `add-to-cart` | Cart state | Any product variant is added to the bag |
| `remove-from-cart` | Cart state | An item is removed from the bag (trash icon in the drawer or `/cart`) |
| `open` | Cart drawer | The drawer opens — bag icon, checkout-prompt "Yes", or the game's checkout sequence |
| `close` | Cart drawer | The drawer closes — X button or clicking outside it |

## Shop — product page (`app/products/[slug]/ProductDetail.tsx`)

| Sound | What thing | What causes it |
|---|---|---|
| `select` | Size button | A size is chosen |
| `deselect` | Size button | The already-selected size is clicked again, clearing it |
| `back` | Image gallery | The "previous image" arrow is clicked |
| `forward` | Image gallery | The "next image" arrow is clicked |
| `error` | Add to Bag button | Adding to the bag throws (falls into the `catch` block) |
| `checkout` | Cart drawer footer | The "Checkout" button is clicked (`components/CartDrawer.tsx`) |

## Shop — checkout (`app/checkout/page.tsx`)

| Sound | What thing | What causes it |
|---|---|---|
| `blocked` | Pay button | Form is submitted with invalid/empty fields — highlights errors, doesn't attempt payment |
| `processing` (loop) | Pay button | Payment submission starts; loops until it resolves, stopped in every exit path (success, decline, or unmount) |
| `error` | Order | The simulated payment is declined (test card starting `4000`) |
| `purchase` | Order | The order is placed successfully |

## Shop — everywhere (nav bars, footers)

| Sound | What thing | What causes it |
|---|---|---|
| `back` | Back arrow | Leaving a shop page via the nav bar's back arrow (`NavBar.tsx`, `BasementNavBar.tsx`) |
| `success` | Newsletter form | The email signup form is submitted (`NewsletterFooter.tsx`, `BasementFooter.tsx`) |
| `toggle-on` | Sound toggle | Sound is turned back **on** — plays once, right after unmuting, as an audible confirmation. (Muting plays nothing — silence has to be immediate, so nothing sounds *while* muting.) |

## Everywhere (shop + game) — global

Wired once in `lib/sfx.tsx` via delegated `window`-level listeners (see `lib/sfxController.ts`),
not per-component — every button gets these automatically.

| Sound | What thing | What causes it |
|---|---|---|
| `hover` | Any `<button>` | Mouse pointer enters a button (not touch; not disabled buttons; doesn't re-fire moving between a button's own child elements) |

## Game — dialogue (`app/page.tsx`)

| Sound | What thing | What causes it |
|---|---|---|
| `expand` | Dialogue box | An NPC/rack/checkout/vinyl-deck prompt opens (ordinary case) |
| `achievement` | Dialogue box | The vinyl deck is interacted with for the **first time**, revealing the secret basement entrance — a one-time discovery, not an ordinary line of dialogue |
| `collapse` | Dialogue box | The open prompt is closed (message finishes, or a Yes/No choice is made) |

## Game — movement & world (`src/game/scenes/WorldScene.ts` → `app/page.tsx`)

| Sound | What thing | What causes it |
|---|---|---|
| `blocked` | Scribbs (player sprite) | Walking into a wall, fixture, or NPC — fires once per held-key attempt, not once per frame |
| `forward` | Camera | A stairs interaction starts a room transition (shop floor ↔ basement) |

## Game — system menu (`app/page.tsx` → `GameBoyShell`)

| Sound | What thing | What causes it |
|---|---|---|
| `open` | System overlay | The pause-style Game Boy menu opens |
| `close` | System overlay | The system menu closes |

---

## Deliberately silent

Not every interaction makes noise — these were left out on purpose:

- **Hover on dense/repeated elements** (product grid tiles, footer link lists) — only bare
  `<button>` elements get the global hover cue; plain `<a>` links don't, so an 8-item product
  grid or a footer nav row doesn't turn into a wall of clicks.
- **Quantity +/− steppers** in the cart — too frequent/low-stakes to be worth a sound each press.
- **Thumbnail dots** under the product gallery — redundant with the prev/next arrows, which
  already cover "change the active image."
- **Player/NPC footsteps** — the single highest-frequency interaction in the whole product
  (every tile of every walk); sonifying it risked becoming background noise fast.
- **Typing** in the checkout form — the catalog has a dedicated `typing` cue, but per-keystroke
  audio across a full name/address/card form felt intrusive on a premium checkout, not
  "meaningful feedback."
- **Mobile on-screen D-pad/buttons** — these funnel into the exact same code path as keyboard
  input, so a separate press sound would double up with whatever that action already plays.
