# SCR!PTS — scripts-arcade

**Read [`PRD.md`](./PRD.md) and [`BRAND.md`](./BRAND.md) first, every session.**

- **[`PRD.md`](./PRD.md)** is the playbook and single source of truth for *what* SCR!PTS is —
  how it should feel, the tech stack, scope, and roadmap. Everything in this repo serves the
  vision described there.
- **[`BRAND.md`](./BRAND.md)** is the brand bible — the audience, voice, personality, fonts, and
  colours. **Always follow it** for every design and copy decision (game-world Pokémon voice
  vs. AWGE-editorial shopping interface; exact colour tokens and fonts).

Both are **living documents** — they can and will change. When a decision changes the product,
stack, or roadmap, **update `PRD.md` in the same change** (and add a line to its Change Log);
when brand direction changes, **update `BRAND.md`** the same way. If code and these docs
disagree, stop and reconcile before continuing.

## What this is

A browser-based Pokémon-FireRed-style pixel world that *is* the SCR!PTS flagship store —
the player explores locations and discovers products rather than browsing pages. See
`PRD.md` for the full vision and the experience flow.

## Stack (per PRD)

- **Frontend:** Next.js + React + TypeScript; **Phaser 3** for gameplay (tilemaps, movement)
- **Backend:** Supabase + PostgreSQL + Next.js API Routes
- **Payments:** Stripe Checkout · **Email:** Resend · **Hosting:** Vercel
- **Admin:** custom dashboard at `/admin`
- **Pixel art:** Aseprite · Tiled · Photoshop · Illustrator
