# Welcome email with a unique 10% code

**Date:** 2026-09-20
**Status:** Design approved in conversation, awaiting spec review.
**Look reference (local, gitignored):** `.superpowers/brainstorm/15835-1789962607/content/welcome-email-final-b-v2.html`

## Goal

When someone joins the mailing list, they immediately get a designed SCR!PTS email that welcomes them, promises drop updates, and gives them a code for 10% off their first order. The code is unique to them and single use.

## Decisions made

| Decision | Choice |
|---|---|
| Look | The game's loading scene at the top (Scribbs and Heath walking) with a pink "ITEM OBTAINED / 10% OFF" card holding the code in the middle. Below it, a white section with clear centred copy. |
| Alignment | All copy centred, except the "What you'll get" list, which is left-aligned. Sign-off and footer centred again. |
| Button | "Use my 10%" sits inside the dashed code container, under the code and its terms line. |
| Code type | Unique per signup, single use, first order only, expires after 14 days. |
| Send timing | Immediately on signup. No "confirm your address" step. |
| Copy | Wording is editable in the admin Emails tab, like the order emails. |

## Copy (defaults)

- Headline: `You're in, {name}.`
- Body: `Welcome to SCR!PTS. You're on the list, which means new drops, restocks and the odd secret from the Basement land in your inbox before they land anywhere else.`
- Offer: `Here's 10% off your first order for showing up.`
- Code terms: `Enter at checkout · first order only · expires {expires}`
- Button: `Use my 10%`
- List heading `What you'll get`: drop alerts before anyone else; restocks of the ones that sold out; things we only tell the list.
- Sign-off: `Wear it loud.`
- Footer: `SCR!PTS · A home for creative culture · scripts.studio` and `You're getting this because you joined the list. Unsubscribe`
- `{name}` falls back to `there` when we have no name. The signup form only collects an email today, so v1 will normally say "You're in, there." **Open item:** decide whether to drop the name from the headline (recommended: `You're in.`) or add an optional name field to the form.

## Design

### 1. Data (`supabase/migrations/0006_welcome_code.sql`)
- `newsletter_signups` gains: `welcome_code text unique`, `welcome_code_expires_at timestamptz`, `welcome_sent_at timestamptz`, `unsubscribe_token text unique not null default (random token)`, `unsubscribed_at timestamptz`.
- `orders` gains `discount numeric not null default 0`.
- `email_copy.template` has a CHECK constraint listing the three order templates. The migration must drop and recreate it to include `'welcome'`.

### 2. Signup flow (`app/api/newsletter/route.ts`, `lib/server/newsletter.repo.ts`)
1. Validate the email (max 254 characters) and rate limit per visitor. This also closes audit item MEDIUM 1.
2. Upsert the signup row.
3. Atomically claim the right to issue a code: `update ... set welcome_code = ... where email = ? and welcome_code is null returning`. A second submit, a double click or a re-signup gets no claim, so no second code and no second email.
4. If claimed: create the Stripe promotion code, then send the welcome email, then record `welcome_sent_at`.
5. Respond `201 { subscribed: true }` whatever happens in step 4. A Stripe or email failure is logged and never shown to the visitor. The row keeps `welcome_sent_at = null` so failures are findable.

### 3. The code (`lib/server/stripe.ts`)
- One coupon, created once and looked up by a fixed id: 10% off, duration `once`.
- Per signup, a Stripe promotion code: `code` like `SCRIPTS-K7M2` (4 characters from an alphabet without 0/O/1/I), `max_redemptions: 1`, `expires_at` 14 days out, `restrictions.first_time_transaction: true`.
- Works in whichever Stripe mode the configured key belongs to. Test-mode codes do not work in live mode.

### 4. The email (`lib/server/emails/welcome.ts`, `defaults.ts`, `layout.ts`)
- New `welcome` template following the existing pattern: defaults in code, overrides from `email_copy`, `{name}` and `{expires}` filled in.
- Table-based HTML with inline styles, as the other emails. The hero is one hosted image, `public/email/welcome-hero.gif`, referenced by absolute URL from `siteUrl()`. It shows the loading scene and the item card.
- The code is repeated as real, copyable text in the white section, so the email works with images blocked. The hero image has descriptive alt text including the code.
- A plain-text version is always sent.
- Marketing email requires an unsubscribe route: the footer link, plus `List-Unsubscribe` and `List-Unsubscribe-Post` headers. `sendEmail` gains an optional `headers` field.
- The hero GIF is produced by a small script from the existing `public/assets/loading` layers and character frames, so it can be regenerated. Target size 300-600 KB.

### 5. Unsubscribe (`app/unsubscribe`, `app/api/unsubscribe/route.ts`)
- The link carries the row's `unsubscribe_token`. The page confirms with one click (POST, so link scanners do not unsubscribe people by prefetching). Sets `unsubscribed_at`.
- Copy in the SCR!PTS voice; a short confirmation state and a "changed your mind" state.

### 6. Checkout (`app/api/checkout/session/route.ts`)
- Add `allow_promotion_codes: true` to the Stripe session so the customer can paste the code on Stripe's page.
- "Use my 10%" opens the shop (`/inventory`). Auto-applying the code from the link is out of scope for v1.

### 7. Orders (`app/api/webhooks/stripe/route.ts`, `lib/server/orders.repo.ts`, emails, admin, success page)
- The webhook already reads `amount_total` and `amount_subtotal`. Store `discount` from `session.total_details.amount_discount`, which Stripe reports directly. Then `subtotal - discount + shipping = total`.
- `orderTable` and its plain-text twin, the admin order drawer and the success page show a "Discount" line when it is above zero, so totals reconcile with the line items.

### 8. Back office
- The Emails tab gains a fourth template, "Welcome", with the editable fields above.

## Prerequisites (owner actions)
- Verify a sender domain at Resend and set `EMAIL_FROM`. Until then, mail only reaches the Resend account owner, so real customers get nothing.
- Confirm `RESEND_API_KEY` and `STRIPE_SECRET_KEY` are set in Vercel.
- Set `NEXT_PUBLIC_SITE_URL` so image and unsubscribe URLs are absolute and correct.
- Delete the junk subscriber row created during QA (5,000-character email at `x.com`).

## Out of scope
- Sending drop announcements. The email promises drop updates, so a broadcast feature (compose, send to the list, respect unsubscribes) is the natural next project.
- Reminder emails ("your code expires tomorrow") and follow-up sequences.
- Confirm-your-email step (double opt-in). Accepted risk: someone can sign up with many fake addresses to collect codes. Mitigations: rate limit, one code per address, single-use first-order codes.
- Auto-applying the code from the email button.

## Failure behaviour
| Failure | Result |
|---|---|
| Stripe unavailable | Signup saved, no email, `welcome_sent_at` stays null, error logged |
| Resend unavailable or sender not verified | Signup saved, code created but unused, `welcome_sent_at` stays null, error logged |
| Duplicate signup or double submit | No second code, no second email |
| Unsubscribed person signs up again | Row is re-subscribed (`unsubscribed_at` cleared) but no second welcome code is issued |

## Testing
- Unit: code generation (alphabet, format, uniqueness), template rendering (fills, escaping, fallbacks, plain text), signup idempotency (atomic claim), unsubscribe token handling, discount arithmetic on orders.
- Route tests with Stripe and Resend mocked: success, each failure row above, rate limit, oversized email.
- End to end in Stripe test mode: sign up on the live or preview site, receive the email, check it in Gmail and Apple Mail, on phone and desktop, with images blocked and allowed, use the code at checkout, confirm the discounted total in Stripe, the order email and the admin.
