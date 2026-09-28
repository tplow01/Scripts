# SCR!PTS Pre-Launch QA Audit

**Date:** 2026-09-20
**Build tested:** `main` @ `c34c636`, `next dev` on localhost:3002 (dev server, not a production build)
**Method:** Live browser testing (headless Chromium via gstack browse at 375 / 768 / 1280 px), direct API probing with curl, and targeted code reading. Nothing was changed in the code. This document is findings only.

## Verdict: NOT READY

Three blockers, all about things that cannot be confirmed safe yet, plus several high-severity customer-facing bugs. The storefront itself (browsing, product pages, cart, layout at all three sizes) is in good shape. What is missing is proof that the money and data paths work, and one confirmed security hole.

| Severity | Count |
|---|---|
| 🔴 Blocker | 3 |
| 🟠 High | 6 |
| 🟡 Medium | 8 |
| 🟢 Low | 5 |

---

## What could NOT be tested (read this first)

The local environment has no `.env.local`, so Supabase and Stripe are unconfigured. That means these were **not exercised** and need a test-mode run before launch:

- A real Stripe Checkout session, payment, and redirect back
- The Stripe webhook writing an order, decrementing stock, and sending the confirmation email
- Newsletter signup actually saving
- Admin login and every admin write
- Out-of-stock behaviour (needs real stock rows)
- Discounts/promos: none exist in the code, so nothing to test
- Accounts/login for customers: none exist (by design, Stripe collects email)
- The Phaser game world itself. Headless Chromium has no WebGL and the game needs a click on the start screen, so movement, the vinyl deck, Heath's checkout dialogue and the inventory round-trip were not driven. This includes re-verifying the "Framebuffer status: Incomplete Attachment" fix, which should be confirmed by hand in a real browser.
- Production build behaviour, real performance numbers (dev bundles are much larger than prod)

---

## 🔴 Blockers

### B1. Back office and admin APIs are wide open whenever Supabase env vars are missing
- **Where:** `middleware.ts:19-22`, `lib/server/auth.ts` `requireAdmin()` (line ~45)
- **Reproduce:** With no Supabase env vars set, run `curl localhost:3002/api/admin/orders`. It returns the full order list with customer names, emails, phone numbers and street addresses, no login. `curl localhost:3002/api/admin/products` likewise. The page `/office-scr1pts-x7k2/orders` also loads with no redirect.
- **Why it matters:** Both the middleware and `requireAdmin()` deliberately "stand aside" when the database is not configured. That is a fail-open. If a production deploy ever has a missing or misspelled env var (very easy on Vercel, and the env names differ between two code paths: middleware checks `SUPABASE_URL || NEXT_PUBLIC_SUPABASE_URL` plus the service key, `requireAdmin` uses `isDatabaseConfigured()`), the admin and customer PII are public. The only protection is the slug being unguessable.
- **Related:** `isAdmin` returns true for *any* authenticated Supabase user when `ADMIN_EMAIL` is unset (`auth.ts:30-34`). If Supabase email signups are enabled, anyone who signs up becomes an admin.
- **Fix:** Fail closed in production. In `requireAdmin()` and the middleware, if `process.env.NODE_ENV === 'production'` and the DB is not configured, return 503/redirect instead of allowing access. Make `ADMIN_EMAIL` required (refuse to authorise anyone if unset). Disable public signups in the Supabase dashboard. Add a startup check that fails the build/deploy if required env vars are missing.

### B2. The purchase path has never been run end to end
- **Where:** `app/api/checkout/session/route.ts`, `app/api/webhooks/stripe/route.ts`, `app/checkout/success/page.tsx`
- **Reproduce:** Add an item, click Checkout. Result: `"Payments are not configured yet."` (503). Same for the webhook.
- **Why it matters:** The code reads well (server-side prices, signature verification, idempotency, stock check before payment), but none of it has been proven. There is no evidence the webhook writes an order, that stock decrements, that the email sends, or that the success page shows the real order.
- **Fix:** Configure Stripe test keys and a Supabase project, use the Stripe CLI to forward webhooks, and run a full purchase: success card, declined card, 3D Secure card, abandoned checkout (cancel URL), double-click on Checkout, refresh on the success page. Verify the order row, stock decrement and email each time.

