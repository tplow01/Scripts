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
**Last meaningful update:** 2026-06-25

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

---

## Experience Flow

### 1. Loading sequence
- Opens to a **black screen** — no nav, no menus, no loading bars, no modern web elements.
- Small pixel fragments appear and slowly assemble an image, like an old Game Boy booting up.
- A night city emerges piece by piece: windows illuminate, streetlights flicker, neon signs glow, rain reflections appear, traffic begins moving.
- Music slowly fades in. The user immediately understands: *"I'm entering a game."*

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
Racks represent product collections. Interacting opens a **Pokémon-style inventory menu** ("A rack full of pieces.") where users can: view products, view images, read descriptions, view pricing, select size, select color, check stock, add to cart. Products feel **integrated into the world, not separated from it**.

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

### Lounge area (optional hidden experience)
Player interacts with the couch → *"Sit down?"* (Yes / No).
- **Yes:** Scribbs sits, vinyl starts playing, additional dialogue appears, lore becomes available, hidden stories emerge.
- **No:** nothing happens. The lounge is completely optional.

### Checkout desk
A pixel version of **Heath** stands behind the desk:
> *"Yooo. My name is Heath. I'm the founder of SCR!PTS. You ready to check out?"* (Yes / No)
- **Yes:** cart opens, checkout begins.
- **No:** *"No stress. Keep looking around."*

---

## The Basement

The **most important location** in SCR!PTS. Designed to create **mythology, not sales**.

### The Basement Philosophy
The Basement is not a collection, not a category, not accessible through navigation, not advertised — **it is discovered**. Only users who physically find the hidden staircase gain access.

The goal is to make users feel like they **found something they were never supposed to find** — driving exclusivity, mystery, community discussion ("Yo, did you know there's a hidden room?"), organic discovery, and increased exploration.

### Discovery & transition
- Staircase is hidden: no signs, no navigation, no prompts. Found only through exploration.
- On entering: screen fades, music changes, lights flicker, environment darkens. Player should feel *"I wasn't supposed to find this."*

### Basement NPC
> *"...Wait. How did you find this place? Most people never make it down here. Since you're already here... you might as well take a look."*

### Basement rules (hard requirement)
Basement products **cannot** be searched, recommended, appear in navigation, appear in collections, or appear on the homepage. **They only exist inside the Basement.**

### Basement contents
Hidden drops, limited products, rare collectibles, experimental pieces, concept items, unreleased designs.

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
