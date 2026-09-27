# Welcome Email With Unique 10% Code — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When someone joins the SCR!PTS mailing list, they immediately receive a designed welcome email — the game's loading scene with a pink "ITEM OBTAINED" card holding a unique, single-use 10% code — and can spend that code at checkout.

**Architecture:** A new `welcome` email template follows the existing `order_confirmation` / `order_shipped` / `order_delivered` pattern (defaults in code, overrides editable in the admin Emails tab). Signup claims a code atomically in Postgres, creates a matching Stripe promotion code, and sends the email — all from the existing `/api/newsletter` route. Checkout accepts the code via Stripe's own promo-code field. The webhook records the discount Stripe already reports, and the three places that show a total (confirmation email, admin order drawer, success page) get a "Discount" line.

**Tech Stack:** Next.js 15 API routes, Supabase/Postgres, Stripe (coupons + promotion codes), Resend, Pillow (Python, one-off script) for the hero GIF, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-20-welcome-email-design.md`

## Global Constraints

- Code format: `SCRIPTS-XXXX`, 4 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no `0/O/1/I`).
- Code lifetime: single use (`max_redemptions: 1`), first order only (`restrictions.first_time_transaction: true`), expires 14 days after signup.
- One code per email address, ever. A repeat or duplicate signup never issues a second code or sends a second email.
- The newsletter route must always answer `201 { subscribed: true }` on a valid email, whatever happens downstream (Stripe/Resend failures are logged, never surfaced to the visitor).
- Newsletter email max length: 254 characters (closes audit finding MEDIUM 1).
- No `{name}` in the welcome email — the signup form only collects an email. Headline is `You're in.`
- Every marketing send carries an unsubscribe link and `List-Unsubscribe` / `List-Unsubscribe-Post` headers.
- `sendEmail` never throws (existing rule in `lib/server/email.ts`) — every new call site awaits it and only logs on failure.

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/0006_welcome_code.sql` | New columns on `newsletter_signups` and `orders`; widens `email_copy` template check |
| `lib/schemas/product.ts` | `newsletterSchema` gets a max length |
| `lib/server/newsletter.repo.ts` | Signup upsert, atomic code claim, unsubscribe lookup/apply |
| `lib/server/rateLimit.ts` | Tiny in-memory sliding-window limiter, reused by the newsletter route |
| `lib/server/promoCode.ts` | Generates the `SCRIPTS-XXXX` code string |
| `lib/server/stripe.ts` | Add `ensureWelcomeCoupon` / `createWelcomePromoCode` |
| `lib/server/emails/defaults.ts` | Add the `welcome` template spec (id, fields, defaults) |
| `lib/server/emails/welcome.ts` | Builds the welcome `OutgoingEmail` (subject/html/text) |
| `lib/server/emails/layout.ts` | Add `unsubscribeFooter` helper shared by future marketing mail |
| `scripts/make-welcome-hero.py` | One-off script producing `public/email/welcome-hero.gif` from existing game art |
| `app/api/newsletter/route.ts` | Orchestrates: validate → rate limit → upsert → claim → Stripe → email |
| `app/unsubscribe/page.tsx` | Confirmation UI |
| `app/api/unsubscribe/route.ts` | POST that applies the unsubscribe |
| `app/api/checkout/session/route.ts` | Add `allow_promotion_codes: true` |
| `app/api/webhooks/stripe/route.ts` | Read and pass through `total_details.amount_discount` |
| `lib/server/orders.repo.ts` | `NewOrder`/`OrderRow`/`rowToOrder` carry `discount` |
| `lib/admin/types.ts` | `AdminOrder.discount` |
| `lib/admin/mockOrders.ts` | Sample orders get a `discount` field (0) |
| `lib/server/emails/layout.ts` (`orderTable`/`orderTableText`) | Show a Discount row when > 0 |
| `components/admin/OrderDrawer.tsx` | Show Discount row when > 0 |
| `app/checkout/success/page.tsx`, `app/api/checkout/status/route.ts` | Carry and show `discount` |
| `app/office-scr1pts-x7k2/emails/page.tsx` | Wire the new template into the admin preview |

---

## Task 1: Migration — signup, unsubscribe and order-discount columns

**Files:**
- Create: `supabase/migrations/0006_welcome_code.sql`
- Test: manual (`npm run db:check` against a Supabase project); this task has no Vitest coverage of its own — later tasks exercise the columns through the repo layer.

**Interfaces:**
- Produces: columns `newsletter_signups.welcome_code`, `.welcome_code_expires_at`, `.welcome_sent_at`, `.unsubscribe_token`, `.unsubscribed_at`; `orders.discount`; `email_copy.template` check widened to include `'welcome'`.

- [ ] **Step 1: Write the migration**

```sql
-- 0006_welcome_code.sql
--
-- Backs the welcome email: a unique, single-use 10% code issued once per
-- signup, an unsubscribe token every marketing send needs, and a discount
-- column on orders so a redeemed code still reconciles subtotal + shipping -
-- discount = total on every screen that shows a total.

alter table newsletter_signups add column if not exists welcome_code text unique;
alter table newsletter_signups add column if not exists welcome_code_expires_at timestamptz;
alter table newsletter_signups add column if not exists welcome_sent_at timestamptz;
alter table newsletter_signups add column if not exists unsubscribe_token text unique;
alter table newsletter_signups add column if not exists unsubscribed_at timestamptz;

-- Backfill tokens for any rows that predate this column (built-in md5(random()),
-- no pgcrypto dependency), then make the column mandatory going forward.
update newsletter_signups
  set unsubscribe_token = md5(random()::text || clock_timestamp()::text || email)
  where unsubscribe_token is null;

alter table newsletter_signups alter column unsubscribe_token set not null;
alter table newsletter_signups
  alter column unsubscribe_token set default md5(random()::text || clock_timestamp()::text);

alter table orders add column if not exists discount numeric not null default 0;

alter table email_copy drop constraint if exists email_copy_template_check;
alter table email_copy
  add constraint email_copy_template_check
  check (template in ('order_confirmation', 'order_shipped', 'order_delivered', 'welcome'));
```

- [ ] **Step 2: Apply it to a real Supabase project and confirm it's idempotent**

Run: `psql "$SUPABASE_DB_URL" -f supabase/migrations/0006_welcome_code.sql` (or paste into the Supabase SQL editor), then run the same file again.
Expected: no error either time (every statement uses `if not exists` / `drop constraint if exists`).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0006_welcome_code.sql
git commit -m "db: welcome-code, unsubscribe and order-discount columns"
```

---

## Task 2: Rate limiter + tighter email validation

**Files:**
- Create: `lib/server/rateLimit.ts`
- Create: `__tests__/rateLimit.test.ts`
- Modify: `lib/schemas/product.ts:96-99` (`newsletterSchema`)
- Test: `__tests__/rateLimit.test.ts`, and the existing `__tests__/schemas.test.ts` gets one more case.

**Interfaces:**
- Produces: `checkRateLimit(key: string, opts?: { limit?: number; windowMs?: number }): boolean` — `true` if the call is allowed, `false` if the caller has exceeded `limit` calls within `windowMs` for that `key`.
- Consumed by: Task 7 (`app/api/newsletter/route.ts`).

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
 * That is deliberate: the newsletter route has no Redis to talk to, and the
 * goal is only to stop a single script hammering the endpoint from one
 * connection, not to enforce an exact global quota. Revisit with a shared
 * store (e.g. Upstash) if abuse turns out to be distributed.
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

- [ ] **Step 5: Cap the newsletter email length**

In `lib/schemas/product.ts`, find:

```typescript
export const newsletterSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  source: z.string().max(64).optional(),
})
```

Replace with:

```typescript
export const newsletterSchema = z.object({
  email: z.string().max(254, 'Enter a valid email address').email('Enter a valid email address'),
  source: z.string().max(64).optional(),
})
```

- [ ] **Step 6: Add a schema test**

Open `__tests__/schemas.test.ts`, find the `describe` block covering `newsletterSchema` (search for `newsletterSchema`) and add:

```typescript
it('rejects an email over 254 characters', () => {
  const huge = `${'a'.repeat(250)}@x.com`
  expect(newsletterSchema.safeParse({ email: huge }).success).toBe(false)
})
```

- [ ] **Step 7: Run both test files**

Run: `npx vitest run __tests__/rateLimit.test.ts __tests__/schemas.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add lib/server/rateLimit.ts __tests__/rateLimit.test.ts lib/schemas/product.ts __tests__/schemas.test.ts
git commit -m "feat: per-key rate limiter, cap newsletter email length"
```

---

## Task 3: Welcome code generator

**Files:**
- Create: `lib/server/promoCode.ts`
- Create: `__tests__/promoCode.test.ts`

**Interfaces:**
- Produces: `randomWelcomeCode(): string` — returns `SCRIPTS-XXXX` where `XXXX` is 4 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`.
- Consumed by: Task 5 (`lib/server/newsletter.repo.ts`).

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/promoCode.test.ts
import { describe, expect, it } from 'vitest'
import { randomWelcomeCode } from '@/lib/server/promoCode'

describe('randomWelcomeCode', () => {
  it('matches SCRIPTS-XXXX using only unambiguous characters', () => {
    for (let i = 0; i < 200; i++) {
      expect(randomWelcomeCode()).toMatch(/^SCRIPTS-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/)
    }
  })

  it('is not obviously deterministic', () => {
    const codes = new Set(Array.from({ length: 50 }, () => randomWelcomeCode()))
    expect(codes.size).toBeGreaterThan(40)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run __tests__/promoCode.test.ts`
Expected: FAIL — `Cannot find module '@/lib/server/promoCode'`

- [ ] **Step 3: Implement it**

