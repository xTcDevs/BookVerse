-- Catalogue indexes (Milestone 2). Plain CREATE INDEX on purpose: the tables are created empty
-- by the previous migration, so there is nothing to lock, and the Supabase CLI runs each
-- migration file inside a transaction, where CONCURRENTLY is not allowed. Indexes added later
-- to tables that already hold data must be built CONCURRENTLY, one statement at a time.
create index if not exists work_contributors_contributor_idx on public.work_contributors (contributor_id);
create index if not exists series_entries_work_idx on public.series_entries (work_id);
create index if not exists genres_parent_idx on public.genres (parent_id);
create index if not exists work_genres_genre_idx on public.work_genres (genre_id);
create index if not exists editions_work_idx on public.editions (work_id);
create index if not exists editions_source_idx on public.editions (source_id);
create index if not exists edition_contributors_contributor_idx on public.edition_contributors (contributor_id);
create index if not exists offers_edition_idx on public.offers (edition_id);
create index if not exists offers_source_idx on public.offers (source_id);
create index if not exists source_records_work_idx on public.source_records (work_id);
create index if not exists source_records_edition_idx on public.source_records (edition_id);
create index if not exists source_records_contributor_idx on public.source_records (contributor_id);
create index if not exists ingest_runs_source_idx on public.ingest_runs (source_id, started_at desc);
create index if not exists duplicate_flags_other_idx on public.duplicate_flags (other_id);
create index if not exists shelf_items_work_idx on public.shelf_items (work_id);
create index if not exists user_shelf_works_work_idx on public.user_shelf_works (work_id);
create index if not exists works_status_kind_idx on public.works (status, kind);
create index if not exists editions_status_idx on public.editions (status);
create index if not exists contributors_status_idx on public.contributors (status);
create index if not exists works_search_idx on public.works using gin (search);
create index if not exists works_title_trgm_idx on public.works using gin (title extensions.gin_trgm_ops);
create index if not exists contributors_name_trgm_idx on public.contributors using gin (name extensions.gin_trgm_ops);
