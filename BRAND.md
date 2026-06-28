# SCR!PTS — Brand Identity

> **Canonical brand bible. Always follow this — every session, every design and copy decision.**
> Source: Heath's "Brand Identity SCR!PTS" doc. This is a living document like [`PRD.md`](./PRD.md);
> if brand direction changes, update this file in the same change. Where the experience/scope
> lives in `PRD.md`, the *feel, voice, look, and audience* live here. The two must stay in sync.

---

## Simple Brand Statement

> **SCRIPTS is a home for creative culture.**
>
> Fashion is the first medium, but the brand is built around creativity, community, music,
> sport, gaming, pop culture, and storytelling.

SCR!PTS isn't built around one niche. It brings together everything that inspires creativity —
fashion, music, soccer, pop culture, gaming, art, and design.

---

## Target Market

**Primary audience**
- **Age:** 18–28
- **Interests:** Streetwear, Music, Fashion, Creative Culture, Art, Design, Photography,
  Soccer, Pop Culture, Anime, Gaming, Collecting, Creative Communities.

**Personality**
People who love standing out. They appreciate thoughtful design, limited pieces, and wear
SCRIPTS proudly because they believe it's one of the coolest brands they've found. They enjoy
it when someone asks, *"Where'd you get that?"* They aren't trying to fit in — they want to wear
something people remember.

**Buying motivation**
Identity, Creativity, Storytelling, Community, Exclusivity, and Culture. Buying SCRIPTS feels
like joining a creative world, not just buying clothes.

**Customer archetype**
- **Listens to:** The Kid LAROI, Joey Bada$$, Kid Cudi, Mac Miller, Central Cee, Brent Faiyaz,
  A$AP Rocky, Frank Ocean, Tyler, The Creator, Dominic Fike, Daniel Caesar.
- **Wears:** Supreme, Stüssy, KidSuper, Acne Studios, Corteiz, Aimé Leon Dore.

---

## Brand Positioning

SCRIPTS isn't trying to compete with fast fashion. It aims to stand **alongside** brands like
Supreme, KidSuper, Acne Studios, Stüssy, and Corteiz — not by copying them, but by building
**cultural impact**. The clothing should stand on its own, while the world around it makes it
unforgettable. **The long-term goal is building a community, not simply selling products.**

---

## Brand Personality

If SCRIPTS were a person: **confident, creative, ambitious**, and comfortable with attention
because they've earned it. They strive to be the best without forcing themselves into every
conversation. People naturally notice them.

**Words that describe SCRIPTS**
Creative · Confident · Underground · Intentional · Nostalgic · Timeless · Ambitious ·
Emotional · Original · Cultural

**Words that do NOT describe SCRIPTS**
Corporate · Generic · Overdesigned · Forced · Trend Chasing · Cheap · Minimal Effort ·
Fake Luxury

---

## Brand Voice & Playable World

Dialogue throughout the playable world should feel **exactly like classic Pokémon** — simple,
friendly, and natural.

When a player interacts with a **clothing rack**, they transition into a **dedicated shopping
interface inspired by the AWGE website**. That interface uses the SCRIPTS typeface
(*Fashion Whacks*), editorial layouts, campaign photography, and premium product presentation
— before seamlessly returning the player to the game world.

> Two registers, by design: the **game world** speaks plain, warm, retro-game Pokémon; the
> **shopping interface** speaks high-fashion editorial (AWGE-style). The seam between them
> should feel intentional, not jarring.

---

## Design & Typography

| Use case | Font |
|---|---|
| **Game world** — dialogue, menus, NPC names, item names, UI | **Pixel Operator Bold** |
| **SCRIPTS brand** — collection titles, product names, editorial pages, campaign graphics, shopping-interface headings | **Fashion Whacks** |
| **Body** — descriptions, checkout, forms, admin dashboard, supporting text | **Inter** or **Geist** |

### Colour System

| Token | Hex | Use |
|---|---|---|
| Primary Black | `#0D0D0D` | base / backgrounds / text |
| White | `#F7F7F5` | base / surfaces / text |
| Primary Pink | `#FF8AC7` | brand accent |
| Secondary Pink | `#FF4FA3` | brand accent (deeper) |
| Neutral Grey | `#6F6F73` | supporting / muted |

> When code defines colours/fonts (Tailwind theme, CSS vars, Phaser styles), use these exact
> tokens — don't invent new ones. Keep them in one source-of-truth theme file so they stay swappable.

---

## How to apply this (quick checklist)

- Game-world copy → simple, friendly Pokémon-style. Shopping interface → AWGE editorial.
- Never sound corporate, generic, or trend-chasing. Underground & intentional > loud & forced.
- Use the exact colour tokens and the right font per context.
- Every feature should reinforce **world & community first, selling second.**
