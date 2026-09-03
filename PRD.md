# SCR!PTS — Product Requirements & Project Playbook

> **This is the core document of the project.** It is the single source of truth for what
> SCR!PTS is, how it should feel, what we're building, and in what order. Read it before
> doing any work in this repo.
>
> **It is a living document.** Nothing here is frozen — the vision, scope, stack, and
> roadmap can and will change as we learn. When a decision changes, **update this file in
> the same change** so it never goes stale. If something you're building contradicts this
> doc, either the code is wrong or the doc is — stop and reconcile before continuing.

**Status:** Canonical · Launch Version
**Owner:** Heath (founder, SCR!PTS)
**Last meaningful update:** 2026-08-01 (five-character cast + FireRed walk cycle)

---

## Core Vision

SCR!PTS is not a website. SCR!PTS is a **browser-based pixel-art world inspired by Pokémon FireRed**.

The player does not browse pages — the player explores locations and discovers products naturally through exploration.

The site functions simultaneously as:

- a Pokémon-style game
- a digital flagship store
- a creative universe
- a music-inspired world
- a hidden underground fashion space

It should feel like **"I started a game,"** never **"I opened an online store."** The store is simply the first location inside the world; future expansions become *locations*, not pages.

The world should feel: nostalgic, mysterious, creative, music-driven, fashion-focused, alive. Every room handcrafted, every interaction intentional, every product discovered rather than marketed.

> **Final philosophy:** The player enters a game → explores a world → discovers a brand → and *only then* realizes they can buy something.

### The game / commerce boundary (read this)

The world is a **game**, but commerce runs on **normal ecommerce pages**. The two layers are deliberately separated:

- **Game layer (Phaser):** the Lobby and the Basement. Movement, NPCs, dialogue, props, lounge, music, mobile controls, discovery. This is where the *feeling* lives.
- **Web layer (Next.js pages):** product pages, cart, checkout, and the Lobby's rack inventory page. Standard ecommerce — fast, familiar, conversion-friendly.

The handoff: the player **discovers** products inside the game, then **interacting drops them onto a normal web product page** to actually buy. The game sells the brand; the web layer closes the sale. We do not rebuild checkout inside Phaser.

---

## Experience Flow

### 1. Loading sequence
- Opens to a **loading screen** leading into an **"Enter to play"** prompt — kept simple, not a complex cinematic boot.
- Tone is still game-like (black screen, pixel aesthetic, music fading in), but the goal is a clean, fast entry, not a long sequence.
- Music slowly fades in. The user immediately understands: *"I'm entering a game."*
- *Open:* exact framing of the prompt / how much pre-game animation we keep is still being decided. Default to minimal for launch.

### 2. Title screen
- Inspired by Pokémon FireRed. **Side-view, full-body, cinematic** camera (emotional energy of the Gojo/Geto walking scene).
- Features **Heath + Scribbs** walking side-by-side through a city at night, both in headphones listening to music, neither speaking. Animation **loops continuously**.
- Feeling: effortless, nostalgic, confident, emotional, adventurous — the beginning of a journey.
- **City never static** — something always moving:
  - **Foreground:** cars passing, rain puddles, reflections, floating music notes
  - **Midground:** flickering storefronts, SCR!PTS posters, graffiti, collection teasers, hidden symbols
  - **Background:** moving trains, city skyline, apartment lights, animated billboards, traffic lights
- **Easter eggs** hidden throughout: SCR!PTS posters, Scribbs graffiti, hidden Basement symbols, future-collection silhouettes, album references, secret lore clues. Most users shouldn't notice them immediately.
- **Music** is one of the most important elements — soundtrack should feel dreamlike, emotional, late-night, inspiring, nostalgic. Goal: make users *want* to stay on the title screen.

### 3. Start screen
- Displays `SCR!PTS` with a softly pulsing **START**.
- Input: Enter / Z / Space / Mouse Click / Mobile A Button.

### 4. Transition into game
- On START: screen fades, city ambience fades, footsteps continue briefly, music transitions, player enters the SCR!PTS store.
- Control transfers to **Scribbs**. The adventure begins.

---

