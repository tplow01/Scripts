-- Launch price: $55 flat for every shirt, taxes and shipping included.
-- Decided 2026-10-02 (PRD, Payments). Applied to production by hand the same
-- day; this migration is the reviewable, repeatable record of that change for
-- every other environment (a teammate's project, staging, a restored backup).
--
-- NOT `npm run seed`: the seed deletes and reinserts every variant row, which
-- resets stock and drops any admin-edited SKU, cost or compare-at price.
--
-- Idempotent: only rows still at the old price move, so re-running on a
-- database that already carries the launch price is a no-op.

update product_variants
   set price = 55
 where price = 44;
