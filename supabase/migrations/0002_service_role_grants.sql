-- Grant table privileges to service_role — and only to service_role.
--
-- The project has "Automatically expose new tables" turned OFF, which is the
-- posture we want: nothing is reachable through the Data API unless we say so.
-- But it removes grants for *every* PostgREST role, service_role included, and
-- service_role bypasses Row Level Security — not table privileges. Without this
-- the server cannot read its own tables (SQLSTATE 42501).
--
-- anon and authenticated are deliberately granted nothing. Every query in the
-- app goes through the service-role client; the browser never touches a table.
-- The public-read policies in 0001 therefore sit dormant, and would only come
-- into force if a future feature both grants anon access and wants RLS to
-- filter it.

grant usage on schema public to service_role;

grant all privileges on all tables    in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

-- Tables added by later migrations inherit the same treatment, so this file
-- never has to be revisited.
alter default privileges in schema public grant all on tables    to service_role;
alter default privileges in schema public grant all on sequences to service_role;
