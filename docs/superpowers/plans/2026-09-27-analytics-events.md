# Live Back-Office Stats: Event Tracking + Funnel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fake `lib/admin/mockTraffic.ts` dataset with real visitor/traffic numbers, and add a full 13-step funnel (arrival → exploration → Basement discovery → purchase) to the back office, backed by a new self-hosted `analytics_events` table.

**Architecture:** A tiny fire-and-forget client tracker (`lib/analytics.ts`) posts named events to a public ingestion route, which validates, rate-limits and inserts them via the service-role Supabase client — the same "server is the only writer that matters" shape the app already uses for orders. `purchase` is the one event written server-side only, from the Stripe webhook, linked back to its session via Stripe metadata (mirroring how `variant_id` already rides along per line item). The admin reads aggregates through four Postgres functions (matching the existing `next_order_number()`/`decrement_variant_stock()` RPC pattern), exposed through one admin-gated route and one shared client hook.

**Tech Stack:** Next.js 15 API routes, Supabase/Postgres (RPC aggregate functions), Vitest.

**Spec:** `docs/superpowers/specs/2026-09-27-analytics-events-design.md`

## Global Constraints

- The 13 real events, in funnel order: `click_to_start`, `inventory_shortcut`, `npc_interaction`, `karl_interaction`, `vinyl_interaction`, `basement_discovered`, `inventory_view`, `basement_view`, `product_click_inventory`, `product_click_basement`, `add_to_cart`, `checkout_started`, `purchase`. `device_type` is a column on every row, never an event name.
- `purchase` may only be written by the Stripe webhook. The public ingestion route rejects it with 422.
- Every write goes through the service-role client. No RLS policies are added for `anon` — same rule as `orders`/`newsletter_signups`.
- The ingestion route never throws in a way that reaches the page: a tracking failure must never break the site, the same rule `sendEmail` already follows for mail.
- Rate limit: 60 events/minute per IP (reuses the limiter built in this plan — it does not yet exist on disk).
- Session id: a random id in `localStorage` under key `scripts-analytics-sid`, created on first `track()` call.
- No consent banner. The Privacy Policy's existing "if we introduce analytics" line gets a one-line update.

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/0007_analytics_events.sql` | The table, indexes, RLS (no public policies), and 4 read RPC functions |
| `lib/server/rateLimit.ts` | Per-key sliding-window limiter (shared infrastructure; also needed by the still-unbuilt welcome-email plan) |
| `lib/analyticsEvents.ts` | The single TS source of truth for the 13 event names and their funnel order |
| `lib/analytics.ts` | Client tracker: `track()`, `getAnalyticsSessionId()` |
| `lib/schemas/analytics.ts` | zod schema for the ingestion route's body |
| `lib/server/botFilter.ts` | The courtesy bot-User-Agent check |
| `lib/server/analytics.repo.ts` | `recordEvent()` (write) and `getAnalyticsBundle()` (the 4 aggregate reads) |
| `app/api/analytics/track/route.ts` | Public ingestion endpoint |
| `app/page.tsx` | Wire `click_to_start`, `inventory_shortcut`, `npc_interaction`, `karl_interaction`, `vinyl_interaction`, `basement_discovered` |
| `components/TrackPageView.tsx` | Tiny client component that fires one event on mount — lets the server-component inventory/basement pages track a view |
| `app/inventory/page.tsx`, `app/basement/page.tsx` | Render `TrackPageView` |
| `components/ProductCard.tsx` | Fire `product_click_inventory`/`product_click_basement` |
| `lib/cart.tsx` | Fire `add_to_cart` |
| `lib/checkout.ts` | Fire `checkout_started`, send `analyticsSessionId` to the session route |
| `lib/schemas/product.ts` | New `checkoutSessionSchema` (extends `cartResolveSchema` with `analyticsSessionId`) |
| `app/api/checkout/session/route.ts` | Read `analyticsSessionId`, put it in Stripe session metadata |
| `app/api/webhooks/stripe/route.ts` | Read the metadata back, record the `purchase` event |
| `app/api/admin/analytics/route.ts` | Admin-gated GET returning the full bundle |
| `lib/admin/useAnalytics.ts` | Shared client hook: fetch-on-range-change, loading/error state |
| `app/office-scr1pts-x7k2/page.tsx` | Swap `TRAFFIC_30D` for the real bundle |
| `components/admin/metrics/VisitorsMetric.tsx` | Swap mock traffic/top-pages/device-split for the real bundle; top pages and device split become properly range-scoped instead of the old `rangeShare` scaling hack |
| `app/office-scr1pts-x7k2/funnel/page.tsx` | New funnel step-list page |
| `components/admin/Sidebar.tsx` | Add the Funnel nav entry |
| `lib/admin/mockTraffic.ts` | Deleted once nothing imports it |
| `app/privacy/page.tsx` | One line of copy |

---

## Task 1: Migration — table + aggregate functions

**Files:**
- Create: `supabase/migrations/0007_analytics_events.sql`
- Test: manual, applied to a real Supabase project.

- [ ] **Step 1: Write the migration**

```sql
-- 0007_analytics_events.sql
--
-- Self-hosted event tracking for the back office's funnel and traffic
-- numbers. Every write goes through the service-role client — same rule as
-- orders and newsletter_signups — so there are no public RLS policies here.

