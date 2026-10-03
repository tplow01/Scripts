-- Product images: raise the bucket's cap from 5 MB to 10 MB.
--
-- Uploads now go from the browser straight to Storage with a signed address,
-- so Vercel's 4.5 MB function-body limit no longer sits in the way and a
-- phone photo fits. The route refuses anything over the same 10 MB first.
--
-- Guarded like 0010: `npm run db:check` runs on a vanilla Postgres with no
-- storage schema, where this is a no-op. Idempotent on Supabase.

do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'storage') then
    raise notice 'storage schema not present; skipping product-media limit';
    return;
  end if;

  update storage.buckets
     set file_size_limit = 10485760
   where id = 'product-media';
end
$$;