## Player & Controls

### Player character
- Every user controls **Scribbs** (the player's avatar — all interactions occur through Scribbs).
- **No account, no setup** — the player immediately begins exploring.

### Controls
**Desktop:**
```
Arrow Keys = Move
WASD       = Move
Z          = Interact
X          = Cancel
Enter      = Confirm
Space      = Interact
```

**Mobile** — inspired by the Delta emulator:
- Transparent overlay interface: **D-Pad, A Button, B Button**.
- Should feel like a **handheld console, not a mobile website**.

---

## Main Store (the hub)

The SCR!PTS store is the main hub; the player can freely explore.

**Layout:** Entrance · Display Tables · Clothing Racks · Poster Wall · Lounge Area · Checkout Desk · Back Hallway · Hidden Basement Stairs

### Clothing racks
Racks represent product collections and live in the Lobby. Walking up and interacting (A / Z / Space) transitions the player out of the game and onto a **normal ecommerce inventory page** — a standard white, 12-column-grid product listing. From there the player opens a **normal ecommerce product page** to view images, descriptions, pricing, select size/color, check stock, and add to bag.

The *discovery* is in-world; the *transaction* is standard web. Cart and checkout are reachable from both the inventory page and the product page. A top-left back button returns the player to the Lobby.

### Display tables
Showcase featured pieces, best sellers, hero products, seasonal highlights. Interaction reveals additional information.

### Mannequins
Showcase new arrivals, upcoming collections, key products — visual storytelling.

### Poster walls
Contain photoshoots, campaign imagery, collection stories, creative inspirations, future teasers, artist references — they build the SCR!PTS universe.

### The cast
The store is populated by **five named, hand-drawn characters** — no anonymous
background shoppers. Dialogue updates with future collections.

| Character | Where | Behaviour |
|---|---|---|
| **Scribbs** | everywhere | The player's avatar |
| **Heath** | behind the checkout | Greets you on first entry; walks the counter at checkout |
| **Heath** | the Basement | A second, independent instance guarding the secret rack |
| **Teo** | the vertical clothing rail | Browses — shuffles a couple of tiles up and down |
| **TP** | sofa ↔ checkout | Walks a fixed route across the shop floor |
| **Karl** | beside the sofa | Stands and talks |

Every character is authored as 4 facings × 3 walk frames and imported by
`scripts/import-sprites.py`; left and right are distinct art, never mirrored.

### Lounge area (interactive lore zone)
The Lounge is an **interactive lure environment** — not an optional/hidden afterthought. It's where the SCR!PTS universe deepens and where the brand's external channels live.

- **Lore & atmosphere:** interactable props and dialogue surface hidden stories, references, and world-building. This is the emotional heart of the Lobby.
- **Music:** a speaker prop in the lounge is interactable (on/off toggle + volume slider). Multiple tracks play across the Lobby rather than one global track.
- **Social links:** screens/props in the lounge open SCR!PTS social channels (Instagram, TikTok) in a new tab on interact.
- **Vinyl:** decoration only — sets the mood, no interaction required.

### Checkout desk
A pixel desk in the Lobby. Walking up and interacting (A / Z) takes the player straight to the **normal ecommerce cart / checkout page** — no scripted gate, no Yes/No dialogue required to proceed. The desk is simply an in-world entry point to the standard cart.

*Optional flavor:* a pixel version of **Heath** can stand behind the desk for personality, but interacting routes to the real ecommerce cart rather than a game menu.

---

## The Basement

The **most important location** in SCR!PTS — and the **main game experience**. The Lobby introduces the world; the Basement is where the actual game-feeling payoff happens. It is designed to create **mythology *and* a moment**: the player has to *find* the products, then *choose* one.

### The Basement Philosophy
The Basement is not a collection, not a category, not accessible through navigation, not advertised — **it is discovered**. Only users who physically find the hidden staircase gain access.

The goal is to make users feel like they **found something they were never supposed to find** — driving exclusivity, mystery, community discussion ("Yo, did you know there's a hidden room?"), organic discovery, and increased exploration.

### Discovery & transition
- Entry is via **normal in-shop staircases on the sides of the Lobby** — discrete and unmarked. No signs, no nav, no prompts. Found only through exploration.
- Two staircases, both on the sides of the room, both unmarked.
- On entering: screen fades, music changes, lights flicker, environment darkens. Player should feel *"I wasn't supposed to find this."*

### The Basement experience (core mechanic)
This is the signature interaction of the whole project — a **Pokémon "choose your starter" moment**, reskinned as fashion.

1. The player explores the Basement and **finds the products** in the world (they are not handed over on entry).
2. A **Basement NPC** gates the moment, telling the player to interact with the pieces — e.g. *"...You found them. Go on — take a look at what's down here."*
3. Interacting opens a **special in-game clothing rack** the player can **swipe through** — the equivalent of choosing from three Poké Balls, but as a rack of pieces. This stays inside the game layer and *feels* like part of the world.
4. **Selecting a specific piece** drops the player onto a **normal ecommerce product page** (same structure as the Lobby's product pages) to actually buy.

So: discovery + NPC + swipeable rack = game layer. Product selection onward = normal web.

### Basement NPC
> *"...Wait. How did you find this place? Most people never make it down here. Since you're already here... go on — take a look at the pieces."*

The NPC's job is to frame the choose-your-piece moment, not to deliver a wall of lore.

### Basement rules (hard requirement)
Basement products **cannot** be searched, recommended, appear in navigation, appear in collections, or appear on the homepage. **They only exist inside the Basement.** The basement product pages are **`noindex, nofollow`** with no nav link anywhere.

### Basement contents
A small, curated set of hidden pieces (launch: ~2–3) — limited products, rare collectibles, experimental pieces, concept items, unreleased designs.

---

## Layer & Page Summary

| Zone | Layer | What happens | Cart access | Back |
|---|---|---|---|---|
| Loading / Enter to play | Game | Simple entry into the world | — | — |
| Lobby | Game (Phaser) | Explore, NPCs, lounge, music, social links, racks, checkout desk | Via checkout desk → cart | N/A |
| Lounge | Game (Phaser) | Interactive lore, music toggle, social links (new tab) | — | N/A |
| Rack inventory | Web page | Normal ecommerce listing (white, 12-col grid) | Visible on page | Top-left button → Lobby |
| Product page | Web page | Normal ecommerce product page | Visible on page | Top-left → inventory/basement |
| Basement | Game (Phaser) | Find products, NPC, swipeable special rack | Via product selection | Standard back |
| Basement product | Web page | Normal ecommerce product page (`noindex,nofollow`) | Visible on page | Top-left → Basement |
| Cart / checkout | Web page | Normal ecommerce + Stripe | — | Top-left button |

**Rule of thumb:** Lobby and Basement are the game. The moment a product listing or product page opens, the player is on a normal web page.

---

## Technical Architecture

### Frontend
- **Next.js** (application structure) + **React** + **TypeScript**
- **Phaser 3** (gameplay)

### Game engine — Phaser 3
Browser-native, Pokémon-style movement, tilemaps, lightweight, mobile-friendly, easy deployment.

### Pixel art pipeline
Aseprite · Tiled · Photoshop · Illustrator.

**Production resolution:** 32px native environment tiles and approximately
32×40px compact overworld characters, rendered only at integer scale with smoothing disabled.
World positions and collision remain grid-based. Character and prop art stays
behind the art registry so visual upgrades never rewrite room logic. Production
atlases should use PNG + JSON frame metadata; deterministic code-authored art is
allowed for assets that benefit from exact palette and grid control.

The character direction is original anime-fashion editorial: model-like
proportions, distinctive hair silhouettes, visible SCR!PTS garments, and subtle
idle/walk personality. Third-party game sprites may be studied for readability
but cannot be copied, traced, extracted, or shipped.

### Backend
- **Supabase** + **PostgreSQL** + **Next.js API Routes**
- Stores: products, inventory, orders, variants, images, customers.

### Payments — Stripe Checkout
Supports cards, Apple Pay, Google Pay. Stripe handles security, fraud protection, payment processing.

### Email — Resend
Order confirmations, shipping notifications, contact forms.

### Hosting
Primary: **Vercel**. Alternative: Cloudflare Pages.

### Admin system
Custom SCR!PTS dashboard at protected route **`/admin`**: add / edit / delete products, upload images, manage inventory, manage pricing, view orders, manage Basement products. **No developer needed for future product drops.**

Products are modelled Shopify-style as **options → variants**: a product declares up to three options (e.g. Size, Colour), and every combination of option values generates a variant carrying its own SKU, stock count, and price/compare-at/cost. There is no hand-set "status" field on a product — **availability is derived** from the variants themselves (sellable stock present, or backorder allowed, falls through to sold-out). Editing options in the admin (add/remove/rename/reorder a value, add/remove an option) reconciles the variant list live, preserving stock and hand-edited SKUs on every surviving combination and seeding new ones at zero stock. The full product editor is a **dedicated full-page route** (`/admin/products/[id]/edit`), not a slide-over drawer — it holds the options editor, a variant table (desktop) / variant cards (mobile), and the product's other sections (media, pricing, organization, etc).

The storefront catalog ships with **12 products** — 8 in the inventory collection and 4 in the Basement — one per emotion/colourway pair. Each product carries a single **Size** axis; the product detail page links **sibling colourways** as separate products, with stock-aware size selection layered on top.

---

## Feasibility Report

| Feature | Difficulty | Launch Version |
|---|---|---|
| Title Screen | Medium | Yes |
| Movement | Easy | Yes |
| Store Map | Easy | Yes |
| Product System | Medium | Yes |
| Cart | Medium | Yes |
| Stripe Checkout | Easy | Yes |
| Admin Dashboard | Medium | Yes |
| Inventory System | Medium | Yes |
| Mobile Controls | Medium | Yes |
| NPC Dialogue | Easy | Yes |
| Lounge | Easy | Yes |
| Basement | Medium | Yes |
| Product Try-On | Medium | Version 2 |
| Archive Room | Easy | Later |
| Music Room | Easy | Later |

---

## Risks & Mitigations

| # | Risk | Mitigation |
|---|------|-----------|
| 1 | Too much world, not enough shopping | Products must remain easily discoverable |
| 2 | Mobile optimization | Build mobile-first alongside desktop |
| 3 | Scope creep | Launch V1 before adding new locations |

---

## Development Roadmap

### Version 1 — SCR!PTS Launch
Loading animation · title screen · Heath + Scribbs intro · playable Scribbs · main store · NPCs · product racks · display tables · lounge · checkout desk · Stripe checkout · custom admin · hidden Basement · Basement products · mobile controls.

### Version 2 — Brand Depth
Product try-on system · additional NPC stories · more lore · improved animations · expanded easter eggs.

### Version 3 — World Expansion
Collection Archive Room · Music Room · rooftop access · additional city areas · deeper world building.

---

## Change Log

Record meaningful changes to this playbook here so the project's direction has a history.

- **2026-06-25** — Adopted Heath's fully-custom flagship-game blueprint as the canonical PRD. Replaced the earlier Shopify-handoff "vibe layer beside the store" proposal; commerce is now fully in-house (Next.js + Supabase + Stripe + custom `/admin`), and the game *is* the store.
- **2026-06-25** — **Reconciled with locked UX decisions.** Defined the game-layer / web-layer boundary: Lobby + Basement are Phaser game; product listings, product pages, cart and checkout are normal ecommerce. Clothing racks now route to a normal ecommerce inventory/product page (not an in-game menu). Loading simplified to a loading screen + "Enter to play" prompt. Lounge upgraded from optional/hidden to an **interactive lure zone** with lore, music toggle, and social links. Checkout desk now routes straight to the normal ecommerce cart (Heath dialogue optional flavor only). **Basement promoted to the main game experience**: discover products by exploring → Basement NPC → swipeable "choose your piece" special rack (Pokémon starter-ball moment) → selecting a piece opens a normal ecommerce product page. Added a Layer & Page Summary table.
- **2026-06-28** — **Added the canonical brand bible [`BRAND.md`](./BRAND.md)** (from Heath's Brand Identity doc) — audience, positioning, personality, voice, fonts (Pixel Operator Bold / Fashion Whacks / Inter·Geist), and colour tokens (`#0D0D0D`, `#F7F7F5`, `#FF8AC7`, `#FF4FA3`, `#6F6F73`). It must always be followed for design/copy; `CLAUDE.md` now requires reading it each session. Clarified the rack interaction: it opens an **AWGE-style editorial shopping interface**. **Map v2** captured in `docs/world-map-notes.md`: three areas (Main, Basement, Lounge); Lounge is now a **music/vinyl lounge** (vinyl desk + speakers); display tables & mannequins kept; Basement reached via stairs hinted by a book + a poster-button.
- **2026-06-28** — **v0 app scaffold landed.** Stood up the Next.js 15 + React 19 + TypeScript + Phaser 3 + Tailwind + Vitest foundation with brand tokens as a single source of truth and the **swappable-visuals architecture** (world data separated from an art registry). One playable placeholder Main room: Scribbs moves on a tile grid, camera follows, and rack/checkout/stairs tiles fire a stub interaction. Spec: `docs/superpowers/specs/2026-06-28-app-scaffold-design.md`; plan: `docs/superpowers/plans/2026-06-28-app-scaffold.md`. Still stubs/TODO: real art, AWGE shopping UI, Supabase/Stripe/Resend, `/admin`, mobile D-pad, Lounge + Basement rooms.
- **2026-07-12** — **Locked the production visual direction.** Upgraded the game from mixed 16px/external sprite inputs to an original 32px SCR!PTS art system: 32×48 model-proportioned characters, six fashion/anime hairstyle families, garment-specific NPC styling, higher-resolution architectural tiles/racks/core fixtures, animated Heath walk frames, localized light pools and dust, plus an original rainy-city title loop. Added the explicit rule that third-party game art is reference-only and may never be copied or shipped.
- **2026-07-12** — **Gen 4/5 overworld refinement.** After researching PokeMMO's current player-sprite and vanity construction as reference only, expanded Scribbs to 12 directional frames (four phases per direction), expanded Heath's profile walk to four phases, and added a passing-pose lift plus arm/leg counter-swing. Replaced procedural floor-logo drawing with a native 96px nearest-neighbour derivative of the canonical 480px SCR!PTS master, and biased the camera toward the world ahead so the full mark stays visible on mobile.
- **2026-07-12** — **Compact character direction locked from supplied reference.** Changed characters only from 32×48 model proportions to 32×40 Gen 4-overworld proportions: heads occupy roughly half the silhouette, with shorter torsos/limbs, larger shoes, compact facial placement, and direction-specific hair. Environment, racks, logo, lighting, camera, and UI were deliberately unchanged.
- **2026-07-28** — **Console shell redesigned.** Mobile overlay now features a flat #FF4FA3 pink shell across all devices with black SCR!PTS strip, seamless symmetric D-pad, black A/B buttons with pink letters, DMG-style blank-pill utilities with printed labels, and flat mute/? icons. Speaker-dot motif and shell cart removed; Delta emulator aesthetic refined for product-forward interaction.
- **2026-07-30** — **Admin dashboard prototype shipped.** Hidden back office at a secret slug (no auth yet — auth arrives with Supabase): Overview stats, product management with real-model add/edit drawer and image dropzones, order management with live status changes; all mock state in a localStorage-persisted provider, ready to swap internals for Supabase.
- **2026-07-31** — **Admin v2 shipped.** Order detail drawer (customer contact/address, line items with thumbnails, totals, payment badge, status timeline with auto-stamping), product gallery images (front/back + up to 6), and Overview analytics (stat deltas, traffic + revenue SVG charts, top products, status and customer breakdowns) — still mock-data, localStorage v2 schema.
- **2026-07-31** — **Admin metric drill-downs shipped.** Each Overview stat card opens a full SaaS-style detail page (/metrics/revenue·orders·aov·visitors): 7/14/30d range toggle, large charts with hover value readouts and day ticks, per-metric breakdowns (revenue by product, payment split, status mix, avg items, high/low orders, conversion rate, top pages, device split) and range-filtered drill-down tables. Stats logic extracted to lib/admin/stats.ts; traffic mock extended to 30 days.
- **2026-07-31** — **Admin responsive UX pass.** Three breakpoints (phone <640 / tablet / desktop ≥1024): phone bottom nav replaces the sidebar, tables become stacked cards, and drill-downs gained a sticky header (back + metric + range pills) plus a dedicated headline stat card with a delta chip. Fixed tables bleeding past their card borders and values wrapping mid-token.
- **2026-08-01** — **Admin rebuilt around a Shopify-style product variant model.** Products now declare options (e.g. Size, Colour) that expand into variants, each with its own SKU, stock, and pricing; the old hand-set product status field is gone — **availability is derived** from variant stock/backorder state. The product editor moved from a slide-over drawer to a **dedicated full-page route** with an options editor and a variant table/cards. The storefront catalog now ships **6 products**, and the product detail page gained a **colourway swatch picker** for choosing a variant directly. Products-list table rows were also consolidated to a single stretched-link click target per row (was four redundant links) for cleaner keyboard/screen-reader navigation.
- **2026-08-01** — **Five-character cast + FireRed walk cycle.** Replaced the one-authored-player/six-procedural-NPC setup with five hand-drawn characters — Scribbs (player), Heath (checkout + a second instance in the Basement), Teo (browsing the vertical rail), TP (walking a sofa↔checkout route) and Karl (beside the sofa). All procedural character art was deleted from `hiresArt.ts`; the cast now loads from authored PNGs via `art/characters.ts` and `scripts/import-sprites.py`, which scales every character to a common content height so the cast is one size. Movement moved to a shared `WalkCycle`: one stride held per tile with the feet alternating, neutral only at a standstill, ~250ms/tile, plus FireRed **turn-in-place** (a tap turns, only a held press walks). Patrolling NPCs run on a new `NpcActor` that holds position when blocked rather than clipping through. Spec: `docs/superpowers/specs/2026-08-01-five-character-cast-design.md`.
- **2026-08-03** — **Catalog split one product per colourway.** `migrateProducts` now groups by `collection|emotion|colorway`, so the catalog is **12 products** (8 inventory + 4 Basement) with a single **Size** axis each, keeping the original pre-split slugs (`anxiety-white`). The PDP's colourway swatch picker is replaced by **"Other colourways"** links to sibling products, and `LEGACY_SLUG_REDIRECTS` inverts to send merged slugs (`/products/anxiety`) to that emotion's White colourway. The admin now seeds from `ALL_PRODUCTS`, so the **Basement's 4 products reach the back office for the first time**, managed in the same list with a Collection column and filter. Storage key bumped to `scripts-admin-v3` (the v2 payload's ids, slugs and axes no longer match). Spec: `docs/superpowers/specs/2026-08-01-catalog-split-and-basement-admin-design.md`.
- **2026-09-03** — **API layer + database foundations landed.** Stood up the server side the project never had: a Postgres schema (`supabase/migrations/0001_init.sql`) transcribed from `types/product.ts` and `lib/admin/types.ts`, Row Level Security as the real access boundary, a `lib/server/` data-access layer, zod request validation, and REST routes under `app/api/` for the admin's five mutations plus cart resolution and newsletter signup. Back-office authentication arrives via Supabase Auth with an httpOnly session cookie and a `middleware.ts` gate — the slug is no longer the only protection. **Basement membership moved from the free-text `collection: 'Basement'` string to an explicit `isBasement` boolean**, which now drives both the RLS policies and a `noindex, nofollow` tag on Basement product pages — closing a live violation of the PRD's hard requirement, since those four pages had been prerendered as publicly indexable HTML. The cart stops pricing itself from the bundle and asks `/api/cart/resolve`, so the server is the price authority — the same seam Stripe will use. Until Supabase credentials exist, reads fall back to the seed catalog so the app still runs, while writes return 503 rather than pretending to save. Stripe and Resend remain out of scope, with `stripe_session_id` reserved on `orders` as the webhook's idempotency key. Plan: `.claude/plans/okay-so-now-lets-immutable-lerdorf.md`.