### B3. Money-related policy text and site behaviour need a real review before taking payments
- **Where:** `/terms`, `/purchasing`, `/delivery`, `/privacy`; `app/api/checkout/session/route.ts`
- **Why it matters:** The policies promise things the site does not do or cannot verify: "taxes ... will be displayed before your purchase is completed" (no tax is configured in the Stripe session, so none is ever shown or collected), shipping is hardcoded free while `/delivery` says costs are "shown during checkout", and the Privacy Policy names two different contact emails. The copy was supplied by the owner and is not legal advice either way.
- **Fix:** Decide the tax position (Stripe Tax or explicit "prices include/exclude tax") for a Colorado LLC selling to the US and abroad, get the policy pages read by someone qualified, and make the policies match what checkout actually does. This is a launch gate because refund/tax promises become obligations the moment the first order lands.

---

## 🟠 High

### H1. Every product says "Ships: July 2026", which is in the past
- **Where:** `lib/products.ts:13` (`shipDate: 'July 2026'`), shown in the cart drawer and product pages.
- **Reproduce:** Add any product, open the cart. Line item reads `Ships: July 2026`. Today is September 2026.
- **Why:** Tells customers the item is two months overdue and contradicts the Delivery page ("3-5 business days").
- **Fix:** Update or remove `shipDate` on every product (and in the database seed / admin data).

### H2. Quantity over 99 silently wipes the cart on reload
- **Where:** `components/CartDrawer.tsx` (+ button has no ceiling), `lib/cart.tsx`, `lib/schemas/product.ts` (server limit is 99)
- **Reproduce:** Open the cart, press `+` repeatedly (150 rapid clicks gave 151 items, `$6,644.00`). Reload. The cart shows "Your bag is empty" and `localStorage` still contains quantity 151, so the customer's cart is gone with no message. Server returns 422 "Too big: expected number to be <=99".
- **Why:** Silent data loss, and the client allows numbers the server rejects.
- **Fix:** Cap `+` and `add` at the server's limit (and at available stock if known), and when resolving fails, tell the customer rather than showing an empty bag. Clamp stored quantities on load.

### H3. One bad cart line empties the whole cart
- **Where:** `lib/cart.tsx` `resolveStored`, `app/api/cart/resolve/route.ts`
- **Reproduce:** Put `[{"variantId":"<valid>","quantity":1},{"variantId":"x","quantity":-3}]` in `localStorage['scripts-cart']`, reload. The valid item disappears too (whole request is a 422). Note that a merely *unknown* variant is dropped gracefully. Only schema-invalid lines cause this.
- **Fix:** Sanitise stored lines client-side (drop anything with a non-integer or out-of-range quantity) before sending, so one corrupt entry cannot kill the rest.

### H4. Success page says "Payment received" for any URL
- **Where:** `app/checkout/success/page.tsx`
- **Reproduce:** Visit `/checkout/success?session_id=cs_test_fake`. It shows a pink tick and "Payment received - Confirming your order...". After ~30 seconds it stops polling and says "Still writing up your order ... Your payment went through", indefinitely. Nothing verifies the session.
- **Why:** A false payment confirmation, and a permanent limbo if the webhook fails or the session id is wrong. The customer is told nothing is lost even when the order may not exist.
- **Fix:** Have `/api/checkout/status` also ask Stripe for the session's `payment_status` and only show "Payment received" when it is `paid`. After the polling timeout, show a real fallback ("We could not confirm your order yet, check your email or contact us at ...") instead of an endless spinner.

### H5. Internal developer errors are shown to customers
- **Where:** `app/api/newsletter` (surfaced under the footer "Sign Up" form), `lib/server/http.ts` messages
- **Reproduce:** Enter a valid email in "Stay in the loop" on `/inventory`, submit. The page shows: *"The database is not configured yet, so this change was not saved. Add the Supabase keys to .env.local and run the migration."*
- **Why:** Leaks internals and reads as broken. Also applies to `Payments are not configured yet.` in the cart drawer (that one is acceptable in dev only).
- **Fix:** In production, return a generic "Something went wrong, try again" and log the detail server-side. Keep the developer wording behind `NODE_ENV !== 'production'`.

### H6. Cart drawer is not accessible
- **Where:** `components/CartDrawer.tsx`
- **Reproduce:** Open the cart and inspect: no `role="dialog"`, no `aria-modal`, no label. Press Escape: the drawer stays open. Focus is not moved into the drawer or trapped, and returns nowhere on close. Background scroll is locked but keyboard users can still tab behind it.
- **Fix:** Add `role="dialog" aria-modal="true" aria-label="Your cart"`, close on Escape, move focus in on open, trap Tab, restore focus to the Bag button on close.

