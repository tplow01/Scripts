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
