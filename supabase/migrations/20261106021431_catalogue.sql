-- Catalogue (Milestone 2): works, editions, offers, provenance, rights, shelves.
-- Work = the story. Edition = one way to get it. Offer = one place to get that edition.
-- Imports land unpublished; only reviewed rows become visible to visitors.

create extension if not exists pg_trgm with schema extensions;

-- ── Vocabularies ────────────────────────────────────────────────────────
create type public.work_kind as enum (
  'novel', 'novella', 'short_stories', 'poetry', 'drama',
  'nonfiction', 'biography', 'memoir', 'essay', 'textbook', 'academic', 'children',
  'manga', 'manhwa', 'manhua', 'webtoon', 'comic', 'graphic_novel',
  'light_novel', 'web_novel'
);
create type public.edition_format as enum (
  'hardcover', 'paperback', 'mass_market', 'collector', 'box_set', 'manga_volume',
  'ebook_epub', 'ebook_kindle', 'ebook_pdf', 'web_text', 'image_chapters', 'audiobook'
);
create type public.record_status as enum ('draft', 'in_review', 'published', 'hidden', 'rejected');
create type public.serial_status as enum ('ongoing', 'completed', 'hiatus', 'cancelled', 'unknown');
create type public.content_rating as enum ('general', 'teen', 'mature');
create type public.contributor_role as enum (
  'author', 'artist', 'illustrator', 'translator', 'narrator', 'editor', 'adapter'
);
create type public.access_type as enum (
  'read_on_bookverse', 'listen_on_bookverse',
  'read_official_external', 'listen_external', 'download',
  'borrow', 'preview', 'buy_digital', 'buy_print', 'subscribe'
);
-- A licence describes what the copyright holder (or the public domain) allows.
-- Whether a work is out of copyright in a given country is a separate fact: work_rights.
create type public.license_kind as enum (
  'public_domain', 'cc0', 'cc_by', 'cc_by_sa', 'cc_by_nc', 'cc_by_nc_sa', 'cc_by_nd', 'cc_by_nc_nd',
  'bookverse_original', 'publisher_licensed', 'all_rights_reserved', 'unknown'
);
create type public.rights_status as enum ('public_domain', 'in_copyright', 'unknown');
create type public.shelf_kind as enum ('want_to_read', 'reading', 'read', 'did_not_finish');

-- ── Sources and provenance ─────────────────────────────────────────────
create table public.sources (
  id               smallint generated always as identity primary key,
  slug             text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name             text not null,
  homepage_url     text not null check (homepage_url ~ '^https://'),
  terms_url        text check (terms_url ~ '^https://'),
  attribution_text text,
  attribution_url  text check (attribution_url ~ '^https://'),
  commercial_ok    boolean,            -- null = unclear
  rate_limit_note  text,
  enabled          boolean not null default false,
  last_reviewed_on date not null default current_date
);