```typescript
// lib/server/promoCode.ts
import 'server-only'
import { randomBytes } from 'node:crypto'

/**
 * No 0/O/1/I — the code goes into a printed-feeling email and gets typed at
 * checkout, so a character that looks like another is a support ticket.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function randomWelcomeCode(): string {
  const bytes = randomBytes(4)
  let suffix = ''
  for (const byte of bytes) suffix += ALPHABET[byte % ALPHABET.length]
  return `SCRIPTS-${suffix}`
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run __tests__/promoCode.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/server/promoCode.ts __tests__/promoCode.test.ts
git commit -m "feat: welcome-code generator"
```

---

## Task 4: Stripe coupon + promotion code helpers

**Files:**
- Modify: `lib/server/stripe.ts`
- Create: `__tests__/stripeWelcomeCoupon.test.ts`

**Interfaces:**
- Consumes: `stripe()`, `isStripeConfigured()` (already in this file).
- Produces: `ensureWelcomeCoupon(): Promise<void>`, `createWelcomePromoCode(code: string, expiresAt: Date): Promise<void>`.
- Consumed by: Task 5 (`lib/server/newsletter.repo.ts`), Task 8 (checkout `allow_promotion_codes`).

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/stripeWelcomeCoupon.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest'

const retrieve = vi.fn()
const createCoupon = vi.fn()
const createPromoCode = vi.fn()

vi.mock('stripe', () => {
  class FakeStripeInvalidRequestError extends Error {}
  return {
    default: class FakeStripe {
      static errors = { StripeInvalidRequestError: FakeStripeInvalidRequestError }
      coupons = { retrieve, create: createCoupon }
      promotionCodes = { create: createPromoCode }
    },
  }
})

process.env.STRIPE_SECRET_KEY = 'sk_test_fake'

