-- Sales tax on the order.
--
-- Checkout prices every shirt tax-exclusive (PRD, Payments, 2026-11-06): where
-- Stripe Tax has an active registration, the buyer pays $55 plus their state's
-- tax. The webhook records that amount here, from the Checkout session's
-- total_details.amount_tax, so a taxed order's lines still add up to its total
-- in the order emails and the back office.
--
-- Zero for every order placed before this column existed and for every order
-- until the first state is registered. The webhook names the column only when
-- there is tax to record and reads orders with `*`, so this migration can land
-- after the code without breaking anything; it must land before the first
-- registration is made in the Stripe Tax dashboard.

alter table orders add column if not exists tax numeric(10,2) not null default 0;
