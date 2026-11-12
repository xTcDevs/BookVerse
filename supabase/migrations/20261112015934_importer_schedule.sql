-- Schedules for the in-database importers. Kept in a function, called once on production,
-- so local and CI databases built from these migrations never contact the sources.
--   bookverse-gutenberg-import   every 5 s   one Project Gutenberg request in flight at a time
--   bookverse-standard-ebooks    every 10 min  fetches the New Releases feed once a day
--   bookverse-gutenberg-refresh  Sundays      re-queues imported books to pick up source changes
--   bookverse-cron-history       daily        keeps three days of pg_cron run history
create or replace function private.schedule_importers() returns setof text
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise exception 'pg_cron is not installed here';
  end if;
  perform cron.schedule('bookverse-gutenberg-import', '5 seconds', 'select private.import_tick()');
  perform cron.schedule('bookverse-standard-ebooks', '*/10 * * * *', 'select private.standard_ebooks_tick()');
  perform cron.schedule('bookverse-gutenberg-refresh', '17 3 * * 0', 'select private.refresh_gutenberg()');
  perform cron.schedule('bookverse-cron-history', '41 2 * * *',
    $job$delete from cron.job_run_details where end_time < now() - interval '3 days'$job$);
  return query select jobname::text from cron.job where jobname like 'bookverse-%' order by jobname;
end $$;
revoke execute on function private.schedule_importers() from public;
