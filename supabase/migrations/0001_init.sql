-- SCR!PTS — initial schema
--
-- Shapes are transcribed from types/product.ts and lib/admin/types.ts, which
-- were already relational in all but name. Ids are TEXT, not UUID, because the
-- existing catalog uses '1'..'12' and the admin mints crypto.randomUUID() —
-- both are text, and preserving the seed ids keeps every current slug working.
--
-- Money is NUMERIC(10,2). Never float: 0.1 + 0.2 must not be 0.30000000000000004
-- when it is somebody's money.

-- ── Catalog ─────────────────────────────────────────────────────────────────

create table if not exists products (
  id                text primary key,
  name              text        not null,
  slug              text        not null unique,
  emotion           text        not null default '',
  description       text        not null default '',
  collection        text        not null default '',

  -- The Basement's secrecy boundary. A boolean, never a collection-name
  -- convention: renaming a collection must not be able to publish a hidden
  -- piece. The RLS policies below are the enforcement.
  is_basement       boolean     not null default false,

  product_type      text        not null default '',
  vendor            text        not null default '',
  tags              text[]      not null default '{}',
  published_status  text        not null default 'draft'
                                check (published_status in ('draft','active','archived')),
  sku_root          text        not null default '',
  ship_date         text        not null default '',
  requires_shipping boolean     not null default true,
  seo_title         text        not null default '',
  seo_description   text        not null default '',
  fit               text        not null default '',
  fabric            text        not null default '',
  fabric_weight     text        not null default '',
  model_note        text        not null default '',
  care_instructions text[]      not null default '{}',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists products_storefront_idx
  on products (is_basement, published_status);

create table if not exists product_options (
  id         bigint generated always as identity primary key,
  product_id text    not null references products (id) on delete cascade,
  name       text    not null,
  values     text[]  not null default '{}',
  position   integer not null,
  unique (product_id, position)
);

create table if not exists product_variants (
  id                text primary key,
  product_id        text    not null references products (id) on delete cascade,
  option_values     text[]  not null default '{}',
  sku               text    not null default '',
  barcode           text,
  price             numeric(10,2) not null default 0,
  compare_at_price  numeric(10,2),
  cost              numeric(10,2),
  stock             integer not null default 0,
  track_inventory   boolean not null default true,
  allow_backorder   boolean not null default false,
  weight_grams      integer,
  image_id          text,
  position          integer not null default 0
);

create index if not exists product_variants_product_idx on product_variants (product_id);

create table if not exists product_media (
  id         text primary key,
  product_id text    not null references products (id) on delete cascade,
  url        text    not null,
  alt        text    not null default '',
  position   integer not null default 0
);

create index if not exists product_media_product_idx on product_media (product_id);

-- ── Orders ──────────────────────────────────────────────────────────────────
-- Line items are denormalized on purpose (see lib/admin/types.ts): deleting a
-- product must never rewrite what somebody actually bought.

create table if not exists orders (
  id                    text primary key,          -- 'SCR-1042'
  customer_name         text not null default '',
  customer_email        text not null,
  customer_phone        text not null default '',
  address               text[] not null default '{}',
  subtotal              numeric(10,2) not null default 0,
  shipping              numeric(10,2) not null default 0,
  total                 numeric(10,2) not null default 0,
  status                text not null default 'pending'
                          check (status in ('pending','shipped','delivered')),
  payment_status        text not null default 'paid'
                          check (payment_status in ('paid','refunded')),
  placed_at             timestamptz not null default now(),
  shipped_at            timestamptz,
  delivered_at          timestamptz,

  -- Reserved for the Stripe work: the webhook writes these, and
  -- stripe_session_id is the idempotency key that stops a retried event
  -- creating a duplicate order.
  stripe_session_id     text unique,
  stripe_payment_intent text
);

create index if not exists orders_placed_at_idx on orders (placed_at desc);

create table if not exists order_items (
  id           bigint generated always as identity primary key,
  order_id     text    not null references orders (id) on delete cascade,
  product_name text    not null,
  size         text    not null default '',
  qty          integer not null check (qty > 0),
  unit_price   numeric(10,2) not null
);

create index if not exists order_items_order_idx on order_items (order_id);

-- ── Newsletter ──────────────────────────────────────────────────────────────

create table if not exists newsletter_signups (
  id           bigint generated always as identity primary key,
  email        text not null unique,
  source       text not null default 'footer',
  consented_at timestamptz not null default now()
);

-- ── updated_at ──────────────────────────────────────────────────────────────

create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists products_touch_updated_at on products;
create trigger products_touch_updated_at
  before update on products
  for each row execute function touch_updated_at();

-- ── Row Level Security ──────────────────────────────────────────────────────
-- The anon key is public, so these policies are the real security boundary.
-- Every server-side write goes through the service-role client, which bypasses
-- RLS by design — so no write policies are defined at all.

alter table products           enable row level security;
alter table product_options    enable row level security;
alter table product_variants   enable row level security;
alter table product_media      enable row level security;
alter table orders             enable row level security;
alter table order_items        enable row level security;
alter table newsletter_signups enable row level security;

-- Public may read published, non-Basement products only.
drop policy if exists products_public_read on products;
create policy products_public_read on products
  for select to anon, authenticated
  using (is_basement = false and published_status = 'active');

-- Children are visible only when their parent is. The Basement's variants and
-- images stay unreachable even if somebody guesses an id.
drop policy if exists product_options_public_read on product_options;
create policy product_options_public_read on product_options
  for select to anon, authenticated
  using (exists (
    select 1 from products p
    where p.id = product_options.product_id
      and p.is_basement = false
      and p.published_status = 'active'
  ));

drop policy if exists product_variants_public_read on product_variants;
create policy product_variants_public_read on product_variants
  for select to anon, authenticated
  using (exists (
    select 1 from products p
    where p.id = product_variants.product_id
      and p.is_basement = false
      and p.published_status = 'active'
  ));

drop policy if exists product_media_public_read on product_media;
create policy product_media_public_read on product_media
  for select to anon, authenticated
  using (exists (
    select 1 from products p
    where p.id = product_media.product_id
      and p.is_basement = false
      and p.published_status = 'active'
  ));

-- orders, order_items and newsletter_signups intentionally have NO policies:
-- with RLS enabled and no policy, the anon key can read nothing at all.
