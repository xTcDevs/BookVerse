-- The catalogue importers run inside the database: pg_cron schedules them and pg_net makes
-- the outgoing HTTPS requests, so no private key ever leaves Supabase.
-- (Guarded so the schema can also be checked on a plain Postgres without these extensions.)
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net;
  end if;
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
  end if;
end
$$;
