# Live back-office stats: self-hosted event tracking

**Date:** 2026-09-27
**Status:** Approved in conversation, awaiting spec review.

## Goal

Replace the one fake dataset left in the back office (`lib/admin/mockTraffic.ts` — visitors, top pages, device split) with real numbers, and add a full funnel view covering how a visitor moves from arriving, through exploring the game world, to finding the Basement, to buying something.

## Decisions made

| Decision | Choice |
|---|---|
| Where events live | Self-hosted: a new Supabase table, no third-party analytics vendor |
| Scope | All 14 events in the table below, plus a new **Funnel** page in the admin, in one pass |
| Consent | No banner. Anonymous, first-party, no PII, no ad sharing, no cross-site tracking — update the Privacy Policy's existing "if we introduce analytics" line to describe what's tracked. (Not legal advice — worth a real check before selling at volume in a jurisdiction with stricter rules.) |
| Client → server | One `fetch(url, { keepalive: true })` per event, fire-and-forget. No batching layer. |
| Identity | A random id in `localStorage`, created on first `track()` call. No login, no PII, no cross-site linkage. |

## The 14 events, resolved to exact code

| Event | What it tells you | Fires from |
|---|---|---|
| `click_to_start` | How many visitors actually enter | `StartScreen`'s `onStart` in `app/page.tsx` |
| `inventory_shortcut` | How many skip exploration | The `onInventory` handler in `app/page.tsx` (`onInventory={() => leaveTo("/inventory")}`), fired only when the existing `started` state is still `false` — i.e. the player pressed INVENTORY before ever pressing Start. No new state needed; `started` already exists. |
| `npc_interaction` | Whether people engage with characters | `interactionRef.current` in `app/page.tsx`, whenever `hit.type === 'npc'` (covers Heath/`cashier`, `teo`, `tp`, `karl`) |
| `karl_interaction` | Whether people are finding the Basement clue | Same handler, specifically `hit.id === 'karl'` (fires alongside `npc_interaction`, not instead of it) |
| `vinyl_interaction` | Whether they follow Karl's hint | Same handler, specifically `hit.id === 'vinyl'` (the existing vinyl-toggle branch) |
| `basement_discovered` | **Big one** — % who actually find it | The existing `gameRef.current?.events.emit("reveal", "basement-entrance")` call, guarded by the existing `if (!revealed)` check so it only fires once per session |
| `inventory_view` | Normal store traffic | `app/inventory/page.tsx` on mount |
| `basement_view` | Secret-store traffic | `app/basement/page.tsx` on mount |
| `product_click_inventory` | Product interest from normal shop | `ProductCard` click, when `theme === 'light'` |
| `product_click_basement` | Product interest from Basement | `ProductCard` click, when `theme === 'dark'` |
| `add_to_cart` | Purchase intent | `lib/cart.tsx`'s `add()` |
| `checkout_started` | Funnel | `lib/checkout.ts`'s `useStripeCheckout().start()`, right before the `fetch` to `/api/checkout/session` |
| `purchase` | Conversion | **Server-side only** — `app/api/webhooks/stripe/route.ts`, right where it already calls `createPaidOrder`. See "Why purchase is different" below. |
| `device_type` | Game Boy mobile vs desktop behavior | **Not a standalone event.** This is a dimension on every row (see schema), computed the same way `useIsPhone.ts` does (`matchMedia('(max-width: 639px)')`). Ambiguity resolved: the source table listed it as a row, but "mobile vs desktop behavior" only makes sense as a filter on the other 13 events, not a 14th thing that happens. |

## Why `purchase` is different

Every other event is a funnel signal — useful even if a few are missed or double-counted. `purchase` is the one number the business actually cares about being right, so it follows the same rule the codebase already applies to orders themselves: **only the Stripe webhook may write it.** A client-side "I paid" beacon fired from the success page would be wrong in exactly the cases that matter most — closed tabs, ad blockers, declined cards, a refresh mid-redirect — and could be forged by anyone who opens dev tools. The public `/api/analytics/track` route explicitly rejects `event: "purchase"` with a 422.

To still connect a purchase back to the funnel that led to it, the browser's analytics session id rides along inside the existing Stripe metadata plumbing (the same mechanism that already carries `variant_id` per line item):

1. `useStripeCheckout().start()` sends `analyticsSessionId` alongside the existing `items` in its POST to `/api/checkout/session`.
2. `app/api/checkout/session/route.ts` puts it in the session's top-level `metadata: { analytics_session_id }`.
3. The webhook reads `session.metadata?.analytics_session_id` and uses it as the `session_id` on the `purchase` row (falling back to `null` if absent — e.g. a session created before this ships).

## Data model

```sql
-- supabase/migrations/0007_analytics_events.sql

create table if not exists analytics_events (
  id           bigint generated always as identity primary key,
  session_id   text,                    -- null only for pre-migration purchase rows
  event        text not null check (event in (
                 'click_to_start', 'inventory_shortcut', 'npc_interaction',
                 'karl_interaction', 'vinyl_interaction', 'basement_discovered',
                 'inventory_view', 'basement_view', 'product_click_inventory',
                 'product_click_basement', 'add_to_cart', 'checkout_started', 'purchase'
               )),
  path         text,
  device_type  text check (device_type in ('mobile', 'desktop')),
  meta         jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists analytics_events_event_created_idx on analytics_events (event, created_at);
create index if not exists analytics_events_session_idx on analytics_events (session_id);

alter table analytics_events enable row level security;
-- No public policies, same rule as orders/order_items/newsletter_signups: every
-- write and every admin read goes through the service_role client, which
-- bypasses RLS. The anon key can neither read nor write this table directly —
-- the /api/analytics/track route is the only path in, and it holds no
-- credentials the browser can see.
```

