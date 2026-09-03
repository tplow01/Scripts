#!/usr/bin/env bash
#
# Validate every migration against a real, throwaway Postgres before it ever
# touches the live project.
#
#   npm run db:check
#
# SQL is not type-checked and `npm run build` never looks at it, so this is the
# only thing standing between a typo and a half-applied production schema.
# Requires Docker to be running; exits non-zero if anything fails.

set -euo pipefail

CONTAINER=scripts-pg-check
MIGRATIONS_DIR="$(dirname "$0")/../supabase/migrations"

cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT

if ! docker info >/dev/null 2>&1; then
  echo "Docker isn't running. Start Docker Desktop and try again." >&2
  exit 1
fi

cleanup
echo "Starting throwaway Postgres…"
docker run --rm -d --name "$CONTAINER" -e POSTGRES_PASSWORD=check postgres:16 >/dev/null
until docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done

# Supabase supplies these two roles; vanilla Postgres does not, and the RLS
# policies reference them by name.
docker exec "$CONTAINER" psql -U postgres -q \
  -c "create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;" >/dev/null

for file in "$MIGRATIONS_DIR"/*.sql; do
  echo "Applying $(basename "$file")…"
  docker exec -i "$CONTAINER" psql -U postgres -q -v ON_ERROR_STOP=1 < "$file"
done

echo
echo "Tables, RLS and policy counts:"
docker exec "$CONTAINER" psql -U postgres -q -c "
  select relname as \"table\", relrowsecurity as rls,
         (select count(*) from pg_policies p where p.tablename = c.relname) as policies
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' order by relname;"

# Every table must have RLS on, or the public key can read it directly.
UNPROTECTED=$(docker exec "$CONTAINER" psql -U postgres -tAc "
  select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname='public' and c.relkind='r' and not c.relrowsecurity;")
if [ "$UNPROTECTED" != "0" ]; then
  echo "FAIL: $UNPROTECTED table(s) have Row Level Security switched off." >&2
  exit 1
fi

# The Basement's whole premise: invisible to the public key.
docker exec -i "$CONTAINER" psql -U postgres -q >/dev/null <<'SQL'
insert into products (id,name,slug,collection,is_basement,published_status)
  values ('chk-open','Open','chk-open','Emotions',false,'active'),
         ('chk-secret','Secret','chk-secret','Basement',true,'active');
grant usage on schema public to anon;
grant select on all tables in schema public to anon;
SQL
# `psql -c` prints a line per statement, so SET emits one too — take the last.
LEAKED=$(docker exec "$CONTAINER" psql -U postgres -tAc "
  set role anon; select count(*) from products where is_basement;" | tail -1 | tr -d '[:space:]')
if [ "$LEAKED" != "0" ]; then
  echo "FAIL: the public role can see $LEAKED Basement product(s)." >&2
  exit 1
fi

# The server must actually be able to read its own tables. Unchecking
# "Automatically expose new tables" strips grants from service_role too, and
# service_role bypasses RLS but not table privileges — this caught that.
# `|| true` matters: this psql is *expected* to fail when the grant is missing,
# and `set -e` would otherwise kill the script before the check below reports it.
DENIED=$({ docker exec "$CONTAINER" psql -U postgres -tAc "
  set role service_role; select count(*) from products;" 2>&1 || true; } | tail -1 | tr -d '[:space:]')
if ! [[ "$DENIED" =~ ^[0-9]+$ ]]; then
  echo "FAIL: service_role cannot read products — missing GRANT? ($DENIED)" >&2
  exit 1
fi

echo
echo "OK — migrations apply cleanly, RLS is on everywhere, service_role can read,"
echo "     and the Basement stays hidden from the public role."
