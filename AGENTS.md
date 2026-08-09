# AGENTS.md — SCR!PTS (scripts-arcade)

Read [`PRD.md`](./PRD.md) and [`BRAND.md`](./BRAND.md) first, every session (see [`CLAUDE.md`](./CLAUDE.md)).

## Cursor Cloud specific instructions

SCR!PTS is a single Next.js 15 (App Router) + React 19 + TypeScript + Phaser 3 web app. There is
**one service**: the Next.js dev server. There are no external dependencies to run locally —
Supabase / Stripe / Resend and the `/admin` dashboard are not built yet (see the PRD change log),
so no `.env` / secrets are required for development.

Standard commands live in [`package.json`](./package.json) and [`README.md`](./README.md):

- `npm run dev` — dev server on http://localhost:3000 (Phaser game at `/`, ecommerce pages at
  `/inventory`, `/products/[slug]`, `/cart`, `/checkout`, `/basement`).
- `npm test` — Vitest unit tests (world data + art registry + tokens). `npm run test:watch` to watch.
- `npm run build` — production build; this step also runs type-checking.

Non-obvious notes:

- **`npm run lint` is not runnable non-interactively.** No ESLint config is committed, so
  `next lint` drops into an interactive "How would you like to configure ESLint?" prompt and hangs
  in an automated shell. Type validity is instead covered by `npm run build` ("Linting and checking
  validity of types"). Don't add an ESLint config as part of environment setup — that's a project
  decision for the maintainers.
- The Phaser game is client-only (`ssr: false`, mounted in `src/game/PhaserGame.tsx`). The game
  world (Lobby/Basement) is the game layer; product/inventory/cart/checkout are normal web pages.
- Cart state is client-side only (`lib/cart.tsx`); there's no backend persistence yet.
