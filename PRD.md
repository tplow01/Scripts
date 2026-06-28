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
**Last meaningful update:** 2026-06-25 (reconciled with locked UX decisions)

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

### NPC system
NPCs bring the store to life; dialogue updates with future collections. Examples:
- **Record Collector** — *"This track changed my life."*
- **Basement Rumor Guy** — *"I heard there's another room here."*
- **Loyal Customer** — *"Been here since Drop 01."*
- **Creative Friend** — *"You ever get an idea so good you can't sleep?"*

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