create table if not exists analytics_events (
  id           bigint generated always as identity primary key,
  session_id   text,                    -- null only for pre-metadata purchase rows
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
-- No public policies: reads and writes both go through the service-role
-- client (the /api/analytics/track route for writes, the admin route for
-- reads). The anon key can neither read nor write this table.

-- ── Reads (admin only) ──────────────────────────────────────────────────────

-- Fixed-length daily series so the admin can slice "current window" and
-- "previous window" out of one array client-side, exactly the way the old
-- mock TRAFFIC_30D array was sliced. Always called with a wide lookback
-- (60 days) regardless of which range the UI has selected.
create or replace function analytics_visitors_by_day(p_days int)
returns table(day date, visitors bigint, page_views bigint)
language sql stable as $$
  with days as (
    select generate_series(current_date - (p_days - 1), current_date, interval '1 day')::date as day
  ),
  daily as (
    select
      created_at::date as day,
      count(distinct session_id) as visitors,
      count(*) filter (
        where event in ('inventory_view', 'basement_view', 'product_click_inventory', 'product_click_basement')
      ) as page_views
    from analytics_events
    where created_at >= current_date - (p_days - 1)
    group by created_at::date
  )
  select days.day, coalesce(daily.visitors, 0), coalesce(daily.page_views, 0)
  from days
  left join daily using (day)
  order by days.day;
$$;

create or replace function analytics_top_pages(p_days int, p_limit int default 5)
returns table(path text, views bigint)
language sql stable as $$
  select path, count(*) as views
  from analytics_events
  where created_at >= current_date - (p_days - 1)
    and path is not null
  group by path
  order by views desc
  limit p_limit;
$$;

create or replace function analytics_device_split(p_days int)
returns table(device_type text, sessions bigint)
language sql stable as $$
  select device_type, count(distinct session_id) as sessions
  from analytics_events
  where created_at >= current_date - (p_days - 1)
    and device_type is not null
  group by device_type;
$$;

create or replace function analytics_funnel(p_days int)
returns table(event text, sessions bigint)
language sql stable as $$
  select event, count(distinct session_id) as sessions
  from analytics_events
  where created_at >= current_date - (p_days - 1)
  group by event;
$$;

grant execute on function analytics_visitors_by_day(int)      to service_role;
grant execute on function analytics_top_pages(int, int)       to service_role;
grant execute on function analytics_device_split(int)         to service_role;
grant execute on function analytics_funnel(int)                to service_role;
revoke execute on function analytics_visitors_by_day(int)      from anon, authenticated;
revoke execute on function analytics_top_pages(int, int)       from anon, authenticated;
revoke execute on function analytics_device_split(int)         from anon, authenticated;
revoke execute on function analytics_funnel(int)                from anon, authenticated;
```

- [ ] **Step 2: Apply it to a real Supabase project and confirm it's idempotent**

Run: `psql "$SUPABASE_DB_URL" -f supabase/migrations/0007_analytics_events.sql` (or the Supabase SQL editor), then run it again.
Expected: no error either time.

- [ ] **Step 3: Sanity-check the functions with a manual insert**

```sql
insert into analytics_events (session_id, event, path, device_type)
values ('test-session', 'inventory_view', '/inventory', 'mobile');

select * from analytics_visitors_by_day(7);
select * from analytics_funnel(7);

delete from analytics_events where session_id = 'test-session';
```

Expected: `analytics_visitors_by_day(7)` shows today with `visitors = 1, page_views = 1`; `analytics_funnel(7)` shows one row, `inventory_view` with `sessions = 1`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0007_analytics_events.sql
git commit -m "db: analytics_events table and aggregate read functions"
```

---

## Task 2: Rate limiter

**Files:**
- Create: `lib/server/rateLimit.ts`
- Create: `__tests__/rateLimit.test.ts`

**Interfaces:**
- Produces: `checkRateLimit(key: string, opts?: { limit?: number; windowMs?: number }): boolean`.
- Consumed by: Task 6 (`app/api/analytics/track/route.ts`).

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/rateLimit.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { checkRateLimit } from '@/lib/server/rateLimit'

describe('checkRateLimit', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('allows up to the limit, then refuses', () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit('1.2.3.4', { limit: 5, windowMs: 60_000 })).toBe(true)
    }
    expect(checkRateLimit('1.2.3.4', { limit: 5, windowMs: 60_000 })).toBe(false)
  })

  it('tracks keys independently', () => {
    for (let i = 0; i < 5; i++) checkRateLimit('a', { limit: 5, windowMs: 60_000 })
    expect(checkRateLimit('b', { limit: 5, windowMs: 60_000 })).toBe(true)
  })

  it('resets once the window has passed', () => {
    for (let i = 0; i < 5; i++) checkRateLimit('c', { limit: 5, windowMs: 1_000 })
    expect(checkRateLimit('c', { limit: 5, windowMs: 1_000 })).toBe(false)
    vi.advanceTimersByTime(1_001)
    expect(checkRateLimit('c', { limit: 5, windowMs: 1_000 })).toBe(true)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run __tests__/rateLimit.test.ts`
Expected: FAIL — `Cannot find module '@/lib/server/rateLimit'`

- [ ] **Step 3: Implement the limiter**

```typescript
// lib/server/rateLimit.ts
import 'server-only'

/**
 * A tiny in-memory, per-instance sliding-window limiter.
 *
 * This is not a distributed limiter — each serverless instance keeps its own
 * counts, so the real ceiling under load is `limit × concurrent instances`.
 * That is deliberate: nothing here has a shared store (Redis, etc.) to talk
 * to, and the goal is only to stop a single script hammering an endpoint from
 * one connection, not to enforce an exact global quota.
 */

interface Bucket {
  hits: number[]
}

const buckets = new Map<string, Bucket>()

export function checkRateLimit(
  key: string,
  { limit = 5, windowMs = 60_000 }: { limit?: number; windowMs?: number } = {},
): boolean {
  const now = Date.now()
  const bucket = buckets.get(key) ?? { hits: [] }
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs)

  if (bucket.hits.length >= limit) {
    buckets.set(key, bucket)
    return false
  }

  bucket.hits.push(now)
  buckets.set(key, bucket)
  return true
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run __tests__/rateLimit.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/server/rateLimit.ts __tests__/rateLimit.test.ts
git commit -m "feat: per-key rate limiter"
```

---

## Task 3: Shared event list + client tracker

**Files:**
- Create: `lib/analyticsEvents.ts`
- Create: `lib/analytics.ts`
- Create: `__tests__/analytics.test.ts`

**Interfaces:**
- Produces: `ANALYTICS_EVENTS: readonly string[]`, `type AnalyticsEventName`, `type ClientAnalyticsEvent` (from `lib/analyticsEvents.ts`); `track(event: ClientAnalyticsEvent, meta?: Record<string, string | number | boolean>): void`, `getAnalyticsSessionId(): string` (from `lib/analytics.ts`).
- Consumed by: every call site in Tasks 7-9; `lib/schemas/analytics.ts` (Task 4); `lib/server/analytics.repo.ts` (Task 5, for funnel ordering).

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/analytics.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { ANALYTICS_EVENTS } from '@/lib/analyticsEvents'

describe('ANALYTICS_EVENTS', () => {
  it('lists the 13 events in funnel order, with purchase last', () => {
    expect(ANALYTICS_EVENTS).toEqual([
      'click_to_start', 'inventory_shortcut', 'npc_interaction', 'karl_interaction',
      'vinyl_interaction', 'basement_discovered', 'inventory_view', 'basement_view',
      'product_click_inventory', 'product_click_basement', 'add_to_cart',
      'checkout_started', 'purchase',
    ])
  })
})

describe('track / getAnalyticsSessionId', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    window.localStorage.clear()
    fetchMock.mockReset().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('creates a session id once and persists it', async () => {
    const { getAnalyticsSessionId } = await import('@/lib/analytics')
    const first = getAnalyticsSessionId()
    const second = getAnalyticsSessionId()
    expect(first).toBe(second)
    expect(first.length).toBeGreaterThanOrEqual(8)
    expect(window.localStorage.getItem('scripts-analytics-sid')).toBe(first)
  })

  it('posts the event with sessionId, deviceType and path, using keepalive', async () => {
    const { track } = await import('@/lib/analytics')
    track('click_to_start')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/analytics/track',
      expect.objectContaining({
        method: 'POST',
        keepalive: true,
        body: expect.stringContaining('"event":"click_to_start"'),
      }),
    )
  })

  it('never throws, even if fetch rejects', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))
    const { track } = await import('@/lib/analytics')
    expect(() => track('add_to_cart')).not.toThrow()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run __tests__/analytics.test.ts`
Expected: FAIL — neither module exists yet

- [ ] **Step 3: Implement the shared event list**

```typescript
// lib/analyticsEvents.ts

/**
 * The 13 real events, in the order a visitor actually hits them: arrival,
 * exploration, Basement discovery, purchase. This is the single TypeScript
 * source of truth — the migration's CHECK constraint lists the same 13
 * strings and must be kept in sync by hand (see __tests__/analytics.test.ts's
 * drift-guard test).
 *
 * `device_type` is deliberately not here: the source event table listed it
 * as a 14th row, but "mobile vs desktop behaviour" only makes sense as a
 * property on every other event, not a thing that happens on its own — it's
 * a column on the row, not an event name.
 */
export const ANALYTICS_EVENTS = [
  'click_to_start',
  'inventory_shortcut',
  'npc_interaction',
  'karl_interaction',
  'vinyl_interaction',
  'basement_discovered',
  'inventory_view',
  'basement_view',
  'product_click_inventory',
  'product_click_basement',
  'add_to_cart',
  'checkout_started',
  'purchase',
] as const

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number]

/** Everything except 'purchase' — the only names the browser may post. */
export type ClientAnalyticsEvent = Exclude<AnalyticsEventName, 'purchase'>
```

- [ ] **Step 4: Implement the client tracker**

```typescript
// lib/analytics.ts
'use client'

import { ANALYTICS_EVENTS, type ClientAnalyticsEvent } from './analyticsEvents'

const SESSION_KEY = 'scripts-analytics-sid'

/** A random id, no PII, created once per browser and reused forever after. */
export function getAnalyticsSessionId(): string {
  if (typeof window === 'undefined') return 'server'
  try {
    const existing = window.localStorage.getItem(SESSION_KEY)
    if (existing) return existing
    const id = crypto.randomUUID()
    window.localStorage.setItem(SESSION_KEY, id)
    return id
  } catch {
    // Private browsing / storage blocked: a fresh id per call is still better
    // than throwing, and this call site never depends on it being stable.
    return crypto.randomUUID()
  }
}

/**
 * Fire-and-forget. Never awaited by callers, never throws, does nothing on
 * the server. A tracking failure must never break the page — same rule
 * sendEmail already follows for mail on the server side.
 */
export function track(event: ClientAnalyticsEvent, meta?: Record<string, string | number | boolean>): void {
  if (typeof window === 'undefined') return
  try {
    const body = JSON.stringify({
      event,
      sessionId: getAnalyticsSessionId(),
      deviceType: window.matchMedia('(max-width: 639px)').matches ? 'mobile' : 'desktop',
      path: window.location.pathname,
      meta,
    })
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Analytics must never break the page it's tracking.
  }
}

export { ANALYTICS_EVENTS }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run __tests__/analytics.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/analyticsEvents.ts lib/analytics.ts __tests__/analytics.test.ts
git commit -m "feat: shared event list and client tracker"
```

---

## Task 4: Ingestion schema + bot filter

**Files:**
- Create: `lib/schemas/analytics.ts`
- Create: `lib/server/botFilter.ts`
- Create: `__tests__/analyticsSchema.test.ts`
- Create: `__tests__/botFilter.test.ts`

**Interfaces:**
- Produces: `trackEventSchema` (zod, `lib/schemas/analytics.ts`); `isLikelyBot(userAgent: string | null): boolean` (`lib/server/botFilter.ts`).
- Consumed by: Task 6 (`app/api/analytics/track/route.ts`).

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/analyticsSchema.test.ts
import { describe, expect, it } from 'vitest'
import { trackEventSchema } from '@/lib/schemas/analytics'

describe('trackEventSchema', () => {
  it('accepts a well-formed client event', () => {
    const result = trackEventSchema.safeParse({
      event: 'click_to_start',
      sessionId: 'a-real-session-id',
      deviceType: 'mobile',
      path: '/',
    })
    expect(result.success).toBe(true)
  })

  it('rejects purchase — that name is server-only', () => {
    const result = trackEventSchema.safeParse({
      event: 'purchase',
      sessionId: 'a-real-session-id',
      deviceType: 'mobile',
      path: '/',
    })
    expect(result.success).toBe(false)
  })

  it('rejects an unknown event name', () => {
    const result = trackEventSchema.safeParse({
      event: 'made_up_event',
      sessionId: 'a-real-session-id',
      deviceType: 'mobile',
      path: '/',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a sessionId that is too short or too long', () => {
    expect(trackEventSchema.safeParse({ event: 'add_to_cart', sessionId: 'x', deviceType: 'mobile' }).success).toBe(false)
    expect(trackEventSchema.safeParse({ event: 'add_to_cart', sessionId: 'x'.repeat(65), deviceType: 'mobile' }).success).toBe(false)
  })

  it('rejects meta with more than 10 keys', () => {
    const meta = Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`k${i}`, 'v']))
    const result = trackEventSchema.safeParse({
      event: 'add_to_cart', sessionId: 'a-real-session-id', deviceType: 'mobile', meta,
    })
    expect(result.success).toBe(false)
  })

  it('accepts a missing path and missing meta', () => {
    const result = trackEventSchema.safeParse({ event: 'add_to_cart', sessionId: 'a-real-session-id', deviceType: 'desktop' })
    expect(result.success).toBe(true)
  })
})
```

```typescript
// __tests__/botFilter.test.ts
import { describe, expect, it } from 'vitest'
import { isLikelyBot } from '@/lib/server/botFilter'

describe('isLikelyBot', () => {
  it('flags common crawlers', () => {
    expect(isLikelyBot('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(true)
    expect(isLikelyBot('Mozilla/5.0 (compatible; bingbot/2.0)')).toBe(true)
    expect(isLikelyBot('AhrefsBot/7.0')).toBe(true)
    expect(isLikelyBot('SemrushBot/7~bl')).toBe(true)
    expect(isLikelyBot('curl/8.4.0')).toBe(true)
    expect(isLikelyBot('python-requests/2.31.0')).toBe(true)
  })

  it('does not flag an ordinary browser', () => {
    expect(isLikelyBot('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15')).toBe(false)
  })

  it('treats a missing User-Agent as not a bot (fails open, not closed)', () => {
    expect(isLikelyBot(null)).toBe(false)
  })
})
```

- [ ] **Step 2: Run both to verify they fail**

Run: `npx vitest run __tests__/analyticsSchema.test.ts __tests__/botFilter.test.ts`
Expected: FAIL — neither module exists yet

- [ ] **Step 3: Implement the schema**

```typescript
// lib/schemas/analytics.ts
import { z } from 'zod'
import { ANALYTICS_EVENTS } from '@/lib/analyticsEvents'

/** Every name except 'purchase' — see lib/analyticsEvents.ts. */
const CLIENT_EVENTS = ANALYTICS_EVENTS.filter((e) => e !== 'purchase') as Exclude<
  (typeof ANALYTICS_EVENTS)[number],
  'purchase'
>[]

export const trackEventSchema = z.object({
  event: z.enum(CLIENT_EVENTS as [string, ...string[]]),
  sessionId: z.string().min(8).max(64),
  deviceType: z.enum(['mobile', 'desktop']),
  path: z.string().max(256).optional(),
  meta: z.record(z.string(), z.union([z.string().max(500), z.number(), z.boolean()])).refine(
    (m) => Object.keys(m).length <= 10,
    { message: 'meta may have at most 10 keys' },
  ).optional(),
})

export type TrackEventInput = z.infer<typeof trackEventSchema>
```

- [ ] **Step 4: Implement the bot filter**

```typescript
// lib/server/botFilter.ts
import 'server-only'

/**
 * A courtesy filter, not a security boundary. Catches the obvious crawlers
 * and scripts so they don't skew the funnel numbers; a bot built to look like
 * a real browser sails straight through, and that's an accepted limitation.
 */
const BOT_PATTERN = /bot|crawl|spider|curl|wget|python-requests|headlesschrome|slurp|facebookexternalhit/i

export function isLikelyBot(userAgent: string | null): boolean {
  if (!userAgent) return false
  return BOT_PATTERN.test(userAgent)
}
```

- [ ] **Step 5: Run both tests to verify they pass**

Run: `npx vitest run __tests__/analyticsSchema.test.ts __tests__/botFilter.test.ts`
Expected: PASS (6 + 3 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/schemas/analytics.ts lib/server/botFilter.ts __tests__/analyticsSchema.test.ts __tests__/botFilter.test.ts
git commit -m "feat: analytics ingestion schema and bot filter"
```

---

## Task 5: Server repo — write + read aggregates

**Files:**
- Create: `lib/server/analytics.repo.ts`
- Create: `__tests__/analyticsRepo.test.ts`

**Interfaces:**
- Consumes: `serverClient()`, `isDatabaseConfigured()` (`lib/server/supabase.ts`); `AnalyticsEventName`, `ANALYTICS_EVENTS` (`lib/analyticsEvents.ts`).
- Produces:
  - `recordEvent(input: RecordEventInput): Promise<void>`
  - `getAnalyticsBundle(days: 7 | 14 | 30): Promise<AnalyticsBundle>`
  - `interface RecordEventInput { event: AnalyticsEventName; sessionId: string | null; deviceType: 'mobile' | 'desktop' | null; path: string | null; meta?: Record<string, unknown> }`
  - `interface AnalyticsBundle { visitorsByDay: { date: string; visitors: number; pageViews: number }[]; topPages: { path: string; views: number }[]; deviceSplit: { mobile: number; desktop: number }; funnel: { event: string; sessions: number }[] }`
- Consumed by: Task 6 (ingestion route writes), Task 10 (admin route reads).

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/analyticsRepo.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest'

const insert = vi.fn()
const rpc = vi.fn()

vi.mock('@/lib/server/supabase', () => ({
  isDatabaseConfigured: () => true,
  serverClient: () => ({
    from: () => ({ insert }),
    rpc,
  }),
}))

beforeEach(() => {
  insert.mockReset().mockResolvedValue({ error: null })
  rpc.mockReset()
})

describe('recordEvent', () => {
  it('inserts the row with all fields', async () => {
    const { recordEvent } = await import('@/lib/server/analytics.repo')
    await recordEvent({ event: 'add_to_cart', sessionId: 's1', deviceType: 'mobile', path: '/inventory', meta: { productId: 'p1' } })
    expect(insert).toHaveBeenCalledWith({
      session_id: 's1', event: 'add_to_cart', device_type: 'mobile', path: '/inventory', meta: { productId: 'p1' },
    })
  })

  it('defaults meta to an empty object', async () => {
    const { recordEvent } = await import('@/lib/server/analytics.repo')
    await recordEvent({ event: 'purchase', sessionId: null, deviceType: null, path: null })
    expect(insert).toHaveBeenCalledWith({
      session_id: null, event: 'purchase', device_type: null, path: null, meta: {},
    })
  })

  it('throws on a database error, so the caller can decide how to log it', async () => {
    insert.mockResolvedValue({ error: { message: 'boom' } })
    const { recordEvent } = await import('@/lib/server/analytics.repo')
    await expect(
      recordEvent({ event: 'add_to_cart', sessionId: 's1', deviceType: 'mobile', path: '/' }),
    ).rejects.toThrow('boom')
  })
})

describe('getAnalyticsBundle', () => {
  it('shapes the four RPC results, converting device split to percentages that sum to 100', async () => {
    rpc.mockImplementation((fn: string) => {
      if (fn === 'analytics_visitors_by_day') return Promise.resolve({ data: [{ day: '2026-09-27', visitors: 5, page_views: 12 }], error: null })
      if (fn === 'analytics_top_pages') return Promise.resolve({ data: [{ path: '/inventory', views: 20 }], error: null })
      if (fn === 'analytics_device_split') return Promise.resolve({ data: [{ device_type: 'mobile', sessions: 3 }, { device_type: 'desktop', sessions: 1 }], error: null })
      if (fn === 'analytics_funnel') return Promise.resolve({ data: [{ event: 'click_to_start', sessions: 10 }], error: null })
      throw new Error(`unexpected rpc ${fn}`)
    })
    const { getAnalyticsBundle } = await import('@/lib/server/analytics.repo')
    const bundle = await getAnalyticsBundle(14)
    expect(bundle.visitorsByDay).toEqual([{ date: '2026-09-27', visitors: 5, pageViews: 12 }])
    expect(bundle.topPages).toEqual([{ path: '/inventory', views: 20 }])
    expect(bundle.deviceSplit).toEqual({ mobile: 75, desktop: 25 })
    expect(bundle.funnel).toEqual([{ event: 'click_to_start', sessions: 10 }])
  })

  it('device split is 0/0 with no sessions, never NaN', async () => {
    rpc.mockImplementation((fn: string) => {
      if (fn === 'analytics_device_split') return Promise.resolve({ data: [], error: null })
      return Promise.resolve({ data: [], error: null })
    })
    const { getAnalyticsBundle } = await import('@/lib/server/analytics.repo')
    const bundle = await getAnalyticsBundle(7)
    expect(bundle.deviceSplit).toEqual({ mobile: 0, desktop: 0 })
  })

  it('calls the visitors RPC with a fixed 60-day lookback regardless of the requested range', async () => {
    rpc.mockResolvedValue({ data: [], error: null })
    const { getAnalyticsBundle } = await import('@/lib/server/analytics.repo')
    await getAnalyticsBundle(7)
    expect(rpc).toHaveBeenCalledWith('analytics_visitors_by_day', { p_days: 60 })
    expect(rpc).toHaveBeenCalledWith('analytics_top_pages', { p_days: 7, p_limit: 5 })
    expect(rpc).toHaveBeenCalledWith('analytics_device_split', { p_days: 7 })
    expect(rpc).toHaveBeenCalledWith('analytics_funnel', { p_days: 7 })
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run __tests__/analyticsRepo.test.ts`
Expected: FAIL — `Cannot find module '@/lib/server/analytics.repo'`

- [ ] **Step 3: Implement the repo**

```typescript
// lib/server/analytics.repo.ts
import 'server-only'

import { isDatabaseConfigured, serverClient } from './supabase'
import type { AnalyticsEventName } from '@/lib/analyticsEvents'

// ── Writes ────────────────────────────────────────────────────────────────

export interface RecordEventInput {
  event: AnalyticsEventName
  sessionId: string | null
  deviceType: 'mobile' | 'desktop' | null
  path: string | null
  meta?: Record<string, unknown>
}

export async function recordEvent(input: RecordEventInput): Promise<void> {
  if (!isDatabaseConfigured()) return

  const { error } = await serverClient().from('analytics_events').insert({
    session_id: input.sessionId,
    event: input.event,
    device_type: input.deviceType,
    path: input.path,
    meta: input.meta ?? {},
  })
  if (error) throw new Error(`recordEvent(${input.event}): ${error.message}`)
}

// ── Reads (admin only) ───────────────────────────────────────────────────

export interface AnalyticsBundle {
  visitorsByDay: { date: string; visitors: number; pageViews: number }[]
  topPages: { path: string; views: number }[]
  deviceSplit: { mobile: number; desktop: number }
  funnel: { event: string; sessions: number }[]
}

/** Always a fixed lookback, so the admin can slice "current" vs "previous"
 *  windows out of one array client-side — the same trick the old mock
 *  TRAFFIC_30D array supported. */
const VISITOR_LOOKBACK_DAYS = 60

function emptyBundle(): AnalyticsBundle {
  return { visitorsByDay: [], topPages: [], deviceSplit: { mobile: 0, desktop: 0 }, funnel: [] }
}

export async function getAnalyticsBundle(days: 7 | 14 | 30): Promise<AnalyticsBundle> {
  if (!isDatabaseConfigured()) return emptyBundle()

  const db = serverClient()
  const [visitorsRes, pagesRes, deviceRes, funnelRes] = await Promise.all([
    db.rpc('analytics_visitors_by_day', { p_days: VISITOR_LOOKBACK_DAYS }),
    db.rpc('analytics_top_pages', { p_days: days, p_limit: 5 }),
    db.rpc('analytics_device_split', { p_days: days }),
    db.rpc('analytics_funnel', { p_days: days }),
  ])
  if (visitorsRes.error) throw new Error(`analytics_visitors_by_day: ${visitorsRes.error.message}`)
  if (pagesRes.error) throw new Error(`analytics_top_pages: ${pagesRes.error.message}`)
  if (deviceRes.error) throw new Error(`analytics_device_split: ${deviceRes.error.message}`)
  if (funnelRes.error) throw new Error(`analytics_funnel: ${funnelRes.error.message}`)

  const visitorsByDay = (visitorsRes.data as { day: string; visitors: number; page_views: number }[]).map((d) => ({
    date: d.day,
    visitors: d.visitors,
    pageViews: d.page_views,
  }))

  const deviceRows = deviceRes.data as { device_type: 'mobile' | 'desktop'; sessions: number }[]
  const mobileSessions = deviceRows.find((d) => d.device_type === 'mobile')?.sessions ?? 0
  const desktopSessions = deviceRows.find((d) => d.device_type === 'desktop')?.sessions ?? 0
  const totalSessions = mobileSessions + desktopSessions
  // Desktop is 100 - mobile, not its own rounded percentage, so the two
  // always sum to exactly 100 (matching the old DEVICE_SPLIT contract).
  const mobilePct = totalSessions > 0 ? Math.round((mobileSessions / totalSessions) * 100) : 0
  const deviceSplit = { mobile: mobilePct, desktop: totalSessions > 0 ? 100 - mobilePct : 0 }

  return {
    visitorsByDay,
    topPages: pagesRes.data as { path: string; views: number }[],
    deviceSplit,
    funnel: funnelRes.data as { event: string; sessions: number }[],
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run __tests__/analyticsRepo.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/server/analytics.repo.ts __tests__/analyticsRepo.test.ts
git commit -m "feat: analytics repo — record events, read aggregates"
```

---

## Task 6: Public ingestion route

**Files:**
- Create: `app/api/analytics/track/route.ts`
- Create: `__tests__/analyticsTrackRoute.test.ts`

**Interfaces:**
- Consumes: `checkRateLimit` (Task 2), `trackEventSchema` (Task 4), `isLikelyBot` (Task 4), `recordEvent` (Task 5), `isDatabaseConfigured` (existing).
- Produces: the route's behaviour — 204 on success or a filtered bot, 422 on a bad body (including `purchase`), 429 when rate limited.

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/analyticsTrackRoute.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest'

const recordEvent = vi.fn()

vi.mock('@/lib/server/supabase', () => ({ isDatabaseConfigured: () => true }))
vi.mock('@/lib/server/analytics.repo', () => ({ recordEvent }))

function req(body: unknown, opts: { ip?: string; ua?: string } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (opts.ip) headers['x-forwarded-for'] = opts.ip
  if (opts.ua) headers['user-agent'] = opts.ua
  return new Request('http://localhost/api/analytics/track', { method: 'POST', headers, body: JSON.stringify(body) })
}

const validBody = { event: 'click_to_start', sessionId: 'a-real-session-id', deviceType: 'mobile', path: '/' }

beforeEach(() => {
  recordEvent.mockReset().mockResolvedValue(undefined)
})

describe('POST /api/analytics/track', () => {
  it('records a valid event and returns 204', async () => {
    const { POST } = await import('@/app/api/analytics/track/route')
    const res = await POST(req(validBody, { ip: '1.1.1.1' }))
    expect(res.status).toBe(204)
    expect(recordEvent).toHaveBeenCalledWith({
      event: 'click_to_start', sessionId: 'a-real-session-id', deviceType: 'mobile', path: '/', meta: undefined,
    })
  })

  it('rejects purchase with 422 and never records it', async () => {
    const { POST } = await import('@/app/api/analytics/track/route')
    const res = await POST(req({ ...validBody, event: 'purchase' }, { ip: '2.2.2.2' }))
    expect(res.status).toBe(422)
    expect(recordEvent).not.toHaveBeenCalled()
  })

  it('rejects a malformed body with 422', async () => {
    const { POST } = await import('@/app/api/analytics/track/route')
    const res = await POST(req({ event: 'not-a-real-event' }, { ip: '3.3.3.3' }))
    expect(res.status).toBe(422)
  })

  it('204s a known bot without recording it', async () => {
    const { POST } = await import('@/app/api/analytics/track/route')
    const res = await POST(req(validBody, { ip: '4.4.4.4', ua: 'Googlebot/2.1' }))
    expect(res.status).toBe(204)
    expect(recordEvent).not.toHaveBeenCalled()
  })

  it('rate limits the 61st request from one IP within a minute', async () => {
    const { POST } = await import('@/app/api/analytics/track/route')
    for (let i = 0; i < 60; i++) {
      const res = await POST(req(validBody, { ip: '5.5.5.5' }))
      expect(res.status).toBe(204)
    }
    const res = await POST(req(validBody, { ip: '5.5.5.5' }))
    expect(res.status).toBe(429)
  })

  it('never lets a repo failure throw past the route', async () => {
    recordEvent.mockRejectedValue(new Error('db down'))
    const { POST } = await import('@/app/api/analytics/track/route')
    const res = await POST(req(validBody, { ip: '6.6.6.6' }))
    expect(res.status).toBe(204)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run __tests__/analyticsTrackRoute.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/analytics/track/route'`

- [ ] **Step 3: Implement the route**

```typescript
// app/api/analytics/track/route.ts
import { fail } from '@/lib/server/http'
import { isDatabaseConfigured } from '@/lib/server/supabase'
import { trackEventSchema } from '@/lib/schemas/analytics'
import { checkRateLimit } from '@/lib/server/rateLimit'
import { isLikelyBot } from '@/lib/server/botFilter'
import { recordEvent } from '@/lib/server/analytics.repo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

/**
 * POST — one funnel event. Always resolves fast and never throws in a way
 * that reaches the page: a tracking gap is fine, a broken site is not.
 */
export async function POST(req: Request) {
  if (!isDatabaseConfigured()) return new Response(null, { status: 204 })

  if (isLikelyBot(req.headers.get('user-agent'))) {
    return new Response(null, { status: 204 })
  }

  if (!checkRateLimit(`analytics:${clientIp(req)}`, { limit: 60, windowMs: 60_000 })) {
    return fail(429, 'Too many events.')
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail(400, 'Expected a JSON body.')
  }

  const parsed = trackEventSchema.safeParse(body)
  if (!parsed.success) return fail(422, 'That event is not valid.', parsed.error.flatten())

  try {
    await recordEvent({
      event: parsed.data.event,
      sessionId: parsed.data.sessionId,
      deviceType: parsed.data.deviceType,
      path: parsed.data.path ?? null,
      meta: parsed.data.meta,
    })
  } catch (err) {
    // A tracking failure must never surface to the visitor.
    console.error('[analytics] recordEvent failed:', err)
  }

  return new Response(null, { status: 204 })
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run __tests__/analyticsTrackRoute.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/analytics/track/route.ts __tests__/analyticsTrackRoute.test.ts
git commit -m "feat: public analytics ingestion route"
```

---

## Task 7: Wire the game-world events

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `track` (Task 3).
- No exports — this task only adds call sites.

- [ ] **Step 1: Import `track`**

Near the top of `app/page.tsx`, alongside the other imports:

```typescript
import { track } from "@/lib/analytics";
```

- [ ] **Step 2: `click_to_start`**

Find:
```typescript
<StartScreen mobile={mobile} loading={started} onStart={() => setStarted(true)} />
```

Replace with:
```typescript
<StartScreen mobile={mobile} loading={started} onStart={() => { track('click_to_start'); setStarted(true); }} />
```

- [ ] **Step 3: `inventory_shortcut`**

Find:
```typescript
onInventory={() => leaveTo("/inventory")}
```

Replace with:
```typescript
onInventory={() => {
  if (!started) track('inventory_shortcut');
  leaveTo("/inventory");
}}
```

- [ ] **Step 4: `npc_interaction`, `karl_interaction`, `vinyl_interaction`, `basement_discovered`**

Inside `interactionRef.current = (hit) => { ... }`, find the very top of the function body:

```typescript
  interactionRef.current = (hit) => {
    setSpeakerPos(null);
    // The vinyl deck is the secret switch: first play reveals the hidden
    // basement entrance; afterwards it's just an idle line.
    if (hit.id === "vinyl") {
      music.setTrack(music.track === "grime" ? "lofi" : "grime");
      const revealed = gameSession.revealed.has("basement-entrance");
```

Replace with:

```typescript
  interactionRef.current = (hit) => {
    setSpeakerPos(null);
    if (hit.type === "npc") track('npc_interaction');
    if (hit.id === "karl") track('karl_interaction');
    // The vinyl deck is the secret switch: first play reveals the hidden
    // basement entrance; afterwards it's just an idle line.
    if (hit.id === "vinyl") {
      track('vinyl_interaction');
      music.setTrack(music.track === "grime" ? "lofi" : "grime");
      const revealed = gameSession.revealed.has("basement-entrance");
      if (!revealed) track('basement_discovered');
```

Note: the `if (!revealed) track('basement_discovered');` line sits just before this existing block, which must stay exactly as it was:

```typescript
      setSel("yes");
      setPage(0);
      if (!revealed) {
        gameRef.current?.events.emit("reveal", "basement-entrance");
        setPrompt(
```

So the full edited region reads:

```typescript
    if (hit.id === "vinyl") {
      track('vinyl_interaction');
      music.setTrack(music.track === "grime" ? "lofi" : "grime");
      const revealed = gameSession.revealed.has("basement-entrance");
      if (!revealed) track('basement_discovered');
      setSel("yes");
      setPage(0);
      if (!revealed) {
        gameRef.current?.events.emit("reveal", "basement-entrance");
        setPrompt(
          materialize({
            variant: "message",
            pages: [
              "You thumb through a crate of records…",
              "One sticks. You pull it — and a panel by the wall slides aside.",
            ],
          }),
        );
```

- [ ] **Step 5: Typecheck and run the full suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: both PASS. No test exercises `app/page.tsx` directly (it never has — this is a client component with heavy game/DOM dependencies and no existing render-test harness, consistent with how the earlier GameBoyShell status-bar fix was verified by browser screenshot rather than a unit test).

- [ ] **Step 6: Verify manually**

Run: `npm run dev`, open the browser network tab, click Start — confirm a `POST /api/analytics/track` with `event: "click_to_start"`. Talk to any NPC — confirm `npc_interaction`; talk to Karl specifically — confirm both `npc_interaction` and `karl_interaction` fire. Touch the vinyl deck for the first time — confirm `vinyl_interaction` and `basement_discovered` both fire; touch it again — confirm only `vinyl_interaction` fires the second time. From the start screen (before pressing Start), press the INVENTORY shell button — confirm `inventory_shortcut` fires.

- [ ] **Step 7: Commit**

```bash
git add app/page.tsx
git commit -m "feat: track the game-world funnel events"
```

---

## Task 8: Wire page views and product clicks

**Files:**
- Create: `components/TrackPageView.tsx`
- Modify: `app/inventory/page.tsx`
- Modify: `app/basement/page.tsx`
- Modify: `components/ProductCard.tsx`

**Interfaces:**
- Consumes: `track` (Task 3), `ClientAnalyticsEvent` (Task 3).
- Produces: `TrackPageView({ event }: { event: 'inventory_view' | 'basement_view' }): null` — a tiny client component a server-component page can render to fire one event on mount.

- [ ] **Step 1: Implement `TrackPageView`**

```tsx
// components/TrackPageView.tsx
'use client'

import { useEffect } from 'react'
import { track } from '@/lib/analytics'

/**
 * The inventory/basement pages are server components (they fetch the catalog
 * server-side), so they can't call the client-only `track()` themselves.
 * This is the bridge: render it once, it fires on mount, it renders nothing.
 */
export default function TrackPageView({ event }: { event: 'inventory_view' | 'basement_view' }) {
  useEffect(() => {
    track(event)
  }, [event])
  return null
}
```

- [ ] **Step 2: Fire `inventory_view`**

In `app/inventory/page.tsx`, add the import:

```typescript
import TrackPageView from '@/components/TrackPageView'
```

Find:
```tsx
    <div className="min-h-screen bg-white text-[#0d0d0d] flex flex-col">
      <PageEdgeArt
```

Replace with:
```tsx
    <div className="min-h-screen bg-white text-[#0d0d0d] flex flex-col">
      <TrackPageView event="inventory_view" />
      <PageEdgeArt
```

- [ ] **Step 3: Fire `basement_view`**

In `app/basement/page.tsx`, add the same import, then find:
```tsx
    <div className="min-h-screen bg-[#0d0d0d] text-[#f7f7f5] flex flex-col">
      <PageEdgeArt
```

Replace with:
```tsx
    <div className="min-h-screen bg-[#0d0d0d] text-[#f7f7f5] flex flex-col">
      <TrackPageView event="basement_view" />
      <PageEdgeArt
```

- [ ] **Step 4: Fire `product_click_inventory` / `product_click_basement`**

In `components/ProductCard.tsx`, add the import:

```typescript
import { track } from '@/lib/analytics'
```

Find:
```tsx
    <Link
      href={`/products/${product.slug}`}
      className="block w-full"
      onPointerEnter={() => setFlipped(true)}
      onPointerLeave={() => setFlipped(false)}
    >
```

Replace with:
```tsx
    <Link
      href={`/products/${product.slug}`}
      className="block w-full"
      onPointerEnter={() => setFlipped(true)}
      onPointerLeave={() => setFlipped(false)}
      onClick={() => track(theme === 'light' ? 'product_click_inventory' : 'product_click_basement', { productId: product.id })}
    >
```

- [ ] **Step 5: Typecheck and run the full suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: both PASS.

- [ ] **Step 6: Verify manually**

Run: `npm run dev`. Visit `/inventory` — confirm `inventory_view` fires once. Click a product card there — confirm `product_click_inventory` with the product id in `meta`. Repeat on `/basement` and confirm `basement_view` / `product_click_basement`.

- [ ] **Step 7: Commit**

```bash
git add components/TrackPageView.tsx app/inventory/page.tsx app/basement/page.tsx components/ProductCard.tsx
git commit -m "feat: track page views and product clicks"
```

---

## Task 9: Wire cart, checkout and purchase

**Files:**
- Modify: `lib/cart.tsx`
- Modify: `lib/checkout.ts`
- Modify: `lib/schemas/product.ts`
- Modify: `app/api/checkout/session/route.ts`
- Modify: `app/api/webhooks/stripe/route.ts`
- Create: `__tests__/checkoutAnalytics.test.ts`

**Interfaces:**
- Consumes: `track`, `getAnalyticsSessionId` (Task 3), `recordEvent` (Task 5).
- Produces: `checkoutSessionSchema` (`lib/schemas/product.ts`) — extends `cartResolveSchema` with an optional `analyticsSessionId`.

- [ ] **Step 1: `add_to_cart`**

In `lib/cart.tsx`, add the import at the top:

```typescript
import { track } from '@/lib/analytics'
```

Find:
```typescript
  const add = useCallback((product: Product, variant: ProductVariant) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.variant.id === variant.id)
      if (existing) {
        return prev.map((i) =>
          i.variant.id === variant.id
            ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + 1) }
            : i
        )
      }
      return [...prev, { product, variant, quantity: 1 }]
    })
  }, [])
```

Replace with:
```typescript
  const add = useCallback((product: Product, variant: ProductVariant) => {
    track('add_to_cart', { productId: product.id, variantId: variant.id })
    setItems((prev) => {
      const existing = prev.find((i) => i.variant.id === variant.id)
      if (existing) {
        return prev.map((i) =>
          i.variant.id === variant.id
            ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + 1) }
            : i
        )
      }
      return [...prev, { product, variant, quantity: 1 }]
    })
  }, [])
```

- [ ] **Step 2: Add `checkoutSessionSchema`**

In `lib/schemas/product.ts`, find `cartResolveSchema`'s closing:

```typescript
export const cartResolveSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.string().min(1),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .max(100),
})
```

Directly after it, add:

```typescript
/** POST /api/checkout/session — the cart, plus the visitor's analytics session
 *  so a purchase can be linked back to the funnel that led to it. */
export const checkoutSessionSchema = cartResolveSchema.extend({
  analyticsSessionId: z.string().min(8).max(64).optional(),
})
```

- [ ] **Step 3: `checkout_started`, and send the analytics session id**

In `lib/checkout.ts`, add the import:

```typescript
import { getAnalyticsSessionId, track } from '@/lib/analytics'
```

Find:
```typescript
  const start = useCallback(async (items: CartItem[]) => {
    if (busy || !items.length) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ variantId: i.variant.id, quantity: i.quantity })),
        }),
      })
```

Replace with:
```typescript
  const start = useCallback(async (items: CartItem[]) => {
    if (busy || !items.length) return
    setBusy(true)
    setError(null)
    track('checkout_started')
    try {
      const res = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ variantId: i.variant.id, quantity: i.quantity })),
          analyticsSessionId: getAnalyticsSessionId(),
        }),
      })
```

- [ ] **Step 4: Read the analytics session id in the checkout route, put it in Stripe metadata**

In `app/api/checkout/session/route.ts`, change the import:

```typescript
import { cartResolveSchema } from '@/lib/schemas/product'
```
to:
```typescript
import { checkoutSessionSchema } from '@/lib/schemas/product'
```

Find:
```typescript
  const parsed = cartResolveSchema.safeParse(body)
  if (!parsed.success) return fail(422, 'That cart is not valid.', parsed.error.flatten())
```

Replace with:
```typescript
  const parsed = checkoutSessionSchema.safeParse(body)
  if (!parsed.success) return fail(422, 'That cart is not valid.', parsed.error.flatten())
```

Find:
```typescript
  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/cart`,
```

Replace with:
```typescript
  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/cart`,
    // Carries the visitor's analytics session id through to the webhook, so a
    // purchase event can be linked back to the funnel that led to it.
    metadata: parsed.data.analyticsSessionId ? { analytics_session_id: parsed.data.analyticsSessionId } : undefined,
```

- [ ] **Step 5: Record `purchase` from the webhook**

In `app/api/webhooks/stripe/route.ts`, add the import:

```typescript
import { recordEvent } from '@/lib/server/analytics.repo'
```

Find:
```typescript
    // Only a genuinely new order earns an email. Stripe redelivers, and a
    // retry must not tell the customer twice. Awaited rather than fired and
    // forgotten: a serverless function can be frozen the moment it responds.
    // sendEmail never throws — a mail failure must not cost a paid order.
    if (created) {
      // Heath's wording from the back office; falls back to the defaults.
      const copy = await getCopy('order_confirmation')
      const result = await sendEmail(orderConfirmationEmail(order, copy))
      if (!result.sent) {
        console.error(`[order ${order.id}] confirmation not sent: ${result.reason}`)
      }
    }
```

Replace with:
```typescript
    // Only a genuinely new order earns an email or an analytics event. Stripe
    // redelivers, and a retry must not tell the customer twice or double-count
    // a conversion. Awaited rather than fired and forgotten: a serverless
    // function can be frozen the moment it responds. sendEmail never throws —
    // a mail failure must not cost a paid order, and the same rule applies to
    // recordEvent below.
    if (created) {
      // Heath's wording from the back office; falls back to the defaults.
      const copy = await getCopy('order_confirmation')
      const result = await sendEmail(orderConfirmationEmail(order, copy))
      if (!result.sent) {
        console.error(`[order ${order.id}] confirmation not sent: ${result.reason}`)
      }

      try {
        await recordEvent({
          event: 'purchase',
          sessionId: (session.metadata?.analytics_session_id as string | undefined) ?? null,
          deviceType: null,
          path: null,
          meta: { orderId: order.id },
        })
      } catch (err) {
        console.error(`[order ${order.id}] purchase event not recorded:`, err)
      }
    }
```

- [ ] **Step 6: Write a focused test for the metadata plumbing**

```typescript
// __tests__/checkoutAnalytics.test.ts
import { describe, expect, it } from 'vitest'
import { checkoutSessionSchema } from '@/lib/schemas/product'

describe('checkoutSessionSchema', () => {
  it('accepts a cart with no analyticsSessionId (backward compatible)', () => {
    const result = checkoutSessionSchema.safeParse({ items: [{ variantId: 'v1', quantity: 1 }] })
    expect(result.success).toBe(true)
  })

  it('accepts a cart with an analyticsSessionId', () => {
    const result = checkoutSessionSchema.safeParse({
      items: [{ variantId: 'v1', quantity: 1 }],
      analyticsSessionId: 'a-real-session-id',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an analyticsSessionId that is too short', () => {
    const result = checkoutSessionSchema.safeParse({
      items: [{ variantId: 'v1', quantity: 1 }],
      analyticsSessionId: 'x',
    })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 7: Run the new test, then the full suite and typecheck**

Run: `npx vitest run __tests__/checkoutAnalytics.test.ts && npx tsc --noEmit && npx vitest run`
Expected: all PASS.

- [ ] **Step 8: Verify manually in Stripe test mode**

Add an item (confirm `add_to_cart` fires with the product/variant id in `meta`), go to checkout (confirm `checkout_started` fires and the POST to `/api/checkout/session` includes `analyticsSessionId`), pay with `4242 4242 4242 4242`. In Supabase, confirm a `purchase` row exists with `session_id` matching the browser's `scripts-analytics-sid` value (check `localStorage` in dev tools) and `meta.orderId` matching the order.

- [ ] **Step 9: Commit**

```bash
git add lib/cart.tsx lib/checkout.ts lib/schemas/product.ts app/api/checkout/session/route.ts app/api/webhooks/stripe/route.ts __tests__/checkoutAnalytics.test.ts
git commit -m "feat: track add-to-cart and checkout; record purchase from the webhook"
```

---

## Task 10: Admin read route + shared hook

**Files:**
- Create: `app/api/admin/analytics/route.ts`
- Create: `lib/admin/useAnalytics.ts`
- Create: `__tests__/adminAnalyticsRoute.test.ts`

**Interfaces:**
- Consumes: `requireAdmin` (existing, `lib/server/auth.ts`), `getAnalyticsBundle` (Task 5).
- Produces: `GET /api/admin/analytics?days=7|14|30` → `AnalyticsBundle`; `useAnalytics(days: 7 | 14 | 30): { bundle: AnalyticsBundle | null; loading: boolean }`.

- [ ] **Step 1: Write the failing route test**

```typescript
// __tests__/adminAnalyticsRoute.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest'

const requireAdmin = vi.fn()
const getAnalyticsBundle = vi.fn()

vi.mock('@/lib/server/auth', () => ({ requireAdmin }))
vi.mock('@/lib/server/analytics.repo', () => ({ getAnalyticsBundle }))

beforeEach(() => {
  requireAdmin.mockReset().mockResolvedValue(null)
  getAnalyticsBundle.mockReset().mockResolvedValue({ visitorsByDay: [], topPages: [], deviceSplit: { mobile: 0, desktop: 0 }, funnel: [] })
})

describe('GET /api/admin/analytics', () => {
  it('is gated by requireAdmin', async () => {
    requireAdmin.mockResolvedValue(new Response(null, { status: 401 }))
    const { GET } = await import('@/app/api/admin/analytics/route')
    const res = await GET(new Request('http://localhost/api/admin/analytics?days=14'))
    expect(res.status).toBe(401)
    expect(getAnalyticsBundle).not.toHaveBeenCalled()
  })

  it('defaults to 14 days when no query param is given', async () => {
    const { GET } = await import('@/app/api/admin/analytics/route')
    await GET(new Request('http://localhost/api/admin/analytics'))
    expect(getAnalyticsBundle).toHaveBeenCalledWith(14)
  })

  it('passes through a valid days value', async () => {
    const { GET } = await import('@/app/api/admin/analytics/route')
    await GET(new Request('http://localhost/api/admin/analytics?days=30'))
    expect(getAnalyticsBundle).toHaveBeenCalledWith(30)
  })

  it('falls back to 14 for an invalid days value', async () => {
    const { GET } = await import('@/app/api/admin/analytics/route')
    await GET(new Request('http://localhost/api/admin/analytics?days=999'))
    expect(getAnalyticsBundle).toHaveBeenCalledWith(14)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run __tests__/adminAnalyticsRoute.test.ts`
Expected: FAIL — module doesn't exist

- [ ] **Step 3: Implement the route**

```typescript
// app/api/admin/analytics/route.ts
import { requireAdmin } from '@/lib/server/auth'
import { ok } from '@/lib/server/http'
import { getAnalyticsBundle } from '@/lib/server/analytics.repo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_DAYS = [7, 14, 30] as const
type Days = (typeof VALID_DAYS)[number]

function parseDays(req: Request): Days {
  const raw = Number(new URL(req.url).searchParams.get('days'))
  return (VALID_DAYS as readonly number[]).includes(raw) ? (raw as Days) : 14
}

export async function GET(req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  return ok(await getAnalyticsBundle(parseDays(req)))
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run __tests__/adminAnalyticsRoute.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Implement the shared client hook**

```typescript
// lib/admin/useAnalytics.ts
'use client'

import { useEffect, useRef, useState } from 'react'
import type { MetricRange } from '@/components/admin/MetricShell'
import type { AnalyticsBundle } from '@/lib/server/analytics.repo'

/**
 * One fetch-on-range-change hook shared by the Overview page, the Visitors
 * metric drill-down and the Funnel page — the three places that need this
 * bundle — following the same cancelled-flag/try-catch-finally shape
 * lib/admin/store.tsx already uses for products/orders.
 */
export function useAnalytics(days: MetricRange): { bundle: AnalyticsBundle | null; loading: boolean } {
  const [bundle, setBundle] = useState<AnalyticsBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false
    setLoading(true)
    void (async () => {
      try {
        const res = await fetch(`/api/admin/analytics?days=${days}`)
        if (!res.ok) throw new Error('Could not load analytics.')
        const data = (await res.json()) as AnalyticsBundle
        if (!cancelledRef.current) setBundle(data)
      } catch {
        // Leave `bundle` as whatever it last was (or null) — the pages below
        // already render sensible empty states for null/empty data.
      } finally {
        if (!cancelledRef.current) setLoading(false)
      }
    })()
    return () => {
      cancelledRef.current = true
    }
  }, [days])

  return { bundle, loading }
}
```

Note: `AnalyticsBundle` is imported here from `lib/server/analytics.repo.ts`, a `server-only` file — this is safe because only the **type** is imported (`import type`), which TypeScript erases at compile time; no server code or credentials end up in the client bundle. If this pattern feels fragile, an equally valid alternative is duplicating the plain interface in a non-server file — the `import type` approach is used here because the codebase doesn't currently have that duplication-avoidance pattern for other client/server type sharing, and it's simplest.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add app/api/admin/analytics/route.ts lib/admin/useAnalytics.ts __tests__/adminAnalyticsRoute.test.ts
git commit -m "feat: admin analytics read route and shared client hook"
```

---

## Task 11: Swap Overview and Visitors metric to real data

**Files:**
- Modify: `app/office-scr1pts-x7k2/page.tsx`
- Modify: `components/admin/metrics/VisitorsMetric.tsx`
- Delete: `lib/admin/mockTraffic.ts`

- [ ] **Step 1: Swap the Overview page's data source**

In `app/office-scr1pts-x7k2/page.tsx`, change the import:

```typescript
import { TRAFFIC_30D } from '@/lib/admin/mockTraffic'
```
to:
```typescript
import { useAnalytics } from '@/lib/admin/useAnalytics'
```

Find:
```typescript
export default function OverviewPage() {
  const { state } = useAdmin()
  const [open, setOpen] = useState<AdminOrder | null>(null)

  const traffic14 = trafficInRange(TRAFFIC_30D, 14)
```

Replace with:
```typescript
export default function OverviewPage() {
  const { state } = useAdmin()
  const [open, setOpen] = useState<AdminOrder | null>(null)
  const { bundle } = useAnalytics(14)

  const traffic14 = trafficInRange(bundle?.visitorsByDay ?? [], 14)
```

Find:
```typescript
  const visitorsDelta = delta(visitors, trafficPrevWindow(TRAFFIC_30D, 14).reduce((s, d) => s + d.visitors, 0))
```

Replace with:
```typescript
  const visitorsDelta = delta(visitors, trafficPrevWindow(bundle?.visitorsByDay ?? [], 14).reduce((s, d) => s + d.visitors, 0))
```

- [ ] **Step 2: Swap `VisitorsMetric`'s data source**

In `components/admin/metrics/VisitorsMetric.tsx`, change:

```typescript
import { DEVICE_SPLIT, TOP_PAGES, TRAFFIC_30D } from '@/lib/admin/mockTraffic'
import { useAdmin } from '@/lib/admin/store'
import { useIsPhone } from '@/lib/admin/useIsPhone'
import { conversionRate, delta, ordersInRange, trafficInRange, trafficPrevWindow } from '@/lib/admin/stats'

export default function VisitorsMetric() {
  const { state } = useAdmin()
  const [range, setRange] = useState<MetricRange>(14)
  const chartH = useIsPhone() ? 140 : 200

  const traffic = trafficInRange(TRAFFIC_30D, range)
  const visitors = traffic.reduce((s, d) => s + d.visitors, 0)
  const prevVisitors = trafficPrevWindow(TRAFFIC_30D, range).reduce((s, d) => s + d.visitors, 0)
  const rangedOrders = ordersInRange(state.orders, range)
  const rangeShare = TRAFFIC_30D.reduce((s, d) => s + d.visitors, 0) > 0
    ? visitors / TRAFFIC_30D.reduce((s, d) => s + d.visitors, 0)
    : 0
```

to:

```typescript
import { useAdmin } from '@/lib/admin/store'
import { useAnalytics } from '@/lib/admin/useAnalytics'
import { useIsPhone } from '@/lib/admin/useIsPhone'
import { conversionRate, delta, ordersInRange, trafficInRange, trafficPrevWindow } from '@/lib/admin/stats'

export default function VisitorsMetric() {
  const { state } = useAdmin()
  const [range, setRange] = useState<MetricRange>(14)
  const chartH = useIsPhone() ? 140 : 200
  const { bundle } = useAnalytics(range)

  const traffic = trafficInRange(bundle?.visitorsByDay ?? [], range)
  const visitors = traffic.reduce((s, d) => s + d.visitors, 0)
  const prevVisitors = trafficPrevWindow(bundle?.visitorsByDay ?? [], range).reduce((s, d) => s + d.visitors, 0)
  const rangedOrders = ordersInRange(state.orders, range)
  const topPages = bundle?.topPages ?? []
  const deviceSplit = bundle?.deviceSplit ?? { mobile: 0, desktop: 0 }
```

Note what changed beyond the mechanical swap: `topPages` and `deviceSplit` are now genuinely scoped to the selected range (the real `analytics_top_pages`/`analytics_device_split` RPCs already take `days`), so the old `rangeShare` scaling hack (`Math.round(p.views * rangeShare)`) is removed entirely — it was a crude workaround for the mock data being static regardless of range, and real data doesn't need it.

Find the "Top pages" card:
```tsx
        <Card title="Top pages">
          <ul className="space-y-2">
            {TOP_PAGES.map((p) => (
              <li key={p.path} className="flex justify-between text-[13px]">
                <span className="text-paper/90 truncate">{p.path}</span>
                <span className="text-grey tabular-nums shrink-0 ml-3">{Math.round(p.views * rangeShare).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </Card>
```

Replace with:
```tsx
        <Card title="Top pages">
          {topPages.length === 0 && <p className="text-[12px] text-grey">No page views yet</p>}
          <ul className="space-y-2">
            {topPages.map((p) => (
              <li key={p.path} className="flex justify-between text-[13px]">
                <span className="text-paper/90 truncate">{p.path}</span>
                <span className="text-grey tabular-nums shrink-0 ml-3">{p.views.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </Card>
```

Find the "Devices" card:
```tsx
        <Card title="Devices">
          <div className="flex h-2.5 rounded-full overflow-hidden bg-[#101010]">
            <div className="bg-pink" style={{ width: `${DEVICE_SPLIT.mobile}%` }} />
            <div className="bg-grey/60" style={{ width: `${DEVICE_SPLIT.desktop}%` }} />
          </div>
          <div className="mt-3 space-y-1.5 text-[13px]">
            <div className="flex justify-between"><span className="text-pink">Mobile</span><span className="tabular-nums text-paper/80">{DEVICE_SPLIT.mobile}%</span></div>
            <div className="flex justify-between"><span className="text-grey">Desktop</span><span className="tabular-nums text-paper/80">{DEVICE_SPLIT.desktop}%</span></div>
          </div>
        </Card>
```

Replace with:
```tsx
        <Card title="Devices">
          <div className="flex h-2.5 rounded-full overflow-hidden bg-[#101010]">
            <div className="bg-pink" style={{ width: `${deviceSplit.mobile}%` }} />
            <div className="bg-grey/60" style={{ width: `${deviceSplit.desktop}%` }} />
          </div>
          <div className="mt-3 space-y-1.5 text-[13px]">
            <div className="flex justify-between"><span className="text-pink">Mobile</span><span className="tabular-nums text-paper/80">{deviceSplit.mobile}%</span></div>
            <div className="flex justify-between"><span className="text-grey">Desktop</span><span className="tabular-nums text-paper/80">{deviceSplit.desktop}%</span></div>
          </div>
        </Card>
```

- [ ] **Step 3: Delete the mock dataset**

```bash
rm lib/admin/mockTraffic.ts
```

- [ ] **Step 4: Confirm nothing else imports it**

Run: `grep -rn "mockTraffic" app components lib --include='*.ts' --include='*.tsx'`
Expected: no output.

- [ ] **Step 5: Typecheck and run the full suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: both PASS.

- [ ] **Step 6: Verify manually**

Run: `npm run dev`, sign in to the admin, open Overview — with no events yet, Visitors reads 0 and the traffic chart is flat, not broken. After walking through Task 7-9's manual verification (which will have generated real events), reload Overview and the Visitors metric drill-down — confirm real numbers appear, and Top pages/Devices reflect the pages actually visited.

- [ ] **Step 7: Commit**

```bash
git add app/office-scr1pts-x7k2/page.tsx components/admin/metrics/VisitorsMetric.tsx
git rm lib/admin/mockTraffic.ts
git commit -m "feat: Overview and Visitors metric read real analytics data"
```

---

## Task 12: New Funnel page

**Files:**
- Create: `app/office-scr1pts-x7k2/funnel/page.tsx`
- Modify: `components/admin/Sidebar.tsx`

- [ ] **Step 1: Add the Sidebar nav entry**

In `components/admin/Sidebar.tsx`, change the icon import:

```typescript
import { ArrowLeft, LayoutDashboard, Mail, Package, ShoppingBag } from 'lucide-react'
```
to:
```typescript
import { ArrowLeft, Filter, LayoutDashboard, Mail, Package, ShoppingBag } from 'lucide-react'
```

Find:
```typescript
const NAV = [
  { href: adminPath(), label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: adminPath('products'), label: 'Products', icon: Package, exact: false },
  { href: adminPath('orders'), label: 'Orders', icon: ShoppingBag, exact: false },
  { href: adminPath('emails'), label: 'Emails', icon: Mail, exact: false },
]
```

Replace with:
```typescript
const NAV = [
  { href: adminPath(), label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: adminPath('products'), label: 'Products', icon: Package, exact: false },
  { href: adminPath('orders'), label: 'Orders', icon: ShoppingBag, exact: false },
  { href: adminPath('funnel'), label: 'Funnel', icon: Filter, exact: false },
  { href: adminPath('emails'), label: 'Emails', icon: Mail, exact: false },
]
```

- [ ] **Step 2: Write the Funnel page**

```tsx
// app/office-scr1pts-x7k2/funnel/page.tsx
'use client'

import { useState } from 'react'
import Card from '@/components/admin/Card'
import type { MetricRange } from '@/components/admin/MetricShell'
import { useAnalytics } from '@/lib/admin/useAnalytics'
import { ANALYTICS_EVENTS } from '@/lib/analyticsEvents'

const RANGES: MetricRange[] = [7, 14, 30]

const LABELS: Record<string, string> = {
  click_to_start: 'Clicked start',
  inventory_shortcut: 'Skipped to Inventory',
  npc_interaction: 'Talked to a character',
  karl_interaction: 'Talked to Karl',
  vinyl_interaction: 'Touched the vinyl',
  basement_discovered: 'Found the Basement',
  inventory_view: 'Viewed Inventory',
  basement_view: 'Viewed the Basement',
  product_click_inventory: 'Clicked a product (Inventory)',
  product_click_basement: 'Clicked a product (Basement)',
  add_to_cart: 'Added to cart',
  checkout_started: 'Started checkout',
  purchase: 'Purchased',
}

/**
 * Every event's own distinct-session count, in the order a visitor actually
 * reaches them. This is deliberately NOT one strict decreasing funnel (a
 * visitor can e.g. talk to an NPC after viewing Inventory, out of the literal
 * "step 3 then step 4" order) — each row is just "how many sessions did this,
 * at all", with the percentage read against the very first step (arrivals).
 */
export default function FunnelPage() {
  const [range, setRange] = useState<MetricRange>(14)
  const { bundle, loading } = useAnalytics(range)

  const counts = new Map((bundle?.funnel ?? []).map((f) => [f.event, f.sessions]))
  const arrivals = counts.get('click_to_start') ?? 0

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[32px] sm:text-[40px] leading-none uppercase tracking-[0.04em]" style={{ fontFamily: 'var(--font-bebas)' }}>
          Funnel
        </h1>
        <div className="flex shrink-0 rounded-lg border border-grey/30 overflow-hidden" role="group" aria-label="Time range">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={range === r}
              onClick={() => setRange(r)}
              className={`px-3 sm:px-4 py-2 text-[11px] sm:text-[12px] font-semibold transition-colors ${
                range === r ? 'bg-pink text-ink' : 'text-grey hover:text-paper'
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      <Card className="mt-6" title={`Last ${range} days`}>
        {loading && <p className="text-[12px] text-grey">Loading…</p>}
        {!loading && arrivals === 0 && <p className="text-[12px] text-grey">No sessions yet in this range.</p>}
        {!loading && arrivals > 0 && (
          <ul className="divide-y divide-grey/15">
            {ANALYTICS_EVENTS.map((event) => {
              const sessions = counts.get(event) ?? 0
              const pct = arrivals > 0 ? Math.round((sessions / arrivals) * 100) : 0
              return (
                <li key={event} className="flex items-center gap-4 py-3 text-[13px]">
                  <span className="min-w-0 flex-1 truncate text-paper/90">{LABELS[event] ?? event}</span>
                  <div className="h-2 w-24 sm:w-40 rounded-full bg-[#101010] overflow-hidden shrink-0">
                    <div className="h-full bg-pink" style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                  <span className="w-16 shrink-0 text-right tabular-nums text-paper/80">{sessions.toLocaleString()}</span>
                  <span className="w-12 shrink-0 text-right tabular-nums text-grey">{pct}%</span>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
```

Note: all 13 events render, including `purchase` — it's a valid, wanted row (the funnel's final "Conversion" step per the spec), not something to filter out.

- [ ] **Step 3: Typecheck and run the full suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: both PASS.

- [ ] **Step 4: Verify manually**

Run: `npm run dev`, sign in to the admin, click the new Funnel entry in the sidebar. With events from earlier tasks' manual verification already recorded, confirm all 13 rows show with sensible counts and percentages, and `purchase` sits last with the lowest count. Switch the 7/14/30 range and confirm the numbers update.

- [ ] **Step 5: Commit**

```bash
git add app/office-scr1pts-x7k2/funnel/page.tsx components/admin/Sidebar.tsx
git commit -m "feat: Funnel page in the admin"
```

---

## Task 13: Privacy Policy copy

**Files:**
- Modify: `app/privacy/page.tsx`

- [ ] **Step 1: Update the analytics line**

Find:
```
If we introduce additional analytics, advertising, or tracking technologies, this Privacy Policy may be updated to reflect those practices and appropriate choices may be provided where required.
```

Replace with:
```
We track anonymous, first-party usage events (such as which pages are visited and which parts of the game and shop people use) to understand how SCR!PTS is actually used. This does not use accounts, does not use advertising or cross-site tracking, and does not collect personally identifying information. If that changes — for example, if we introduce advertising or cross-site tracking — this Privacy Policy will be updated to reflect it and appropriate choices will be provided where required.
```

(Match the exact surrounding JSX syntax in `app/privacy/page.tsx` — this is prose inside whatever paragraph/text component wraps it there; preserve indentation and any surrounding tags exactly as found.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/privacy/page.tsx
git commit -m "docs: describe the new anonymous analytics in the Privacy Policy"
```

---

## Task 14: Drift guard + full verification pass

**Files:**
- Modify: `__tests__/analytics.test.ts`

- [ ] **Step 1: Add the SQL-vs-TS drift guard test**

In `__tests__/analytics.test.ts`, add a new test to the existing `describe('ANALYTICS_EVENTS', ...)` block:

```typescript
  it('matches the migration\'s CHECK constraint exactly (update both if this ever fails)', () => {
    // Hand-copied from supabase/migrations/0007_analytics_events.sql's
    // `event text not null check (event in (...))` list. If you change the
    // event list, update both this array and the migration.
    const sqlCheckConstraintList = [
      'click_to_start', 'inventory_shortcut', 'npc_interaction',
      'karl_interaction', 'vinyl_interaction', 'basement_discovered',
      'inventory_view', 'basement_view', 'product_click_inventory',
      'product_click_basement', 'add_to_cart', 'checkout_started', 'purchase',
    ]
    expect(ANALYTICS_EVENTS).toEqual(sqlCheckConstraintList)
  })
```

- [ ] **Step 2: Run it to verify it passes**

Run: `npx vitest run __tests__/analytics.test.ts`
Expected: PASS (5 tests) — it should pass immediately since Task 3's `ANALYTICS_EVENTS` and Task 1's migration were written from the same list.

- [ ] **Step 3: Run the entire suite and typecheck one more time**

Run: `npx vitest run && npx tsc --noEmit`
Expected: both PASS, no regressions from any earlier task.

- [ ] **Step 4: Full manual walkthrough in Stripe test mode**

Starting from a fresh browser profile (clear `localStorage` first, so a fresh `scripts-analytics-sid` is created):

1. Load the site — press Start (`click_to_start`).
2. Talk to Teo or TP (`npc_interaction`).
3. Talk to Karl (`npc_interaction` + `karl_interaction`).
4. Touch the vinyl deck (`vinyl_interaction` + `basement_discovered`).
5. Visit `/inventory` directly (`inventory_view`), click a product (`product_click_inventory`).
6. Visit `/basement` (`basement_view`), click a product (`product_click_basement`).
7. Add an item to the cart (`add_to_cart`).
8. Start checkout (`checkout_started`), pay with `4242 4242 4242 4242`.
9. In the webhook logs / Supabase, confirm a `purchase` row with `meta.orderId` set and `session_id` matching the browser's `scripts-analytics-sid`.
10. In the admin, open Funnel — confirm all 13 steps show at least 1 session, with `purchase` at 1.
11. Open Overview and the Visitors drill-down — confirm real visitor/traffic/top-pages/device numbers, no trace of the old mock data.

- [ ] **Step 5: Commit**

```bash
git add __tests__/analytics.test.ts
git commit -m "test: guard the event list against the migration drifting out of sync"
```

---

## Self-review notes

- **Spec coverage:** every section of the spec has a task — data model (Task 1), rate limiting/bot filtering/schema (Tasks 2, 4), client tracker and session id (Task 3), the write/read repo (Task 5), the public route (Task 6), all 13 event call sites (Tasks 7-9), the `purchase`-is-server-only design including the Stripe-metadata session linkage (Task 9), the admin read path and real Overview/Visitors/Funnel UI (Tasks 10-12), and the Privacy Policy line (Task 13).
- **Placeholder scan:** no TBD/TODO markers; every code block is the actual content an implementer needs, including the SQL functions and every call-site diff.
- **Type consistency:** `AnalyticsBundle`/`RecordEventInput` are defined once in Task 5 and consumed unchanged by Tasks 6, 10, 11, 12. `ClientAnalyticsEvent`/`AnalyticsEventName`/`ANALYTICS_EVENTS` are defined once in Task 3 and consumed unchanged everywhere else. The one cross-language duplication (the 13 event names, in both the SQL CHECK constraint and the TS array) is deliberate and guarded by Task 14's test, called out explicitly rather than hidden.
- **Ambiguity resolved:** `useAnalytics.ts` importing a type from a `server-only` file is flagged with a comment explaining why it's safe (`import type` erases at compile time) rather than silently doing something that looks like a violation of the server/client boundary.