---

## 🟡 Medium

### M1. Sitemap and robots point at `localhost:3000` unless env vars are set
- **Where:** `lib/server/siteUrl.ts` fallback; `/sitemap.xml`, `/robots.txt`
- **Reproduce:** `curl localhost:3002/robots.txt` shows `Sitemap: http://localhost:3000/sitemap.xml`.
- **Fix:** Set `NEXT_PUBLIC_SITE_URL` in production (Vercel's production URL var covers the default domain but verify with the custom domain). Confirm after deploy.

### M2. Missing `<h1>` on `/inventory`, `/basement`, `/checkout/success`; generic titles on `/cart` and `/checkout/success`
- Checked all pages at three sizes: `/`, `/inventory`, `/basement` and `/checkout/success` have zero `h1`; `/cart` and `/checkout/success` are titled just "SCR!PTS".
- **Fix:** Render the page title in the header as the `h1` (the new NavBar `title` prop makes this a one-line change) and add `metadata.title` to the cart and success pages.

### M3. Images without alt text; Next Image warnings
- 3 of 19 images on `/inventory` have no `alt`. Console shows repeated `Image with "fill" is missing "sizes" prop` for every product cutout and an LCP warning for `/decor/inventory-right.png` (add `priority`).
- **Fix:** Add `alt=""` (decorative) or descriptive alt, add `sizes` to `fill` images, add `priority` to the LCP image.

### M4. Both music files preload on first click (about 5 MB)
- **Where:** `lib/music.ts` (`sync()` creates and preloads both tracks). Added in this session.
- **Why:** The grime track is only needed after the vinyl is used, so about 2.2 MB is fetched for nothing on mobile data.
- **Fix:** Create the second `Audio` lazily on first `setTrack`, or set `preload="none"` for it.

### M5. Product cutout PNGs are 320-360 KB each
- `public/products/cutout/*.png` (16 files). Next Image will re-encode them, but the source size adds to build time and cold-cache cost.
- **Fix:** Run them through a PNG/WebP optimiser.

### M6. Stock is not shown anywhere on the storefront
- Could not verify out-of-stock behaviour locally (no DB). The checkout route checks stock server-side and returns a clear message, which is good, but the product page appears to offer every size regardless, so a customer only finds out at checkout.
- **Fix:** Confirm with real stock data that sold-out sizes are disabled on the product page, and that a mid-checkout sell-out shows the API's message.

### M7. Privacy Policy lists two different contact emails
- `heathnager@gmail.com` (privacy requests) vs `info.scriptsstudio@gmail.com` (footer contact and everywhere else). Pick one for a business page, ideally a brand address rather than a personal Gmail.

### M8. Game accessibility
- The Phaser canvas has no accessible name or text alternative and the game is keyboard/pointer only. The shop remains reachable via the header links, which is the mitigation.
- **Fix:** Add `aria-label` to the game container and make sure INVENTORY is reachable without playing the game (it is, via the on-screen button).

---

## 🟢 Low

- **L1.** `Origin` header is trusted to build Stripe `success_url` / `cancel_url` (`app/api/checkout/session/route.ts`). A forged `Origin` only affects the attacker's own session, but pinning to `siteUrl()` in production is cleaner.
- **L2.** No visible newsletter success/consent copy audited (blocked by no DB). Confirm the success state and that marketing consent wording matches the Privacy Policy.
- **L3.** `/loading` and `/checkout` redirect (307). Fine, but `/checkout` sends people to `/cart` with no explanation; consider a note.
- **L4.** `docs/needed-from-thomas.md` still lists missing art (loading imagery, Heath side/walk frames) and `asset-manifest.md` says most sprites are placeholders. Not blocking, but visible to players.
- **L5.** 404 page is the framework default. A branded 404 would fit the brand.

---

## Verified working (tested, not assumed)

- Routes: `/`, `/inventory`, `/basement`, `/cart`, `/terms`, `/privacy`, `/delivery`, `/purchasing`, `/checkout/success` all return 200; unknown product URL returns 404; `/checkout` redirects to `/cart`.
- No horizontal overflow on any page at 375, 768 or 1280 px.
- Product page: sizes render, "Add to Bag" is disabled until a size is chosen ("Select a Size"), then adds the correct variant and opens the drawer.
- Cart: subtotal is correct (1 x $44 = $44, 2 x $44 = $88, 151 x $44 = $6,644); cart persists across reload and navigation; empty state shows correctly.
- Server-side quantity validation: 0, negative, fractional and 999,999 are all rejected by `/api/cart/resolve` and `/api/checkout/session` with clear messages; malformed JSON returns 400.
- Prices are never accepted from the browser; the server resolves them from variant ids.
- Footer: YouTube points to `youtube.com/@scrptsstudio`, email is `info.scriptsstudio@gmail.com`, legal links resolve.
- Policy pages: header title, no cart button, non-pinned header, centred text.
- Stripe webhook verifies the signature and ignores unpaid sessions; orders are only written by the webhook.
- No secrets in client code (only `NEXT_PUBLIC_SITE_URL` is public); no stray `console.log` in app code.

---

## Adversarial pass: what I tried to break

| Attempt | Result |
|---|---|
| 150 rapid clicks on `+` | Accepted, went to 151 (see H2) |
| Reload with quantity above server max | Cart silently emptied (H2) |
| Negative / zero / fractional / huge quantities via API | Rejected cleanly |
| Corrupt `localStorage` cart line | Whole cart lost (H3) |
| Unknown variant id | Dropped gracefully |
| Fake `session_id` on success page | Claims payment received (H4) |
| Unauthenticated `/api/admin/*` and admin pages | Open with no env vars (B1) |
| Empty `{}`, non-JSON, empty items to cart/checkout APIs | Clear 4xx errors |
| Invalid email in newsletter | Blocked by native validation |
| Escape key on open cart | Does nothing (H6) |
| Navigate away from the game and back 4 times | No console errors in headless, but no WebGL there, so not a true test |

Not attempted because it needs real backend services: duplicate-order attempts, double-submitting checkout, webhook replays, race on the last unit of stock.

---

## Recommended order of work

1. **B1** fail-closed admin, required `ADMIN_EMAIL`, signups off (small, do first)
2. Configure Supabase + Stripe test mode, then run and fix **B2** with real purchases
3. **H1, H2, H3, H4, H5** (all small, all customer-visible)
4. **B3** policy/tax review with someone qualified
5. **H6** drawer accessibility, then the Medium list
6. Re-run this audit against a **production build** on the real deploy, and hand-test the game (start screen, vinyl, Heath checkout, inventory round-trip) in a real browser with WebGL

---

## Addendum: live site check (scripts-git-main-scripts-studio.vercel.app)

Checked read-only after the local audit. Nothing was submitted to the live database (the newsletter form was not used).

**Differs from local**
- **B1 does not apply on the live site right now.** `/office-scr1pts-x7k2` and `/orders` redirect to the login page, and `/api/admin/orders` and `/api/admin/products` return 401. Supabase is configured there. The fail-open code is still in the repo, so a missing env var on a future deploy would reopen it. Still worth fixing, but it is not currently exposed.
- **Stripe is live in TEST mode and works.** A checkout session request returned a real `checkout.stripe.com/c/pay/cs_test_...` URL. So the session creation half of B2 is proven; the webhook, order write, stock decrement, email and success page still need a paid test run. The webhook correctly rejects unsigned requests.
- The database is connected: `/api/cart/resolve` returns real variants with stock.
- The latest policy pages, YouTube link and email are deployed (no draft banner, `@scrptsstudio`, `info.scriptsstudio@gmail.com`).

**Same as local**
- H1: `shipDate` is still "July 2026" on the live data.
- H2/H3: same cart code. The server still rejects quantity above 99 (`Too big: expected number to be <=99`).
- H4: same success page code, so the fake-session "Payment received" behaviour will be there too. Status for a fake session returns `pending`.
- Robots and sitemap are served. The sitemap points at `scripts-phi-five.vercel.app`, which looks like the production domain, not this preview URL. Fine for a preview, but confirm it uses your real domain once you have one.

**New finding from live data**
- 🟠 **HIGH: every variant has `allowBackorder: true`.** Stock is tracked (S 12, M 9, L 6, XL 3) but the checkout stock check only blocks when backorder is off, so it never blocks. Customers can buy 99 of a size that has 3 left. That contradicts the Terms ("limited quantities, availability is not guaranteed") and the sold-out messaging in the checkout code. If made-to-order is the intent, say so on the product page and the Delivery policy. If not, turn `allowBackorder` off in the admin.
