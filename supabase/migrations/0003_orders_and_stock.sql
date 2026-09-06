-- Order numbering and stock decrement, both as database functions.
--
-- Neither can be done safely from application code. PostgREST cannot express
-- `set stock = stock - n`, so a read-then-write from the server would let two
-- simultaneous checkouts both see the last shirt in stock and both sell it.
-- A single UPDATE statement in the database cannot interleave that way.

-- ── Order numbers ───────────────────────────────────────────────────────────
-- Continues the SCR-1051 series the mock orders already display, so real orders
-- don't restart the numbering.

create sequence if not exists order_number_seq start 1052;

create or replace function next_order_number() returns text
language sql
as $$
  select 'SCR-' || nextval('order_number_seq')::text;
$$;

-- ── Stock ───────────────────────────────────────────────────────────────────
-- Atomic decrement. Clamped at zero: overselling by a race is a problem, but a
-- negative stock count is a corrupt number that then misreports availability
-- everywhere. Variants that don't track inventory are left alone.

create or replace function decrement_variant_stock(p_variant_id text, p_qty integer)
returns integer
language plpgsql
as $$
declare
  remaining integer;
begin
  update product_variants
     set stock = greatest(0, stock - p_qty)
   where id = p_variant_id
     and track_inventory
  returning stock into remaining;

  return remaining;  -- null when the variant is untracked or missing
end;
$$;

-- Only the server ever calls these.
grant execute on function next_order_number()                     to service_role;
grant execute on function decrement_variant_stock(text, integer)  to service_role;
revoke execute on function next_order_number()                    from anon, authenticated;
revoke execute on function decrement_variant_stock(text, integer) from anon, authenticated;
