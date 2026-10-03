-- Product images: one public Storage bucket, written only by the server.
--
-- The back office posts a file to /api/admin/media; the route checks it and
-- uploads with the service key, then stores the permanent public URL on the
-- product. Before this, the Media box kept a session-only blob: URL, so an
-- image "added" in the admin never reached the live site.
--
-- The bucket enforces the same limits the route does (5 MB; png/jpeg/webp),
-- so a bypass of the route still cannot store anything else.
--
-- Guarded: `npm run db:check` applies every migration to a vanilla Postgres
-- that has no storage schema, so on a plain database this is a no-op.
-- Idempotent on Supabase: re-running updates the bucket in place.

do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'storage') then
    raise notice 'storage schema not present; skipping product-media bucket';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'product-media', 'product-media', true, 5242880,
    array['image/png', 'image/jpeg', 'image/webp']
  )
  on conflict (id) do update
    set public             = excluded.public,
        file_size_limit    = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

  -- Anyone may read a product image; the browser keys may never write one.
  -- service_role bypasses RLS, which is how the upload route gets in.
  execute 'drop policy if exists "product media is public" on storage.objects';
  execute $p$
    create policy "product media is public" on storage.objects
      for select to anon, authenticated
      using (bucket_id = 'product-media')
  $p$;
end
$$;
