-- A fourth order status, and a timestamp to go with it.
--
-- SCR!PTS fulfils through a maker (Tapstitch), so an order spends most of its
-- life in a state the old three-status model had no word for: paid for, handed
-- to the maker, not yet dispatched. Without it, an order sat at 'pending' for
-- days and nobody could tell "not started" from "being made" — and marking it
-- 'shipped' early would email the customer about a shirt that did not exist yet.
--
--   paid      the customer has paid; nothing has been done
--   making    handed to the maker, in production
--   shipped   dispatched — this is the one that emails the customer
--   delivered arrived
--
-- 'pending' is gone. Existing rows carrying it become 'paid', which is what it
-- always actually meant.

alter table orders drop constraint if exists orders_status_check;

update orders set status = 'paid' where status = 'pending';

alter table orders
  add constraint orders_status_check
  check (status in ('paid', 'making', 'shipped', 'delivered'));

alter table orders alter column status set default 'paid';

-- Stamped when the order is handed to the maker, mirroring shipped_at and
-- delivered_at so the timeline reads as one sequence.
alter table orders add column if not exists making_at timestamptz;