create table public.contributors (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique check (slug ~ '^[a-z0-9-]{1,120}$'),
  name           text not null check (char_length(name) between 1 and 200),
  sort_name      text,
  birth_year     smallint,
  death_year     smallint,
  dates_source_url text check (dates_source_url ~ '^https://'),
  wikidata_id    text unique check (wikidata_id ~ '^Q[0-9]+$'),
  openlibrary_id text unique,
  status         public.record_status not null default 'in_review',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table public.works (
  id                     uuid primary key default gen_random_uuid(),
  slug                   text not null unique check (slug ~ '^[a-z0-9-]{1,160}$'),
  title                  text not null check (char_length(title) between 1 and 400),
  subtitle               text,
  original_title         text,
  original_language      text check (original_language ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$'),
  first_published_year   smallint,
  description            text check (char_length(description) <= 6000),
  description_license    public.license_kind,
  description_source_url text check (description_source_url ~ '^https://'),
  kind                   public.work_kind not null,
  serial_status          public.serial_status not null default 'unknown',
  content_rating         public.content_rating not null default 'general',
  status                 public.record_status not null default 'in_review',
  -- Why a record is held back (e.g. 'missing_author_dates', 'ambiguous_title'); empty = none.
  review_flags           text[] not null default '{}',
  review_note            text,
  published_at           timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  search                 tsvector generated always as (
                           setweight(to_tsvector('simple'::regconfig, coalesce(title, '')), 'A') ||
                           setweight(to_tsvector('simple'::regconfig, coalesce(original_title, '')), 'A') ||
                           setweight(to_tsvector('simple'::regconfig, coalesce(subtitle, '')), 'B') ||
                           setweight(to_tsvector('simple'::regconfig, coalesce(description, '')), 'C')
                         ) stored,
  constraint published_has_no_flags check (status <> 'published' or cardinality(review_flags) = 0)
);

create table public.work_contributors (
  work_id        uuid not null references public.works (id) on delete cascade,
  contributor_id uuid not null references public.contributors (id) on delete cascade,
  role           public.contributor_role not null,
  position       smallint not null default 0,
  primary key (work_id, contributor_id, role)
);

-- Copyright status per territory, with the basis and the evidence. 'US' first; more later.
create table public.work_rights (
  work_id       uuid not null references public.works (id) on delete cascade,
  territory     text not null check (territory ~ '^[A-Z]{2}$'),
  status        public.rights_status not null,
  basis         text not null check (char_length(basis) between 3 and 500),
  evidence_url  text check (evidence_url ~ '^https://'),
  determined_on date not null default current_date,
  primary key (work_id, territory)
);

create table public.series (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]{1,160}$'),
  title       text not null,
  description text,
  status      public.record_status not null default 'in_review'
);

create table public.series_entries (
  series_id uuid not null references public.series (id) on delete cascade,
  work_id   uuid not null references public.works (id) on delete cascade,
  position  numeric(7,2) not null,
  label     text,
  primary key (series_id, work_id)
);

create table public.genres (
  id        smallint generated always as identity primary key,
  slug      text not null unique,
  name      text not null,
  parent_id smallint references public.genres (id) on delete restrict,
  sort      smallint not null default 0
);

create table public.work_genres (
  work_id    uuid not null references public.works (id) on delete cascade,
  genre_id   smallint not null references public.genres (id) on delete cascade,
  is_primary boolean not null default false,
  primary key (work_id, genre_id)
);

create table public.editions (
  id               uuid primary key default gen_random_uuid(),
  work_id          uuid not null references public.works (id) on delete cascade,
  format           public.edition_format not null,
  edition_title    text,
  language         text not null check (language ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$'),
  publisher        text,
  published_year   smallint,
  isbn13           text unique check (isbn13 ~ '^97[89][0-9]{10}$'),
  page_count       integer check (page_count > 0),
  word_count       integer check (word_count > 0),
  duration_seconds integer check (duration_seconds > 0),
  volume_number    numeric(7,2),
  cover_url        text check (cover_url ~ '^https://'),
  cover_license    public.license_kind,
  source_id        smallint references public.sources (id),
  source_url       text check (source_url ~ '^https://'),
  retrieved_at     timestamptz,
  status           public.record_status not null default 'in_review',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- A cover is shown only with a licence that permits it.
  constraint cover_needs_license check (cover_url is null or coalesce(cover_license in (
    'public_domain', 'cc0', 'cc_by', 'cc_by_sa', 'publisher_licensed'), false))
);

create table public.edition_contributors (
  edition_id     uuid not null references public.editions (id) on delete cascade,
  contributor_id uuid not null references public.contributors (id) on delete cascade,
  role           public.contributor_role not null,
  primary key (edition_id, contributor_id, role)
);

create table public.offers (
  id              uuid primary key default gen_random_uuid(),
  edition_id      uuid not null references public.editions (id) on delete cascade,
  access          public.access_type not null,
  license         public.license_kind not null default 'unknown',
  provider        text not null,
  source_id       smallint references public.sources (id),
  url             text check (url ~ '^https://'),
  is_official     boolean not null default true,
  is_affiliate    boolean not null default false,
  last_checked_at timestamptz,
  check_result    text not null default 'unchecked' check (check_result in ('unchecked', 'ok', 'broken')),
  status          public.record_status not null default 'in_review',
  created_at      timestamptz not null default now(),
  constraint hosted_needs_open_license check (
    access not in ('read_on_bookverse', 'listen_on_bookverse')
    or license in ('public_domain', 'cc0', 'cc_by', 'cc_by_sa', 'cc_by_nc', 'cc_by_nc_sa',
                   'cc_by_nd', 'cc_by_nc_nd', 'bookverse_original', 'publisher_licensed')
  ),
  constraint external_needs_url check (access in ('read_on_bookverse', 'listen_on_bookverse') or url is not null),
  constraint no_affiliate_links check (not is_affiliate)   -- lifted only by a later, approved migration
);

-- Raw source data, exactly as fetched, for traceability.
create table public.source_records (
  id             bigint generated always as identity primary key,
  source_id      smallint not null references public.sources (id),
  external_id    text not null,
  source_url     text check (source_url ~ '^https://'),
  payload        jsonb not null,
  payload_hash   text not null,
  fetched_at     timestamptz not null default now(),
  work_id        uuid references public.works (id) on delete set null,
  edition_id     uuid references public.editions (id) on delete set null,
  contributor_id uuid references public.contributors (id) on delete set null,
  constraint source_records_external_key unique (source_id, external_id)
);

create table public.ingest_runs (
  id          bigint generated always as identity primary key,
  source_id   smallint not null references public.sources (id),
  trigger     text not null check (trigger in ('schedule', 'manual')),
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  status      text not null default 'running' check (status in ('running', 'succeeded', 'partial', 'failed')),
  fetched     integer not null default 0,
  created     integer not null default 0,
  updated     integer not null default 0,
  flagged     integer not null default 0,
  errors      jsonb not null default '[]'::jsonb
);

-- Likely duplicates, flagged now; merging comes in Milestone 4.
create table public.duplicate_flags (
  id          bigint generated always as identity primary key,
  work_id     uuid not null references public.works (id) on delete cascade,
  other_id    uuid not null references public.works (id) on delete cascade,
  reason      text not null,
  score       real check (score between 0 and 1),
  state       text not null default 'open' check (state in ('open', 'not_duplicate', 'merged')),
  flagged_at  timestamptz not null default now(),
  constraint duplicate_pair_ordered check (work_id < other_id),
  constraint duplicate_pair_key unique (work_id, other_id)
);

-- ── Personal library (own rows only) ───────────────────────────────────
create table public.shelf_items (
  user_id     uuid not null references auth.users (id) on delete cascade,
  work_id     uuid not null references public.works (id) on delete cascade,
  shelf       public.shelf_kind not null,
  added_at    timestamptz not null default now(),
  started_at  timestamptz,
  finished_at timestamptz,
  primary key (user_id, work_id)
);

create table public.user_shelves (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 60),
  created_at timestamptz not null default now(),
  constraint user_shelves_name_key unique (user_id, name)
);

create table public.user_shelf_works (
  shelf_id uuid not null references public.user_shelves (id) on delete cascade,
  work_id  uuid not null references public.works (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (shelf_id, work_id)
);

-- ── Timestamps ─────────────────────────────────────────────────────────
create trigger contributors_updated_at before update on public.contributors
  for each row execute function private.set_updated_at();
create trigger works_updated_at before update on public.works
  for each row execute function private.set_updated_at();
create trigger editions_updated_at before update on public.editions
  for each row execute function private.set_updated_at();

-- ── Row-level security ─────────────────────────────────────────────────
-- Catalogue: visitors read published rows; editors (and admins) read and write everything.
-- One SELECT policy per role and table (one permissive policy per role and action).
do $$
declare
  t text;
  public_rule text;
  rules jsonb := jsonb_build_object(
    'sources',              'enabled',
    'genres',               'true',
    'contributors',         $r$status = 'published'$r$,
    'works',                $r$status = 'published'$r$,
    'series',               $r$status = 'published'$r$,
    'work_rights',          $r$exists (select 1 from public.works w where w.id = work_id and w.status = 'published')$r$,
    'work_contributors',    $r$exists (select 1 from public.works w where w.id = work_id and w.status = 'published')$r$,
    'work_genres',          $r$exists (select 1 from public.works w where w.id = work_id and w.status = 'published')$r$,
    'series_entries',       $r$exists (select 1 from public.series s where s.id = series_id and s.status = 'published')$r$,
    'editions',             $r$status = 'published' and exists (select 1 from public.works w where w.id = work_id and w.status = 'published')$r$,
    'edition_contributors', $r$exists (select 1 from public.editions e join public.works w on w.id = e.work_id where e.id = edition_id and e.status = 'published' and w.status = 'published')$r$,
    'offers',               $r$status = 'published' and exists (select 1 from public.editions e join public.works w on w.id = e.work_id where e.id = edition_id and e.status = 'published' and w.status = 'published')$r$
  );
begin
  for t, public_rule in select key, value #>> '{}' from jsonb_each(rules) loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant select on table public.%I to anon', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
    execute format('create policy "Visitors read published %1$s" on public.%1$I for select to anon using (%2$s)', t, public_rule);
    execute format('create policy "Readers see published %1$s, editors all" on public.%1$I for select to authenticated using ((%2$s) or (select private.has_role(''editor'')))', t, public_rule);
  end loop;

  -- Editor writes on the catalogue, and staff-only tables (no visitor access at all).
  foreach t in array array['sources', 'genres', 'contributors', 'works', 'series', 'work_rights',
    'work_contributors', 'work_genres', 'series_entries', 'editions', 'edition_contributors', 'offers',
    'source_records', 'ingest_runs', 'duplicate_flags'] loop
    if t in ('source_records', 'ingest_runs', 'duplicate_flags') then
      execute format('alter table public.%I enable row level security', t);
      execute format('revoke all on table public.%I from anon, authenticated', t);
      execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
      execute format('create policy "Editors read %1$s" on public.%1$I for select to authenticated using ((select private.has_role(''editor'')))', t);
    end if;
    execute format('create policy "Editors insert %1$s" on public.%1$I for insert to authenticated with check ((select private.has_role(''editor'')))', t);
    execute format('create policy "Editors update %1$s" on public.%1$I for update to authenticated using ((select private.has_role(''editor''))) with check ((select private.has_role(''editor'')))', t);
    execute format('create policy "Editors delete %1$s" on public.%1$I for delete to authenticated using ((select private.has_role(''editor'')))', t);
  end loop;
end
$$;

-- Personal library: own rows only. Custom-shelf entries belong to the owner of the shelf.
alter table public.shelf_items enable row level security;
alter table public.user_shelves enable row level security;
alter table public.user_shelf_works enable row level security;
revoke all on table public.shelf_items, public.user_shelves, public.user_shelf_works from anon, authenticated;
grant select, insert, update, delete on table public.shelf_items, public.user_shelves, public.user_shelf_works to authenticated;

create policy "Read own shelf items" on public.shelf_items for select to authenticated using ((select auth.uid()) = user_id);
create policy "Add own shelf items" on public.shelf_items for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Move own shelf items" on public.shelf_items for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Remove own shelf items" on public.shelf_items for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Read own shelves" on public.user_shelves for select to authenticated using ((select auth.uid()) = user_id);
create policy "Create own shelves" on public.user_shelves for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Rename own shelves" on public.user_shelves for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own shelves" on public.user_shelves for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Read own shelf entries" on public.user_shelf_works for select to authenticated
  using (exists (select 1 from public.user_shelves s where s.id = shelf_id and s.user_id = (select auth.uid())));
create policy "Add to own shelves" on public.user_shelf_works for insert to authenticated
  with check (exists (select 1 from public.user_shelves s where s.id = shelf_id and s.user_id = (select auth.uid())));
create policy "Remove from own shelves" on public.user_shelf_works for delete to authenticated
  using (exists (select 1 from public.user_shelves s where s.id = shelf_id and s.user_id = (select auth.uid())));