`meta` is a small, bounded jsonb bag for the odd extra detail worth keeping (e.g. which product id on a `product_click_*` event) — not a general-purpose free-for-all; the route caps its size (see below).

## Ingestion: `POST /api/analytics/track`

- Body: `{ event, sessionId, deviceType, path, meta? }`, validated by a new `lib/schemas/analytics.ts` zod schema. `event` is one of the 13 client-postable names (everything in the table above except `purchase`); posting `purchase` here is a 422, not silently accepted.
- `sessionId`: 8-64 characters. `path`: max 256 characters. `meta`: at most 10 keys, each value a string/number/boolean under 500 characters — enough for "which product" without becoming a free-text sink.
- Rate limited via the existing `lib/server/rateLimit.ts` (from the welcome-email work): 60 events/minute per IP. Generous — a real exploration session fires a couple dozen events at most — but stops a single runaway script from flooding the table.
- A short, explicitly-not-airtight bot filter: reject (204, no insert) when the `User-Agent` matches a small list of obvious crawlers (`googlebot`, `bingbot`, `ahrefsbot`, `semrushbot`, `curl`, `python-requests`, etc.). This is a courtesy filter, not a security boundary — sophisticated bots will still get counted, and that's an accepted limitation for v1.
- Always responds fast (204 on success, 422/429 on rejection) and never throws in a way that could surface to the page. Analytics failing must never break the site — same rule `sendEmail` already follows for mail.
- Writes with the service-role client, same as every other write in this app.

## Client (`lib/analytics.ts`)

```typescript
export type AnalyticsEvent =
  | 'click_to_start' | 'inventory_shortcut' | 'npc_interaction' | 'karl_interaction'
  | 'vinyl_interaction' | 'basement_discovered' | 'inventory_view' | 'basement_view'
  | 'product_click_inventory' | 'product_click_basement' | 'add_to_cart' | 'checkout_started'
  // 'purchase' is deliberately absent — server-only, see the webhook.

export function track(event: AnalyticsEvent, meta?: Record<string, unknown>): void
export function getAnalyticsSessionId(): string // for checkout.ts to attach to the Stripe session
```

`track()` is fire-and-forget: it never returns a promise the caller awaits, never throws, and does nothing on the server (`typeof window === 'undefined'` guard) — pages that call it don't need to know or care whether it worked.

## Admin: real aggregates

`lib/admin/analytics.repo.ts`, following the existing `orders.repo.ts` pattern (`isDatabaseConfigured()` guard, fails soft), calling a handful of new Postgres functions (matching the existing `next_order_number()` / `decrement_variant_stock()` RPC pattern — aggregation belongs in the database, not by pulling every raw event row into Node):

- `analytics_visitors_by_day(days int)` → `(date, visitors, page_views)`. `visitors` = distinct `session_id` that day; `page_views` = row count of `inventory_view`/`basement_view`/`product_click_inventory`/`product_click_basement` that day. Replaces `TRAFFIC_30D`.
- `analytics_top_pages(days int, limit_n int)` → `(path, views)`, grouped on the `path` column. Replaces `TOP_PAGES`.
- `analytics_device_split(days int)` → `(device_type, sessions)`, distinct sessions per device. Replaces `DEVICE_SPLIT`.
- `analytics_funnel(days int)` → `(event, sessions)` for all 13 real events, distinct sessions per event. Powers the new Funnel page.

`app/office-scr1pts-x7k2/page.tsx` and `components/admin/metrics/VisitorsMetric.tsx` swap their `mockTraffic` imports for this repo. `lib/admin/mockTraffic.ts` is deleted once nothing imports it.

## New admin page: Funnel

`app/office-scr1pts-x7k2/funnel/page.tsx`, added to `Sidebar.tsx`'s `NAV` array. Shows the 13 events in the order a visitor actually hits them (arrival → exploration → Basement → purchase) as a step list: each step's distinct-session count, and its conversion percentage from the previous step. Reuses the existing 7/14/30-day range toggle pattern from `MetricShell`.

## Privacy Policy

One line changes in `app/privacy/page.tsx`'s "Cookies & website technology" section: replace "If we introduce additional analytics..." with a short, accurate description — anonymous, first-party, no ads, no PII, used only to understand which parts of the site and game people actually use.

## Out of scope

- Third-party analytics (PostHog/GA4/Vercel Analytics) — explicitly rejected in favour of self-hosting.
- Session replay, heatmaps, or anything beyond named-event counts.
- Retention/deletion policy for old event rows — fine to leave unbounded for now given expected volume; worth revisiting if the table grows large.
- A consent banner — explicitly decided against for v1.
- Historical backfill — the dashboard starts from zero on ship day; there is no real historical traffic data to import.

## Testing

- Unit: the zod schema (rejects `purchase`, oversized `meta`, bad `event` names), the bot-filter regex, `getAnalyticsSessionId()` (creates once, persists, format), the funnel/visitor aggregation shapes against a fixture set of rows (via a fake Supabase client, matching the pattern used in `__tests__/newsletterRepo.test.ts`).
- Route tests: rate limiting, malformed bodies, the `purchase` rejection.
- Manual: walk the real funnel in a browser (start → explore → find Basement → add to cart → checkout → pay in Stripe test mode) and confirm every step shows up in the new Funnel page with the right session linkage through to `purchase`.
