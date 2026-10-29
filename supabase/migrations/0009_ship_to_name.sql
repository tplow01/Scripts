-- Who the parcel is for.
--
-- Stripe Checkout collects a shipping address (and the name on it) separately
-- from the card's billing details. Usually the buyer ships to themselves, but
-- for a gift the name on the label is somebody else. The buyer stays the
-- customer (their email, their receipt); this column carries the label name.
--
-- Nullable: orders written before this column existed have no value, and the
-- data layer falls back to customer_name for them.

alter table orders add column if not exists ship_to_name text;