describe('ensureWelcomeCoupon / createWelcomePromoCode', () => {
  beforeEach(() => {
    vi.resetModules()
    retrieve.mockReset()
    createCoupon.mockReset()
    createPromoCode.mockReset()
  })

  it('reuses the coupon when it already exists', async () => {
    retrieve.mockResolvedValue({ id: 'welcome10' })
    const { ensureWelcomeCoupon } = await import('@/lib/server/stripe')
    await ensureWelcomeCoupon()
    expect(retrieve).toHaveBeenCalledWith('welcome10')
    expect(createCoupon).not.toHaveBeenCalled()
  })

  it('creates the coupon once, on the first call', async () => {
    const Stripe = (await import('stripe')).default as unknown as { errors: { StripeInvalidRequestError: new (m?: string) => Error } }
    retrieve.mockRejectedValue(new Stripe.errors.StripeInvalidRequestError('No such coupon'))
    createCoupon.mockResolvedValue({ id: 'welcome10' })
    const { ensureWelcomeCoupon } = await import('@/lib/server/stripe')
    await ensureWelcomeCoupon()
    expect(createCoupon).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'welcome10', percent_off: 10, duration: 'once' }),
    )
  })

  it('creates a single-use, first-order promotion code with the given code and expiry', async () => {
    retrieve.mockResolvedValue({ id: 'welcome10' })
    createPromoCode.mockResolvedValue({ id: 'promo_1' })
    const { createWelcomePromoCode } = await import('@/lib/server/stripe')
    const expiresAt = new Date('2026-10-04T00:00:00Z')
    await createWelcomePromoCode('SCRIPTS-K7M2', expiresAt)
    expect(createPromoCode).toHaveBeenCalledWith({
      code: 'SCRIPTS-K7M2',
      promotion: { type: 'coupon', coupon: 'welcome10' },
      expires_at: Math.floor(expiresAt.getTime() / 1000),
      max_redemptions: 1,
      restrictions: { first_time_transaction: true },
    })
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run __tests__/stripeWelcomeCoupon.test.ts`
Expected: FAIL — `ensureWelcomeCoupon`/`createWelcomePromoCode` are not exported

- [ ] **Step 3: Implement the helpers**

Append to `lib/server/stripe.ts` (keep the existing `import Stripe from 'stripe'` at the top — it's already a value import, not `import type`):

```typescript
/**
 * The one coupon every welcome code redeems against. Created once per Stripe
 * account (test and live each need their own) and reused after that — Stripe
 * has no "create if missing" call, so we retrieve first and create on a 404.
 */
const WELCOME_COUPON_ID = 'welcome10'

export async function ensureWelcomeCoupon(): Promise<void> {
  try {
    await stripe().coupons.retrieve(WELCOME_COUPON_ID)
  } catch (err) {
    if (!(err instanceof Stripe.errors.StripeInvalidRequestError)) throw err
    await stripe().coupons.create({
      id: WELCOME_COUPON_ID,
      percent_off: 10,
      duration: 'once',
      name: 'Welcome — 10% off',
    })
  }
}

/**
 * One single-use, first-order promotion code redeemable against the welcome
 * coupon. `code` must already be reserved in `newsletter_signups` by the
 * caller — this only makes Stripe agree that code is real.
 */
export async function createWelcomePromoCode(code: string, expiresAt: Date): Promise<void> {
  await ensureWelcomeCoupon()
  await stripe().promotionCodes.create({
    code,
    promotion: { type: 'coupon', coupon: WELCOME_COUPON_ID },
    expires_at: Math.floor(expiresAt.getTime() / 1000),
    max_redemptions: 1,
    restrictions: { first_time_transaction: true },
  })
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run __tests__/stripeWelcomeCoupon.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/server/stripe.ts __tests__/stripeWelcomeCoupon.test.ts
git commit -m "feat: Stripe welcome coupon + single-use promotion codes"
```

---

## Task 5: Newsletter repo — signup, atomic code claim, unsubscribe

**Files:**
- Modify: `lib/server/newsletter.repo.ts`
- Create: `__tests__/newsletterRepo.test.ts`

**Interfaces:**
- Consumes: `serverClient()`, `isDatabaseConfigured()` (`lib/server/supabase.ts`).
- Produces:
  - `addSignup(email: string, source?: string): Promise<void>` (existing signature, now also clears `unsubscribed_at` on re-signup).
  - `claimWelcomeCode(email: string, code: string, expiresAt: Date): Promise<boolean>` — `true` if this call reserved the code for that email, `false` if the row already had one (or didn't exist).
  - `findSignupByUnsubscribeToken(token: string): Promise<{ email: string; unsubscribedAt: string | null } | null>`.
  - `unsubscribeByToken(token: string): Promise<boolean>` — `true` if a row was updated.
- Consumed by: Task 7 (`app/api/newsletter/route.ts`), Task 6 (`app/api/unsubscribe/route.ts`).

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/newsletterRepo.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest'

const upsert = vi.fn()
const update = vi.fn()
const select = vi.fn()
const maybeSingle = vi.fn()
const eq = vi.fn()
const isFn = vi.fn()

function chain() {
  const obj: Record<string, unknown> = {}
  obj.upsert = upsert.mockReturnValue(Promise.resolve({ error: null }))
  obj.update = update.mockReturnValue(obj)
  obj.select = select.mockReturnValue(obj)
  obj.eq = eq.mockReturnValue(obj)
  obj.is = isFn.mockReturnValue(obj)
  obj.maybeSingle = maybeSingle
  return obj
}

vi.mock('@/lib/server/supabase', () => ({
  isDatabaseConfigured: () => true,
  serverClient: () => ({ from: () => chain() }),
}))

beforeEach(() => {
  upsert.mockReset().mockReturnValue(Promise.resolve({ error: null }))
  update.mockReset()
  select.mockReset()
  eq.mockReset()
  isFn.mockReset()
  maybeSingle.mockReset()
})

describe('claimWelcomeCode', () => {
  it('returns true when the update reports one row changed', async () => {
    const { serverClient } = await import('@/lib/server/supabase')
    const single = vi.fn().mockResolvedValue({ data: { email: 'a@b.com' }, error: null })
    vi.mocked(serverClient).mockReturnValueOnce({
      from: () => ({
        update: () => ({ eq: () => ({ is: () => ({ select: () => ({ maybeSingle: single }) }) }) }),
      }),
    } as never)
    const { claimWelcomeCode } = await import('@/lib/server/newsletter.repo')
    const claimed = await claimWelcomeCode('a@b.com', 'SCRIPTS-AAAA', new Date())
    expect(claimed).toBe(true)
  })

  it('returns false when no row matched (already has a code)', async () => {
    const { serverClient } = await import('@/lib/server/supabase')
    const single = vi.fn().mockResolvedValue({ data: null, error: null })
    vi.mocked(serverClient).mockReturnValueOnce({
      from: () => ({
        update: () => ({ eq: () => ({ is: () => ({ select: () => ({ maybeSingle: single }) }) }) }),
      }),
    } as never)
    const { claimWelcomeCode } = await import('@/lib/server/newsletter.repo')
    const claimed = await claimWelcomeCode('a@b.com', 'SCRIPTS-AAAA', new Date())
    expect(claimed).toBe(false)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run __tests__/newsletterRepo.test.ts`
Expected: FAIL — `claimWelcomeCode` is not exported

- [ ] **Step 3: Implement the repo**

Replace the full contents of `lib/server/newsletter.repo.ts`:

```typescript
import 'server-only'

import { isDatabaseConfigured, serverClient } from './supabase'

/**
 * Newsletter signups. Storing `consented_at` is the point: an email address
 * with no record of when it was given is a liability, not an asset.
 */
export async function addSignup(email: string, source = 'footer'): Promise<void> {
  if (!isDatabaseConfigured()) {
    throw new Error('Supabase is not configured; refusing to drop a signup on the floor.')
  }

  // Signing up twice is not an error worth showing a visitor. Re-signing up
  // after unsubscribing puts them back on the list, but never issues a second
  // welcome code — that stays keyed off welcome_code being null.
  const { error } = await serverClient()
    .from('newsletter_signups')
    .upsert(
      { email: email.toLowerCase().trim(), source, unsubscribed_at: null },
      { onConflict: 'email' },
    )
  if (error) throw new Error(`addSignup: ${error.message}`)
}

/**
 * Reserve `code` for `email`, but only if that email has never had one.
 *
 * This is the whole safety mechanism against double-sends: two concurrent
 * signups (a double click, a retried request) race to `update ... where
 * welcome_code is null`, and only one of them can win that row. The loser's
 * update touches zero rows and gets `false` back — no code, no email.
 */
export async function claimWelcomeCode(email: string, code: string, expiresAt: Date): Promise<boolean> {
  if (!isDatabaseConfigured()) return false

  const { data, error } = await serverClient()
    .from('newsletter_signups')
    .update({ welcome_code: code, welcome_code_expires_at: expiresAt.toISOString() })
    .eq('email', email.toLowerCase().trim())
    .is('welcome_code', null)
    .select('email')
    .maybeSingle()

  if (error) throw new Error(`claimWelcomeCode: ${error.message}`)
  return Boolean(data)
}

export async function markWelcomeSent(email: string): Promise<void> {
  if (!isDatabaseConfigured()) return
  const { error } = await serverClient()
    .from('newsletter_signups')
    .update({ welcome_sent_at: new Date().toISOString() })
    .eq('email', email.toLowerCase().trim())
  if (error) throw new Error(`markWelcomeSent: ${error.message}`)
}

export interface SignupLookup {
  email: string
  unsubscribedAt: string | null
}

export async function findSignupByUnsubscribeToken(token: string): Promise<SignupLookup | null> {
  if (!isDatabaseConfigured()) return null
  const { data, error } = await serverClient()
    .from('newsletter_signups')
    .select('email, unsubscribed_at')
    .eq('unsubscribe_token', token)
    .maybeSingle()
  if (error) throw new Error(`findSignupByUnsubscribeToken: ${error.message}`)
  if (!data) return null
  return { email: (data as { email: string }).email, unsubscribedAt: (data as { unsubscribed_at: string | null }).unsubscribed_at }
}

/** Returns true if a matching, not-already-unsubscribed row was updated. */
export async function unsubscribeByToken(token: string): Promise<boolean> {
  if (!isDatabaseConfigured()) return false
  const { data, error } = await serverClient()
    .from('newsletter_signups')
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq('unsubscribe_token', token)
    .is('unsubscribed_at', null)
    .select('email')
    .maybeSingle()
  if (error) throw new Error(`unsubscribeByToken: ${error.message}`)
  return Boolean(data)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run __tests__/newsletterRepo.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/server/newsletter.repo.ts __tests__/newsletterRepo.test.ts
git commit -m "feat: atomic welcome-code claim, unsubscribe lookup/apply"
```

---

## Task 6: Unsubscribe route and page

**Files:**
- Create: `app/api/unsubscribe/route.ts`
- Create: `app/unsubscribe/page.tsx`
- Test: manual (this is a thin UI wrapper around Task 5's already-tested repo function; no new unit test file).

**Interfaces:**
- Consumes: `unsubscribeByToken(token: string): Promise<boolean>` (Task 5).
- Produces: `POST /api/unsubscribe { token }` → `{ unsubscribed: boolean }`; page `GET /unsubscribe?token=...`.

- [ ] **Step 1: Write the route**

```typescript
// app/api/unsubscribe/route.ts
import { z } from 'zod'

import { fail, notConfigured, ok } from '@/lib/server/http'
import { isDatabaseConfigured } from '@/lib/server/supabase'
import { unsubscribeByToken } from '@/lib/server/newsletter.repo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({ token: z.string().min(1) })

/**
 * POST, not GET: this must never fire just because a mail client or a link
 * scanner prefetched the URL out of the email.
 */
export async function POST(req: Request) {
  if (!isDatabaseConfigured()) return notConfigured()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail(400, 'Expected a JSON body.')
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return fail(422, 'Missing or invalid token.')

  const unsubscribed = await unsubscribeByToken(parsed.data.token)
  return ok({ unsubscribed })
}
```

- [ ] **Step 2: Write the page**

```tsx
// app/unsubscribe/page.tsx
'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

function UnsubscribeForm() {
  const token = useSearchParams().get('token')
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')

  async function confirm() {
    if (!token) return
    setState('busy')
    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      setState(res.ok ? 'done' : 'error')
    } catch {
      setState('error')
    }
  }

  if (!token) {
    return <p className="text-[14px]">That unsubscribe link is missing its token. Email us at info.scriptsstudio@gmail.com and we&apos;ll take you off the list by hand.</p>
  }

  if (state === 'done') {
    return (
      <>
        <p className="text-[14px] mb-4">You&apos;re off the list. No more emails from us.</p>
        <Link href="/inventory" className="underline text-[13px] font-bold uppercase tracking-[0.06em]">Back to the shop</Link>
      </>
    )
  }

  if (state === 'error') {
    return <p className="text-[14px]">That didn&apos;t go through. Try again, or email info.scriptsstudio@gmail.com.</p>
  }

  return (
    <>
      <p className="text-[14px] mb-6">Take you off the SCR!PTS mailing list?</p>
      <button
        onClick={confirm}
        disabled={state === 'busy'}
        className="bg-[#0d0d0d] text-white text-[12px] font-bold uppercase tracking-[0.1em] px-6 py-3 disabled:opacity-50"
      >
        {state === 'busy' ? 'Working…' : 'Unsubscribe'}
      </button>
    </>
  )
}

export default function UnsubscribePage() {
  return (
    <div className="min-h-screen bg-white text-[#0d0d0d] flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-[28px] uppercase tracking-[0.04em] mb-6" style={{ fontFamily: 'var(--font-bebas)' }}>
        Unsubscribe
      </h1>
      <Suspense fallback={null}>
        <UnsubscribeForm />
      </Suspense>
    </div>
  )
}
```

- [ ] **Step 3: Verify manually**

Run: `npm run dev`, then in another terminal:
```bash
curl -s -X POST localhost:3000/api/unsubscribe -H 'content-type: application/json' -d '{"token":"nonexistent"}'
```
Expected: `{"unsubscribed":false}` (no matching row) with no server error. Visiting `/unsubscribe` with no `?token=` shows the "missing its token" message; visiting `/unsubscribe?token=nonexistent` and clicking the button also shows the "didn't go through" case gracefully (since `unsubscribed: false` still responds `res.ok`, this actually lands on the "done" branch — note this in Step 4).

- [ ] **Step 4: Make "no such token" honest in the UI**

The route always returns `200` even when nothing matched, so the page currently can't distinguish "unsubscribed" from "nothing to unsubscribe." Update the route to report which happened:

In `app/api/unsubscribe/route.ts`, change the last line:

```typescript
  const unsubscribed = await unsubscribeByToken(parsed.data.token)
  if (!unsubscribed) return fail(404, 'We could not find that subscription.')
  return ok({ unsubscribed: true })
```

In `app/unsubscribe/page.tsx`, change `confirm()`'s response handling:

```typescript
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (res.status === 404) {
        setState('error')
        return
      }
      setState(res.ok ? 'done' : 'error')
```

- [ ] **Step 5: Re-verify manually**

Run: `curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:3000/api/unsubscribe -H 'content-type: application/json' -d '{"token":"nonexistent"}'`
Expected: `404`

- [ ] **Step 6: Commit**

```bash
git add app/api/unsubscribe/route.ts app/unsubscribe/page.tsx
git commit -m "feat: unsubscribe route and confirmation page"
```

---

## Task 7: Welcome email template

**Files:**
- Modify: `lib/server/emails/defaults.ts`
- Modify: `lib/server/emails/layout.ts`
- Create: `lib/server/emails/welcome.ts`
- Create: `__tests__/welcomeEmail.test.ts`

**Interfaces:**
- Consumes: `escapeHtml`, `shell` (from `layout.ts`); `fill`, `mergeCopy`, `type Copy` (from `defaults.ts`); `OutgoingEmail` (from `../email`); `siteUrl()` (`lib/server/siteUrl.ts`).
- Produces:
  - `EmailTemplateId` widened to include `'welcome'`.
  - `unsubscribeFooter(token: string): { html: string; text: string }` in `layout.ts`.
  - `welcomeEmail(email: string, code: string, expiresAt: Date, unsubscribeToken: string, stored?: Copy | null): OutgoingEmail` in `welcome.ts`.
- Consumed by: Task 8 (newsletter route), Task 10 (admin Emails tab).

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/welcomeEmail.test.ts
import { describe, expect, it, vi, afterEach } from 'vitest'
import { welcomeEmail } from '@/lib/server/emails/welcome'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('welcomeEmail', () => {
  const expiresAt = new Date('2026-10-04T00:00:00Z')

  it('is addressed to the signup and names the code in subject, html and text', () => {
    const mail = welcomeEmail('fan@example.com', 'SCRIPTS-K7M2', expiresAt, 'tok_abc')
    expect(mail.to).toBe('fan@example.com')
    expect(mail.subject).toContain('10%')
    expect(mail.html).toContain('SCRIPTS-K7M2')
    expect(mail.text).toContain('SCRIPTS-K7M2')
  })

  it('has no {name} placeholder left unfilled', () => {
    const mail = welcomeEmail('fan@example.com', 'SCRIPTS-K7M2', expiresAt, 'tok_abc')
    expect(mail.html).not.toContain('{name}')
    expect(mail.text).not.toContain('{name}')
  })

  it('escapes an overridden field so it cannot inject markup', () => {
    const mail = welcomeEmail('fan@example.com', 'SCRIPTS-K7M2', expiresAt, 'tok_abc', {
      headline: '<img src=x onerror=alert(1)>',
    })
    expect(mail.html).not.toContain('<img src=x onerror=alert(1)>')
    expect(mail.html).toContain('&lt;img')
  })

  it('carries an unsubscribe link with the token, and List-Unsubscribe headers', () => {
    const mail = welcomeEmail('fan@example.com', 'SCRIPTS-K7M2', expiresAt, 'tok_abc')
    expect(mail.html).toContain('tok_abc')
    expect(mail.text).toContain('tok_abc')
    expect(mail.headers?.['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
    expect(mail.headers?.['List-Unsubscribe']).toContain('tok_abc')
  })

  it('falls back to default copy when nothing is overridden', () => {
    const mail = welcomeEmail('fan@example.com', 'SCRIPTS-K7M2', expiresAt, 'tok_abc', null)
    expect(mail.html).toContain("You're in.")
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run __tests__/welcomeEmail.test.ts`
Expected: FAIL — `Cannot find module '@/lib/server/emails/welcome'`

- [ ] **Step 3: Widen `EmailTemplateId` and add the template spec**

In `lib/server/emails/defaults.ts`, change:

```typescript
export type EmailTemplateId = 'order_confirmation' | 'order_shipped' | 'order_delivered'
```

to:

```typescript
export type EmailTemplateId = 'order_confirmation' | 'order_shipped' | 'order_delivered' | 'welcome'
```

Then add a new entry to the `TEMPLATES` array (after the closing `]` of `order_delivered`'s `fields`, before the array's closing `]`):

```typescript
  {
    id: 'welcome',
    name: 'Welcome',
    when: 'Sent the moment someone joins the mailing list.',
    fields: [
      { key: 'subject', label: 'Subject line', default: "You're in — here's 10% off" },
      { key: 'headline', label: 'Headline', default: "You're in." },
      {
        key: 'body',
        label: 'Main paragraph',
        multiline: true,
        default:
          "Welcome to SCR!PTS. You're on the list, which means new drops, restocks and the odd secret from the Basement land in your inbox before they land anywhere else.",
      },
      { key: 'offer', label: 'Offer line', default: "Here's 10% off your first order for showing up." },
      {
        key: 'codeTerms',
        label: 'Code terms',
        hint: '{expires} becomes the code’s expiry date, e.g. 4 October.',
        default: 'Enter at checkout · first order only · expires {expires}',
      },
      { key: 'ctaLabel', label: 'Button text', default: 'Use my 10%' },
      { key: 'listHeading', label: '"What you’ll get" heading', default: "What you'll get" },
      {
        key: 'listItems',
        label: '"What you’ll get" items, one per line',
        multiline: true,
        default: 'Drop alerts, before anyone else\nRestocks of the ones that sold out\nThings we only tell the list',
      },
      { key: 'signoff', label: 'Sign-off', default: 'Wear it loud.' },
    ],
  },
```

- [ ] **Step 4: Add the shared unsubscribe footer to `layout.ts`**

Append to `lib/server/emails/layout.ts`:

```typescript
/**
 * Every marketing send (not the three transactional order emails, which are
 * triggered by something the customer just did) needs this: a visible link
 * and the headers mail clients use to offer a one-click unsubscribe button of
 * their own.
 */
export function unsubscribeFooter(unsubscribeUrl: string): { html: string; text: string } {
  return {
    html: `
      <p style="margin:12px 0 0;font-size:11px;line-height:1.7;color:${GREY};">
        You're getting this because you joined the list.
        <a href="${unsubscribeUrl}" style="color:${GREY};">Unsubscribe</a>
      </p>`,
    text: `You're getting this because you joined the list. Unsubscribe: ${unsubscribeUrl}`,
  }
}
```

- [ ] **Step 5: Add `headers` to `OutgoingEmail` and pass them through in `sendEmail`**

In `lib/server/email.ts`, change the `OutgoingEmail` interface:

```typescript
export interface OutgoingEmail {
  to: string
  subject: string
  html: string
  /** Always send one. HTML-only mail filters badly and some clients show nothing. */
  text: string
  /** Extra headers, e.g. List-Unsubscribe for marketing mail. Omit for transactional mail. */
  headers?: Record<string, string>
}
```

Then in the `client().emails.send(...)` call inside `sendEmail`, add `headers: email.headers` alongside the existing fields:

```typescript
    const { error } = await client().emails.send({
      from: FROM,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      headers: email.headers,
    })
```

- [ ] **Step 6: Implement `welcome.ts`**

```typescript
// lib/server/emails/welcome.ts
import type { OutgoingEmail } from '@/lib/server/email'
import { siteUrl } from '@/lib/server/siteUrl'

import { fill, mergeCopy, type Copy } from './defaults'
import { escapeHtml, shell, unsubscribeFooter } from './layout'

const INK = '#0D0D0D'
const GREY = '#6F6F73'
const PINK = '#FF8AC7'

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }

/** Sent once, the moment a signup claims its welcome code (see newsletter.repo.ts). */
export function welcomeEmail(
  email: string,
  code: string,
  expiresAt: Date,
  unsubscribeToken: string,
  stored?: Copy | null,
): OutgoingEmail {
  const COPY = mergeCopy('welcome', stored)
  const expires = expiresAt.toLocaleDateString('en-US', DATE_FORMAT)
  const vars = { expires }
  const codeTerms = fill(COPY.codeTerms, vars)
  const listItems = COPY.listItems.split('\n').map((l) => l.trim()).filter(Boolean)
  const unsubscribeUrl = `${siteUrl()}/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`
  const footer = unsubscribeFooter(unsubscribeUrl)

  const html = shell(
    COPY.headline,
    `
    <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:${INK};">
      ${escapeHtml(COPY.body)}
    </p>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:${INK};">
      ${escapeHtml(COPY.offer)}
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${PINK}20;border:2px dashed ${INK};margin:0 0 24px;">
      <tr><td style="padding:20px;text-align:center;">
        <div style="font-family:'Courier New',monospace;font-weight:bold;font-size:18px;letter-spacing:0.06em;color:${INK};">
          ${escapeHtml(code)}
        </div>
        <div style="margin:8px 0 16px;font-size:12px;color:${GREY};">${escapeHtml(codeTerms)}</div>
        <a href="${siteUrl()}/inventory"
           style="display:inline-block;background:${INK};color:#FFFFFF;text-decoration:none;padding:13px 26px;font-size:12px;font-weight:bold;letter-spacing:0.1em;text-transform:uppercase;">
          ${escapeHtml(COPY.ctaLabel)}
        </a>
      </td></tr>
    </table>
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:${GREY};">
      ${escapeHtml(COPY.listHeading)}
    </p>
    <p style="margin:0 0 24px;font-size:13px;line-height:1.9;color:${INK};">
      ${listItems.map((l) => `&#9654; ${escapeHtml(l)}`).join('<br>')}
    </p>
    <p style="margin:0;font-size:13px;font-weight:bold;color:#FF4FA3;">
      ${escapeHtml(COPY.signoff)}
    </p>
    ${footer.html}`,
  )

  const text = [
    COPY.headline,
    '',
    COPY.body,
    '',
    COPY.offer,
    '',
    code,
    codeTerms,
    `${COPY.ctaLabel}: ${siteUrl()}/inventory`,
    '',
    COPY.listHeading,
    ...listItems.map((l) => `- ${l}`),
    '',
    COPY.signoff,
    '',
    footer.text,
  ].join('\n')

  return { to: email, subject: COPY.subject, html, text, headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } }
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx vitest run __tests__/welcomeEmail.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 8: Run the full order-email regression test**

Run: `npx vitest run __tests__/emailTemplates.test.ts`
Expected: PASS — confirms `OutgoingEmail.headers` being optional didn't break the three existing templates.

- [ ] **Step 9: Commit**

```bash
git add lib/server/emails/defaults.ts lib/server/emails/layout.ts lib/server/emails/welcome.ts lib/server/email.ts __tests__/welcomeEmail.test.ts
git commit -m "feat: welcome email template"
```

---

## Task 8: Hero GIF

**Files:**
- Create: `scripts/make-welcome-hero.py`
- Create (generated, committed as a binary asset): `public/email/welcome-hero.gif`

**Interfaces:**
- Produces: `public/email/welcome-hero.gif`, referenced by URL from `welcomeEmail`'s HTML in Task 7 (add the `<img>` in this task — see Step 4).
- Reads: `public/assets/loading/layer-{sky,stars,clouds,buildings,road}.png`, `public/assets/scribbs/scribbs-right-{both,left,right}.png`, `public/assets/heath/heath-right-{both,left,right}.png`.

- [ ] **Step 1: Write the generator script**

```python
#!/usr/bin/env python3
"""
Builds public/email/welcome-hero.gif — the loading-scene strip used at the
top of the welcome email, with the pink "ITEM OBTAINED / 10% OFF" card and
the walking Scribbs + Heath sprites baked in as pixels (email clients ignore
web fonts and can't run CSS animations, so this has to be a real animated
GIF, not the live CSS version used in the browser mockups).

Run from the repo root: python3 scripts/make-welcome-hero.py
Requires Pillow (already a project dependency of nothing else here — install
with `pip install pillow` if missing).
"""
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "public" / "assets"
OUT = ROOT / "public" / "email" / "welcome-hero.gif"
FONT_PATH = ROOT / "scripts" / "fonts" / "PressStart2P-Regular.ttf"

W, H = 640, 280
FRAMES = 16
FRAME_MS = 90

PINK = (255, 138, 199, 255)
PINK_CARD = (255, 138, 199, 255)
INK = (13, 13, 13, 255)
WHITE = (255, 255, 255, 255)


def load(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


def scaled_to_height(img: Image.Image, height: int) -> Image.Image:
    ratio = height / img.height
    return img.resize((max(1, round(img.width * ratio)), height), Image.NEAREST)


def build_frame(sky, stars, clouds, buildings, road, scribbs_frames, heath_frames, i: int, font) -> Image.Image:
    frame = Image.new("RGBA", (W, H), PINK)

    # Sky + stars fill the top ~55%.
    sky_h = int(H * 0.55)
    frame.paste(scaled_to_height(sky, sky_h).resize((W, sky_h)), (0, 0))
    star_alpha = int(120 + 80 * math.sin(i / FRAMES * 2 * math.pi))
    stars_layer = scaled_to_height(stars, sky_h).resize((W, sky_h)).copy()
    stars_layer.putalpha(stars_layer.getchannel("A").point(lambda a: min(a, star_alpha)))
    frame.paste(stars_layer, (0, 0), stars_layer)

    # Clouds drift slowly.
    clouds_scaled = scaled_to_height(clouds, sky_h)
    offset = int((i / FRAMES) * clouds_scaled.width) % clouds_scaled.width
    strip = Image.new("RGBA", (W, sky_h))
    strip.paste(clouds_scaled, (-offset, 0), clouds_scaled)
    strip.paste(clouds_scaled, (clouds_scaled.width - offset, 0), clouds_scaled)
    frame.paste(strip, (0, 0), strip)

    # Ground band.
    ground_top = int(H * 0.55)
    draw = ImageDraw.Draw(frame)
    draw.rectangle([0, ground_top, W, H], fill=(42, 34, 30, 255))

    bld_h = int(H * 0.30)
    bld = scaled_to_height(buildings, bld_h)
    b_offset = int((i / FRAMES) * bld.width * 0.4) % bld.width
    bstrip = Image.new("RGBA", (W, bld_h))
    bstrip.paste(bld, (-b_offset, 0), bld)
    bstrip.paste(bld, (bld.width - b_offset, 0), bld)
    frame.paste(bstrip, (0, ground_top), bstrip)

    road_h = int(H * 0.14)
    rd = scaled_to_height(road, road_h)
    r_offset = int((i / FRAMES) * rd.width) % rd.width
    rstrip = Image.new("RGBA", (W, road_h))
    rstrip.paste(rd, (-r_offset, 0), rd)
    rstrip.paste(rd, (rd.width - r_offset, 0), rd)
    frame.paste(rstrip, (0, H - road_h), rstrip)

    # Walkers: 4-phase cycle (both, left, both, right) held in fours across
    # the 16 frames, same rhythm as the site's CSS walk cycle.
    phase = (i // 4) % 4
    pose = ["both", "left", "both", "right"][phase]
    walk_h = 56
    scribbs = scaled_to_height(scribbs_frames[pose], walk_h)
    heath = scaled_to_height(heath_frames[pose], walk_h)
    walk_y = H - road_h - walk_h + 6
    cx = W // 2
    frame.paste(scribbs, (cx - scribbs.width - 6, walk_y), scribbs)
    frame.paste(heath, (cx + 6, walk_y), heath)

    # Item card.
    card_w, card_h = 300, 118
    card_x, card_y = (W - card_w) // 2, 20
    draw.rectangle(
        [card_x, card_y, card_x + card_w, card_y + card_h],
        fill=PINK_CARD, outline=WHITE, width=4,
    )
    draw.text((cx, card_y + 18), "★ ITEM OBTAINED ★", font=font, fill=INK, anchor="mm")
    big_font = ImageFont.truetype(str(FONT_PATH), 28)
    draw.text((cx, card_y + 52), "10% OFF", font=big_font, fill=INK, anchor="mm")
    chip_w, chip_h = 220, 30
    chip_x, chip_y = cx - chip_w // 2, card_y + card_h - chip_h - 10
    draw.rectangle([chip_x, chip_y, chip_x + chip_w, chip_y + chip_h], fill=WHITE, outline=INK, width=2)
    small_font = ImageFont.truetype(str(FONT_PATH), 12)
    draw.text((cx, chip_y + chip_h // 2), "SCRIPTS-XXXX", font=small_font, fill=INK, anchor="mm")

    return frame.convert("RGB")


def main() -> None:
    sky = load(ASSETS / "loading" / "layer-sky.png")
    stars = load(ASSETS / "loading" / "layer-stars.png")
    clouds = load(ASSETS / "loading" / "layer-clouds.png")
    buildings = load(ASSETS / "loading" / "layer-buildings.png")
    road = load(ASSETS / "loading" / "layer-road.png")
    scribbs_frames = {
        "both": load(ASSETS / "scribbs" / "scribbs-right-both.png"),
        "left": load(ASSETS / "scribbs" / "scribbs-right-left.png"),
        "right": load(ASSETS / "scribbs" / "scribbs-right-right.png"),
    }
    heath_frames = {
        "both": load(ASSETS / "heath" / "heath-right-both.png"),
        "left": load(ASSETS / "heath" / "heath-right-left.png"),
        "right": load(ASSETS / "heath" / "heath-right-right.png"),
    }
    font = ImageFont.truetype(str(FONT_PATH), 9)

    frames = [
        build_frame(sky, stars, clouds, buildings, road, scribbs_frames, heath_frames, i, font)
        for i in range(FRAMES)
    ]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        OUT, save_all=True, append_images=frames[1:], duration=FRAME_MS, loop=0, optimize=True,
    )
    print(f"wrote {OUT} ({OUT.stat().st_size / 1024:.0f} KB, {len(frames)} frames)")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Get the pixel font**

```bash
mkdir -p scripts/fonts
curl -sL -o scripts/fonts/PressStart2P-Regular.ttf \
  https://github.com/google/fonts/raw/main/ofl/pressstart2p/PressStart2P-Regular.ttf
```

- [ ] **Step 3: Install Pillow and run the script**

```bash
pip install --quiet pillow
python3 scripts/make-welcome-hero.py
```

Expected: prints `wrote public/email/welcome-hero.gif (NNN KB, 16 frames)`.

- [ ] **Step 4: Check the size and look at it**

```bash
ls -la public/email/welcome-hero.gif
```

Expected: under 700 KB (spec target is 300-600 KB). If it's larger, lower `FRAMES` to 12 or the canvas `W, H` slightly, then re-run.

Open the file in a browser (`open public/email/welcome-hero.gif` on macOS) and confirm: the sky/clouds/road scroll, Scribbs and Heath's legs cycle, and the card reads "ITEM OBTAINED / 10% OFF / SCRIPTS-XXXX" clearly at the size it'll render in an inbox (about 420px wide — check by opening the file at a small window size).

- [ ] **Step 5: Wire the hero into the welcome email**

In `lib/server/emails/welcome.ts` (from Task 7), add the hero image above the headline. Insert this as the first argument change to `shell(...)` — since `shell()` takes `(headline, body)` and always renders the headline as text, add the hero as the first element of the `body` string instead:

Find:
```typescript
  const html = shell(
    COPY.headline,
    `
    <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:${INK};">
```

Replace with:
```typescript
  const html = shell(
    COPY.headline,
    `
    <img src="${siteUrl()}/email/welcome-hero.gif" width="520" alt="SCR!PTS: item obtained, 10% off, code ${escapeHtml(code)}"
         style="display:block;width:100%;max-width:520px;height:auto;margin:0 0 24px;">
    <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:${INK};">
```

- [ ] **Step 6: Re-run the welcome email test**

Run: `npx vitest run __tests__/welcomeEmail.test.ts`
Expected: PASS (the hero `<img>` doesn't change the assertions already written, which check for the code and headline text elsewhere in the HTML)

- [ ] **Step 7: Commit**

```bash
git add scripts/make-welcome-hero.py public/email/welcome-hero.gif lib/server/emails/welcome.ts
git commit -m "feat: generate and wire in the welcome email hero GIF"
```

(If `scripts/fonts/PressStart2P-Regular.ttf` should not be committed as a repo asset, add `scripts/fonts/` to `.gitignore` before this commit and note in the commit message that the font is fetched by Step 2, not stored — check with the project owner if unsure; default to committing it, since the script has no other way to reproduce the exact hero without network access at build time.)

---

## Task 9: Wire the newsletter route end to end

**Files:**
- Modify: `app/api/newsletter/route.ts`
- Create: `__tests__/newsletterRoute.test.ts`

**Interfaces:**
- Consumes: `checkRateLimit` (Task 2), `randomWelcomeCode` (Task 3), `createWelcomePromoCode` (Task 4), `isStripeConfigured`, `stripe` (existing, `lib/server/stripe.ts`), `addSignup`, `claimWelcomeCode`, `markWelcomeSent`, `findSignupByUnsubscribeToken` (Task 5), `welcomeEmail` (Task 7), `getCopy` (existing, `lib/server/emailCopy.repo.ts`), `sendEmail` (existing, `lib/server/email.ts`).
- Produces: the route's behaviour — always `201 { subscribed: true }` for a valid, rate-limit-passing email; `429` when rate limited.

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/newsletterRoute.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest'

const addSignup = vi.fn()
const claimWelcomeCode = vi.fn()
const markWelcomeSent = vi.fn()
const findSignupByUnsubscribeToken = vi.fn()
const createWelcomePromoCode = vi.fn()
const sendEmail = vi.fn()

vi.mock('@/lib/server/supabase', () => ({ isDatabaseConfigured: () => true }))
vi.mock('@/lib/server/newsletter.repo', () => ({
  addSignup, claimWelcomeCode, markWelcomeSent, findSignupByUnsubscribeToken,
}))
vi.mock('@/lib/server/stripe', () => ({
  createWelcomePromoCode, isStripeConfigured: () => true,
}))
vi.mock('@/lib/server/email', () => ({ sendEmail }))
vi.mock('@/lib/server/emailCopy.repo', () => ({ getCopy: async () => ({}) }))

function req(body: unknown, ip = '9.9.9.9') {
  return new Request('http://localhost/api/newsletter', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  addSignup.mockReset().mockResolvedValue(undefined)
  claimWelcomeCode.mockReset().mockResolvedValue(true)
  markWelcomeSent.mockReset().mockResolvedValue(undefined)
  createWelcomePromoCode.mockReset().mockResolvedValue(undefined)
  sendEmail.mockReset().mockResolvedValue({ sent: true })
})

describe('POST /api/newsletter', () => {
  it('subscribes, claims a code, creates it in Stripe, and emails it', async () => {
    const { POST } = await import('@/app/api/newsletter/route')
    const res = await POST(req({ email: 'fan@example.com' }, '1.1.1.1'))
    expect(res.status).toBe(201)
    expect(addSignup).toHaveBeenCalledWith('fan@example.com', undefined)
    expect(claimWelcomeCode).toHaveBeenCalled()
    expect(createWelcomePromoCode).toHaveBeenCalled()
    expect(sendEmail).toHaveBeenCalled()
    expect(markWelcomeSent).toHaveBeenCalledWith('fan@example.com')
  })

  it('sends no second email when the signup already has a code', async () => {
    claimWelcomeCode.mockResolvedValue(false)
    const { POST } = await import('@/app/api/newsletter/route')
    const res = await POST(req({ email: 'fan@example.com' }, '2.2.2.2'))
    expect(res.status).toBe(201)
    expect(sendEmail).not.toHaveBeenCalled()
    expect(createWelcomePromoCode).not.toHaveBeenCalled()
  })

  it('still answers 201 when Stripe fails, and never marks welcome_sent', async () => {
    createWelcomePromoCode.mockRejectedValue(new Error('stripe down'))
    const { POST } = await import('@/app/api/newsletter/route')
    const res = await POST(req({ email: 'fan@example.com' }, '3.3.3.3'))
    expect(res.status).toBe(201)
    expect(sendEmail).not.toHaveBeenCalled()
    expect(markWelcomeSent).not.toHaveBeenCalled()
  })

  it('rejects the 6th request from the same IP within a minute', async () => {
    const { POST } = await import('@/app/api/newsletter/route')
    for (let i = 0; i < 5; i++) {
      const res = await POST(req({ email: `f${i}@example.com` }, '4.4.4.4'))
      expect(res.status).toBe(201)
    }
    const sixth = await POST(req({ email: 'f5@example.com' }, '4.4.4.4'))
    expect(sixth.status).toBe(429)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run __tests__/newsletterRoute.test.ts`
Expected: FAIL — route doesn't call the mocked functions yet (current implementation only calls `addSignup`)

- [ ] **Step 3: Widen `claimWelcomeCode` to also return the row's unsubscribe token**

The route needs the unsubscribe token from the same row it just claimed a code
on, so `claimWelcomeCode` returns the claimed row's token instead of a bare
boolean. In `lib/server/newsletter.repo.ts`, replace the `claimWelcomeCode`
function with:

```typescript
export interface ClaimedCode {
  unsubscribeToken: string
}

/**
 * Reserve `code` for `email`, but only if that email has never had one.
 *
 * This is the whole safety mechanism against double-sends: two concurrent
 * signups (a double click, a retried request) race to `update ... where
 * welcome_code is null`, and only one of them can win that row. The loser's
 * update touches zero rows and gets `null` back — no code, no email.
 */
export async function claimWelcomeCode(email: string, code: string, expiresAt: Date): Promise<ClaimedCode | null> {
  if (!isDatabaseConfigured()) return null

  const { data, error } = await serverClient()
    .from('newsletter_signups')
    .update({ welcome_code: code, welcome_code_expires_at: expiresAt.toISOString() })
    .eq('email', email.toLowerCase().trim())
    .is('welcome_code', null)
    .select('unsubscribe_token')
    .maybeSingle()

  if (error) throw new Error(`claimWelcomeCode: ${error.message}`)
  return data ? { unsubscribeToken: (data as { unsubscribe_token: string }).unsubscribe_token } : null
}
```

Update `__tests__/newsletterRepo.test.ts`'s two `claimWelcomeCode` tests to match
this return shape. In the first test (`'returns true when the update reports
one row changed'`), rename it and change the mock and assertion:

```typescript
  it('returns the row\'s unsubscribe token when the update reports one row changed', async () => {
    const { serverClient } = await import('@/lib/server/supabase')
    const single = vi.fn().mockResolvedValue({ data: { unsubscribe_token: 'tok_x' }, error: null })
    vi.mocked(serverClient).mockReturnValueOnce({
      from: () => ({
        update: () => ({ eq: () => ({ is: () => ({ select: () => ({ maybeSingle: single }) }) }) }),
      }),
    } as never)
    const { claimWelcomeCode } = await import('@/lib/server/newsletter.repo')
    const claimed = await claimWelcomeCode('a@b.com', 'SCRIPTS-AAAA', new Date())
    expect(claimed).toEqual({ unsubscribeToken: 'tok_x' })
  })
```

In the second test, rename it and change the assertion:

```typescript
  it('returns null when no row matched (already has a code)', async () => {
    const { serverClient } = await import('@/lib/server/supabase')
    const single = vi.fn().mockResolvedValue({ data: null, error: null })
    vi.mocked(serverClient).mockReturnValueOnce({
      from: () => ({
        update: () => ({ eq: () => ({ is: () => ({ select: () => ({ maybeSingle: single }) }) }) }),
      }),
    } as never)
    const { claimWelcomeCode } = await import('@/lib/server/newsletter.repo')
    const claimed = await claimWelcomeCode('a@b.com', 'SCRIPTS-AAAA', new Date())
    expect(claimed).toBeNull()
  })
```

- [ ] **Step 4: Implement the route**

Replace the full contents of `app/api/newsletter/route.ts`:

```typescript
import { fail, notConfigured, ok } from '@/lib/server/http'
import { addSignup, claimWelcomeCode, markWelcomeSent } from '@/lib/server/newsletter.repo'
import { isDatabaseConfigured } from '@/lib/server/supabase'
import { newsletterSchema } from '@/lib/schemas/product'
import { checkRateLimit } from '@/lib/server/rateLimit'
import { randomWelcomeCode } from '@/lib/server/promoCode'
import { createWelcomePromoCode, isStripeConfigured } from '@/lib/server/stripe'
import { welcomeEmail } from '@/lib/server/emails/welcome'
import { getCopy } from '@/lib/server/emailCopy.repo'
import { sendEmail } from '@/lib/server/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CODE_LIFETIME_MS = 14 * 24 * 60 * 60 * 1000

function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

/**
 * POST — join the list, and (best-effort) get a one-time 10% code by email.
 *
 * The response is always `{ subscribed: true }` once the address itself is
 * valid: a Stripe or Resend failure downstream must never make a visitor
 * think signing up didn't work. `welcome_sent_at` stays null on any failure,
 * which is where a future retry job or manual resend would look.
 */
export async function POST(req: Request) {
  if (!isDatabaseConfigured()) return notConfigured()

  if (!checkRateLimit(`newsletter:${clientIp(req)}`, { limit: 5, windowMs: 60_000 })) {
    return fail(429, 'Too many attempts. Try again in a minute.')
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail(400, 'Expected a JSON body.')
  }

  const parsed = newsletterSchema.safeParse(body)
  if (!parsed.success) {
    return fail(422, 'Enter a valid email address.', parsed.error.flatten())
  }

  const email = parsed.data.email.toLowerCase().trim()
  await addSignup(email, parsed.data.source)

  try {
    if (isStripeConfigured()) {
      const code = randomWelcomeCode()
      const expiresAt = new Date(Date.now() + CODE_LIFETIME_MS)
      const claimed = await claimWelcomeCode(email, code, expiresAt)
      if (claimed) {
        await createWelcomePromoCode(code, expiresAt)
        const copy = await getCopy('welcome')
        const mail = welcomeEmail(email, code, expiresAt, claimed.unsubscribeToken, copy)
        const result = await sendEmail(mail)
        if (result.sent) await markWelcomeSent(email)
        else console.error(`[newsletter] welcome email to ${email} not sent: ${result.reason}`)
      }
    }
  } catch (err) {
    // Signup is already saved. A Stripe or database hiccup here must not
    // surface to the visitor — log it and let a human notice welcome_sent_at
    // is still null.
    console.error('[newsletter] welcome flow failed:', err)
  }

  return ok({ subscribed: true }, 201)
}
```

- [ ] **Step 5: Run the repo test and the route test**

Run: `npx vitest run __tests__/newsletterRepo.test.ts __tests__/newsletterRoute.test.ts`
Expected: PASS (2 + 4 tests)

- [ ] **Step 6: Run the whole suite to catch anything the `claimWelcomeCode` signature change touched**

Run: `npx vitest run`
Expected: PASS. If anything else calls `claimWelcomeCode`, fix its usage to match the new `ClaimedCode | null` return (nothing else does at this point in the plan — Task 5 introduced it and only this task consumes it).

- [ ] **Step 7: Commit**

```bash
git add app/api/newsletter/route.ts lib/server/newsletter.repo.ts __tests__/newsletterRepo.test.ts __tests__/newsletterRoute.test.ts
git commit -m "feat: wire signup to welcome code + email end to end"
```

---

## Task 10: Checkout accepts the code; admin Emails tab gets the Welcome template

**Files:**
- Modify: `app/api/checkout/session/route.ts`
- Modify: `app/office-scr1pts-x7k2/emails/page.tsx`
- Modify: `app/api/admin/email-copy/route.ts`

**Interfaces:**
- Consumes: `welcomeEmail` (Task 7), `TEMPLATES` (Task 7's widened `defaults.ts`).
- No new exports — this task only wires existing pieces together.

- [ ] **Step 1: Let Stripe Checkout accept a promo code**

In `app/api/checkout/session/route.ts`, find the `stripe().checkout.sessions.create({...})` call and add `allow_promotion_codes: true` alongside the existing top-level options (next to `mode: 'payment'`):

```typescript
  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    allow_promotion_codes: true,
    line_items: lineItems,
```

- [ ] **Step 2: Verify manually against Stripe test mode**

Run: `npm run dev`, add an item to the cart, go to checkout. On Stripe's hosted page, confirm an "Add promotion code" link now appears below the payment fields.
Expected: the link is visible; entering a code Stripe doesn't recognise shows Stripe's own inline error, no code change needed on our side.

- [ ] **Step 3: Widen the admin email-copy schema**

In `app/api/admin/email-copy/route.ts`, find:

```typescript
const bodySchema = z.object({
  template: z.enum(['order_confirmation', 'order_shipped', 'order_delivered']),
```

Replace with:

```typescript
const bodySchema = z.object({
  template: z.enum(['order_confirmation', 'order_shipped', 'order_delivered', 'welcome']),
```

- [ ] **Step 4: Add the Welcome preview to the admin Emails page**

In `app/office-scr1pts-x7k2/emails/page.tsx`:

Add the import:
```typescript
import { welcomeEmail } from '@/lib/server/emails/welcome'
```

Change the `BUILDERS` map — it currently has a uniform `(order, copy) => OutgoingEmail` shape, but `welcomeEmail` takes different arguments, so build the welcome preview separately rather than forcing it into that map. Find:

```typescript
const BUILDERS = {
  order_confirmation: orderConfirmationEmail,
  order_shipped: orderShippedEmail,
  order_delivered: orderDeliveredEmail,
} as const

export default async function EmailsPage() {
  const stored = await getAllCopy()

  const tabs: EmailTab[] = TEMPLATES.map((spec) => {
    const id = spec.id as EmailTemplateId
    const mail = BUILDERS[id](SAMPLE, stored[id])
    return {
      spec,
      initial: stored[id] ?? {},
      preview: { subject: mail.subject, html: mail.html, text: mail.text },
    }
  })
```

Replace with:

```typescript
const ORDER_BUILDERS = {
  order_confirmation: orderConfirmationEmail,
  order_shipped: orderShippedEmail,
  order_delivered: orderDeliveredEmail,
} as const

const SAMPLE_EXPIRES = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

export default async function EmailsPage() {
  const stored = await getAllCopy()

  const tabs: EmailTab[] = TEMPLATES.map((spec) => {
    const id = spec.id as EmailTemplateId
    const mail =
      id === 'welcome'
        ? welcomeEmail('fan@example.com', 'SCRIPTS-K7M2', SAMPLE_EXPIRES, 'sample-token', stored[id])
        : ORDER_BUILDERS[id as 'order_confirmation' | 'order_shipped' | 'order_delivered'](SAMPLE, stored[id])
    return {
      spec,
      initial: stored[id] ?? {},
      preview: { subject: mail.subject, html: mail.html, text: mail.text },
    }
  })
```

- [ ] **Step 5: Run the full test suite and typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: both PASS

- [ ] **Step 6: Verify manually**

Run: `npm run dev`, sign in to `/office-scr1pts-x7k2/login`, open `/office-scr1pts-x7k2/emails`, and confirm a fourth "Welcome" tab appears with a live preview and editable fields, and that saving a change to it round-trips (reload the page, the edited field persists).

- [ ] **Step 7: Commit**

```bash
git add app/api/checkout/session/route.ts app/office-scr1pts-x7k2/emails/page.tsx app/api/admin/email-copy/route.ts
git commit -m "feat: checkout accepts promo codes; admin can edit the Welcome email"
```

---

## Task 11: Order discount — recorded, and shown wherever a total is shown

**Files:**
- Modify: `lib/admin/types.ts`
- Modify: `lib/admin/mockOrders.ts`
- Modify: `lib/server/orders.repo.ts`
- Modify: `app/api/webhooks/stripe/route.ts`
- Modify: `lib/server/emails/layout.ts` (`orderTable`, `orderTableText`)
- Modify: `components/admin/OrderDrawer.tsx`
- Modify: `app/api/checkout/status/route.ts`
- Modify: `app/checkout/success/page.tsx`
- Create: `__tests__/orderDiscount.test.ts`

**Interfaces:**
- Consumes: existing `AdminOrder`, `NewOrder`, `OrderRow`, `rowToOrder`, `orderTable`/`orderTableText` (all already read above).
- Produces: `AdminOrder.discount: number`, `NewOrder.discount: number`, `OrderRow.discount: number | string`; `orderTable`/`orderTableText` render a Discount row when `order.discount > 0`.

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/orderDiscount.test.ts
import { describe, expect, it } from 'vitest'
import type { AdminOrder } from '@/lib/admin/types'
import { orderTable, orderTableText } from '@/lib/server/emails/layout'

const baseOrder = (discount: number): AdminOrder => ({
  id: 'SCR-2001',
  customer: { name: 'Fan', email: 'fan@example.com', phone: '', address: [] },
  lineItems: [{ productName: '"ANXIETY" — White', size: 'M', qty: 1, unitPrice: 44 }],
  subtotal: 44,
  shipping: 0,
  discount,
  total: 44 - discount,
  date: '2026-09-27',
  status: 'paid',
  paymentStatus: 'paid',
  timeline: { placedAt: '2026-09-27T10:00:00Z', makingAt: null, shippedAt: null, deliveredAt: null },
})

describe('order discount display', () => {
  it('shows no Discount row when there is no discount', () => {
    expect(orderTable(baseOrder(0))).not.toContain('Discount')
    expect(orderTableText(baseOrder(0))).not.toContain('Discount')
  })

  it('shows the Discount row and a correct total when a code was used', () => {
    const order = baseOrder(4.4)
    expect(orderTable(order)).toContain('Discount')
    expect(orderTable(order)).toContain('39.60')
    expect(orderTableText(order)).toContain('Discount')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run __tests__/orderDiscount.test.ts`
Expected: FAIL — `AdminOrder` has no `discount` field (TypeScript error) and `orderTable` doesn't render one

- [ ] **Step 3: Add `discount` to `AdminOrder`**

In `lib/admin/types.ts`, find:

```typescript
export interface AdminOrder {
  id: string // 'SCR-1042'
  customer: OrderCustomer
  lineItems: OrderLineItem[]
  subtotal: number
  shipping: number // 0 = free
  total: number // subtotal + shipping
```

Replace with:

```typescript
export interface AdminOrder {
  id: string // 'SCR-1042'
  customer: OrderCustomer
  lineItems: OrderLineItem[]
  subtotal: number
  shipping: number // 0 = free
  discount: number // 0 = no promo code used
  total: number // subtotal - discount + shipping
```

- [ ] **Step 4: Give every mock order a `discount: 0`**

In `lib/admin/mockOrders.ts`, each object in `MOCK_ORDERS` needs `discount: 0` added next to its existing `shipping` field. Find every occurrence of a line matching `shipping: <number>,` in that file and add `discount: 0,` directly after it. (There is one such line per mock order — check the file's current order count with `grep -c "shipping:" lib/admin/mockOrders.ts` first, and add one `discount: 0,` per match.)

- [ ] **Step 5: Update `orderTable`/`orderTableText` in `layout.ts`**

Find the `orderTable` function's row block:

```typescript
    <tr>
      <td style="padding:12px 0;font-size:13px;color:${GREY};">Shipping</td>
      <td style="padding:12px 0;font-size:13px;color:${GREY};text-align:right;">
        ${order.shipping === 0 ? 'Free' : money(order.shipping)}
      </td>
    </tr>
    <tr>
      <td style="padding:12px 0;border-top:2px solid ${INK};font-size:14px;font-weight:bold;color:${INK};text-transform:uppercase;letter-spacing:0.04em;">Total</td>
      <td style="padding:12px 0;border-top:2px solid ${INK};font-size:16px;font-weight:bold;color:${INK};text-align:right;">
        ${money(order.total)}
      </td>
    </tr>
  </table>`
```

Replace with:

```typescript
    <tr>
      <td style="padding:12px 0;font-size:13px;color:${GREY};">Shipping</td>
      <td style="padding:12px 0;font-size:13px;color:${GREY};text-align:right;">
        ${order.shipping === 0 ? 'Free' : money(order.shipping)}
      </td>
    </tr>
    ${
      order.discount > 0
        ? `<tr>
      <td style="padding:12px 0;font-size:13px;color:${GREY};">Discount</td>
      <td style="padding:12px 0;font-size:13px;color:${GREY};text-align:right;">&minus;${money(order.discount)}</td>
    </tr>`
        : ''
    }
    <tr>
      <td style="padding:12px 0;border-top:2px solid ${INK};font-size:14px;font-weight:bold;color:${INK};text-transform:uppercase;letter-spacing:0.04em;">Total</td>
      <td style="padding:12px 0;border-top:2px solid ${INK};font-size:16px;font-weight:bold;color:${INK};text-align:right;">
        ${money(order.total)}
      </td>
    </tr>
  </table>`
```

Find `orderTableText`:

```typescript
  lines.push(`  Shipping   ${order.shipping === 0 ? 'Free' : money(order.shipping)}`)
  lines.push(`  TOTAL      ${money(order.total)}`)
```

Replace with:

```typescript
  lines.push(`  Shipping   ${order.shipping === 0 ? 'Free' : money(order.shipping)}`)
  if (order.discount > 0) lines.push(`  Discount   -${money(order.discount)}`)
  lines.push(`  TOTAL      ${money(order.total)}`)
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run __tests__/orderDiscount.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 7: Run the existing email template tests (they build `AdminOrder`s too)**

Run: `npx vitest run __tests__/emailTemplates.test.ts`
Expected: FAIL — the test file's local `order()` helper builds an `AdminOrder` without `discount`, which is now a type error.

Fix `__tests__/emailTemplates.test.ts`: in its `order = (over: Partial<AdminOrder> = {}): AdminOrder => ({ ... })` helper, add `discount: 0,` next to the existing `shipping: 0,` line.

Run: `npx vitest run __tests__/emailTemplates.test.ts`
Expected: PASS

- [ ] **Step 8: Thread `discount` through the orders repo and the webhook**

In `lib/server/orders.repo.ts`:

Add `discount` to `OrderRow`:
```typescript
interface OrderRow {
  id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  address: string[] | null
  subtotal: number | string
  shipping: number | string
  discount: number | string
  total: number | string
```

Add it to `rowToOrder`'s return, next to `shipping: num(row.shipping),`:
```typescript
    subtotal: num(row.subtotal),
    shipping: num(row.shipping),
    discount: num(row.discount),
```

Add it to `SELECT`:
```typescript
const SELECT = `
  id, customer_name, customer_email, customer_phone, address, subtotal,
  shipping, discount, total, status, payment_status, placed_at, making_at, shipped_at, delivered_at,
  order_items ( product_name, size, qty, unit_price )
`
```

Add it to `NewOrder`:
```typescript
export interface NewOrder {
  stripeSessionId: string
  stripePaymentIntent: string | null
  customer: { name: string; email: string; phone: string; address: string[] }
  lines: NewOrderLine[]
  subtotal: number
  shipping: number
  discount: number
  total: number
}
```

Add it to the insert in `createPaidOrder`:
```typescript
  const { error: orderErr } = await db.from('orders').insert({
    id,
    customer_name: input.customer.name,
    customer_email: input.customer.email,
    customer_phone: input.customer.phone,
    address: input.customer.address,
    subtotal: input.subtotal,
    shipping: input.shipping,
    discount: input.discount,
    total: input.total,
```

- [ ] **Step 9: Read the discount off the Stripe session in the webhook**

In `app/api/webhooks/stripe/route.ts`, find:

```typescript
      subtotal: fromMinorUnits(session.amount_subtotal ?? 0),
      shipping: fromMinorUnits(session.shipping_cost?.amount_total ?? 0),
      total: fromMinorUnits(session.amount_total ?? 0),
    })
```

Replace with:

```typescript
      subtotal: fromMinorUnits(session.amount_subtotal ?? 0),
      shipping: fromMinorUnits(session.shipping_cost?.amount_total ?? 0),
      discount: fromMinorUnits(session.total_details?.amount_discount ?? 0),
      total: fromMinorUnits(session.amount_total ?? 0),
    })
```

Stripe's default `checkout.session.completed` event does not expand `total_details` by default in all API versions used here — verify this in Step 11 below rather than assuming; if it comes back `undefined`, expand it explicitly by changing the `event = stripe().webhooks.constructEvent(...)` line's usage: after verifying the signature, re-fetch the full session with `expand: ['total_details']` before reading it. Concretely, if Step 11 shows `total_details` missing, replace:

```typescript
  const session = event.data.object as Stripe.Checkout.Session
```

with:

```typescript
  const rawSession = event.data.object as Stripe.Checkout.Session
  const session = await stripe().checkout.sessions.retrieve(rawSession.id, { expand: ['total_details'] })
```

- [ ] **Step 10: Show the discount in the admin order drawer**

In `components/admin/OrderDrawer.tsx`, find:

```tsx
              <div className="flex justify-between text-grey"><span>Subtotal</span><span className="tabular-nums">${live.subtotal}</span></div>
              <div className="flex justify-between text-grey"><span>Shipping</span><span className="tabular-nums">{live.shipping === 0 ? 'Free' : `$${live.shipping}`}</span></div>
              <div className="flex justify-between text-paper font-bold text-[13px]"><span>Total</span><span className="tabular-nums">${live.total}</span></div>
```

Replace with:

```tsx
              <div className="flex justify-between text-grey"><span>Subtotal</span><span className="tabular-nums">${live.subtotal}</span></div>
              <div className="flex justify-between text-grey"><span>Shipping</span><span className="tabular-nums">{live.shipping === 0 ? 'Free' : `$${live.shipping}`}</span></div>
              {live.discount > 0 && (
                <div className="flex justify-between text-grey"><span>Discount</span><span className="tabular-nums">&minus;${live.discount}</span></div>
              )}
              <div className="flex justify-between text-paper font-bold text-[13px]"><span>Total</span><span className="tabular-nums">${live.total}</span></div>
```

- [ ] **Step 11: Show the discount on the success page**

In `app/checkout/success/page.tsx`, find the `ConfirmedOrder` interface:

```typescript
interface ConfirmedOrder {
  number: string
  items: { name: string; size: string; qty: number; lineTotal: number }[]
  total: number
}
```

Replace with:

```typescript
interface ConfirmedOrder {
  number: string
  items: { name: string; size: string; qty: number; lineTotal: number }[]
  discount: number
  total: number
}
```

Find the totals block:

```tsx
          <div className="mt-[14px] pt-[14px] border-t border-[#0d0d0d] flex justify-between items-baseline">
            <span className="text-[13px] font-extrabold uppercase tracking-[0.04em]">Total</span>
            <span className="text-[18px] font-extrabold">${order.total.toFixed(2)}</span>
          </div>
```

Replace with:

```tsx
          {order.discount > 0 && (
            <div className="flex items-center justify-between py-[6px] text-[12px] text-[#6F6F73]">
              <span>Discount</span>
              <span>&minus;${order.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="mt-[14px] pt-[14px] border-t border-[#0d0d0d] flex justify-between items-baseline">
            <span className="text-[13px] font-extrabold uppercase tracking-[0.04em]">Total</span>
            <span className="text-[18px] font-extrabold">${order.total.toFixed(2)}</span>
          </div>
```

In `app/api/checkout/status/route.ts`, find:

```typescript
    order: {
      number: order.id,
      items: order.lineItems.map((l) => ({
        name: l.productName,
        size: l.size,
        qty: l.qty,
        lineTotal: l.unitPrice * l.qty,
      })),
      total: order.total,
    },
```

Replace with:

```typescript
    order: {
      number: order.id,
      items: order.lineItems.map((l) => ({
        name: l.productName,
        size: l.size,
        qty: l.qty,
        lineTotal: l.unitPrice * l.qty,
      })),
      discount: order.discount,
      total: order.total,
    },
```

- [ ] **Step 12: Full test run and typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: both PASS. If `tsc` flags any other `AdminOrder` literal missing `discount` (e.g. in a test file not touched above), add `discount: 0` there too — search with `grep -rln "shipping: 0" __tests__ lib app` and check each hit is either already fixed or needs the same one-line addition.

- [ ] **Step 13: Verify the whole purchase path manually in Stripe test mode**

1. `npm run dev`, sign up on `/inventory`'s footer form with a real inbox you control, using a test address (not `x.com` — that's the one to clean up, not add to).
2. Receive the welcome email; confirm the hero GIF renders, the code is legible and copyable as text, and the button and unsubscribe link both work.
3. Add an item to the cart, go to checkout, paste the code into "Add promotion code".
4. Complete payment with Stripe's `4242 4242 4242 4242` test card.
5. On the success page, confirm the Discount line and the reduced total.
6. In the admin (`/office-scr1pts-x7k2/orders`), open the order and confirm the same Discount line and total.
7. Confirm the order confirmation email also shows the Discount line.

Expected: all six numbers (Stripe's own total, the success page, the admin drawer, the confirmation email, and the two intermediate subtotal/discount lines) agree.

- [ ] **Step 14: Commit**

```bash
git add lib/admin/types.ts lib/admin/mockOrders.ts lib/server/orders.repo.ts app/api/webhooks/stripe/route.ts lib/server/emails/layout.ts components/admin/OrderDrawer.tsx app/api/checkout/status/route.ts app/checkout/success/page.tsx __tests__/orderDiscount.test.ts __tests__/emailTemplates.test.ts
git commit -m "feat: record and display order discounts end to end"
```

---

## Task 12: Clean up the QA junk row and confirm production readiness

**Files:** none (operational task, no code changes).

- [ ] **Step 1: Delete the junk newsletter signup from the earlier audit**

In the Supabase table editor (or via SQL), find and delete the row in `newsletter_signups` whose email starts with roughly 5,000 `a` characters at `@x.com` (created during the 2026-09-20 QA pass, documented in `docs/qa-prelaunch-audit-2026-09-20.md` finding M1).

```sql
delete from newsletter_signups where length(email) > 300;
```

- [ ] **Step 2: Confirm the three prerequisites from the spec**

- `RESEND_API_KEY` set in Vercel, and a sender domain (e.g. `scripts.studio` or a subdomain) verified at Resend, with `EMAIL_FROM` pointing at it. Until this is done, welcome emails only reach the Resend account owner's own inbox.
- `STRIPE_SECRET_KEY` set in Vercel (test mode is fine for a dry run; switch to the live key only when ready to actually discount real orders).
- `NEXT_PUBLIC_SITE_URL` set to the real production domain, so the hero GIF and unsubscribe links resolve correctly in production (not `localhost:3000`).

- [ ] **Step 3: Run the full suite one last time on the deployed branch**

Run: `npx vitest run && npx tsc --noEmit`
Expected: both PASS, matching Task 11 Step 12.

No commit — this task is verification and a manual database cleanup, not a code change.

---

## Self-review notes

- **Spec coverage:** Data (Task 1), signup/code claim/rate limit (Tasks 2, 3, 5), Stripe coupon+promo (Task 4), email template + hero (Tasks 7, 8), unsubscribe (Task 6), checkout `allow_promotion_codes` (Task 10), order discount everywhere a total shows (Task 11), admin Emails tab (Task 10), prerequisites + junk-row cleanup (Task 12) are all covered. Drop announcements and auto-applying the code from the button are explicitly out of scope per the spec and not planned here.
- **Type consistency:** `claimWelcomeCode`'s return type changes from `Promise<boolean>` (first drafted in Task 5) to `Promise<ClaimedCode | null>` (finalized in Task 9) because the newsletter route needs the unsubscribe token off that same row — Task 9 explicitly rewrites Task 5's test file to match rather than leaving two conflicting signatures in the plan.
- **Ambiguity resolved:** Task 8 Step 7 flags the `scripts/fonts/` binary-in-repo question explicitly rather than silently deciding; default is to commit it since the build has no other reproducible source at deploy time.
- **Ambiguity resolved:** Task 11 Step 9 doesn't assume Stripe's webhook payload includes `total_details` — it says to verify against the real payload and gives the exact fallback (`expand: ['total_details']` via a follow-up retrieve) if it's missing.
