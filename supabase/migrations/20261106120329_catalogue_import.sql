-- Catalogue import pipeline (Milestone 2).
--
-- Everything runs inside the database: pg_cron calls private.import_tick() every few seconds,
-- pg_net makes one outgoing request at a time, and each book is written in its own
-- sub-transaction, so a failure leaves nothing half-written. Imported records always land
-- unpublished; an editor publishes them, and a trigger refuses to publish anything that has
-- no recorded source or no rights determination.
--
-- Sources and their terms:
--   Project Gutenberg  per-book RDF (cache/epub/{id}/pg{id}.rdf) and the weekly offline
--                      catalogue only, as its robot policy allows; one request every 5 s.
--                      The RDF metadata is CC0.
--   Standard Ebooks    the free New Releases Atom feed only. Its descriptions are CC0.

create extension if not exists unaccent with schema extensions;

-- ── Catalogue additions ────────────────────────────────────────────────
alter table public.works add column subjects text[] not null default '{}';

-- Editor-curated listings (manga, manhwa, manhua, webtoons) are recorded as this source.
insert into public.sources (slug, name, homepage_url, terms_url, attribution_text, attribution_url, rate_limit_note, enabled)
values
  ('project-gutenberg', 'Project Gutenberg', 'https://www.gutenberg.org',
   'https://www.gutenberg.org/policy/robot_access.html',
   'Catalogue data from Project Gutenberg (CC0). Ebooks transcribed by Project Gutenberg volunteers.',
   'https://www.gutenberg.org/ebooks/offline_catalogs.html',
   'Per-book RDF records and the offline catalogue only; one request every 5 seconds.', true),
  ('standard-ebooks', 'Standard Ebooks', 'https://standardebooks.org', 'https://standardebooks.org/about',
   'Edition and description by Standard Ebooks, dedicated to the public domain (CC0).',
   'https://standardebooks.org', 'Free New Releases feed only; checked once a day.', true),
  ('bookverse-editorial', 'BookVerse editors', 'https://bookverse-1.netlify.app', null,
   'Listed by BookVerse editors from the official publisher or platform page linked on the record.',
   null, null, true);

insert into public.genres (slug, name, sort) values
  ('classics', 'Classics', 1),
  ('literary-fiction', 'Literary fiction', 2),
  ('fantasy', 'Fantasy', 3),
  ('epic-fantasy', 'Epic fantasy', 4),
  ('urban-fantasy', 'Urban fantasy', 5),
  ('isekai', 'Isekai', 6),
  ('science-fiction', 'Science fiction', 7),
  ('dystopian', 'Dystopian', 8),
  ('time-travel', 'Time travel', 9),
  ('mystery', 'Mystery', 10),
  ('crime', 'Crime', 11),
  ('thriller', 'Thriller', 12),
  ('psychological-thriller', 'Psychological thriller', 13),
  ('horror', 'Horror', 14),
  ('gothic', 'Gothic', 15),
  ('romance', 'Romance', 16),
  ('historical-romance', 'Historical romance', 17),
  ('adventure', 'Adventure', 18),
  ('action', 'Action', 19),
  ('historical-fiction', 'Historical fiction', 20),
  ('drama', 'Drama', 21),
  ('comedy', 'Comedy', 22),
  ('satire', 'Satire', 23),
  ('war', 'War', 24),
  ('mythology-folklore', 'Mythology and folklore', 25),
  ('slice-of-life', 'Slice of life', 26),
  ('sports', 'Sports', 27),
  ('young-adult', 'Young adult', 28),
  ('children', 'Children''s', 29),
  ('biography-memoir', 'Biography and memoir', 30),
  ('history', 'History', 31),
  ('philosophy', 'Philosophy', 32),
  ('psychology', 'Psychology', 33),
  ('business', 'Business', 34),
  ('education', 'Education', 35),
  ('science', 'Science', 36),
  ('travel', 'Travel', 37),
  ('politics-society', 'Politics and society', 38),
  ('religion', 'Religion', 39);
update public.genres g set parent_id = p.id
from (values ('epic-fantasy', 'fantasy'), ('urban-fantasy', 'fantasy'), ('isekai', 'fantasy'),
             ('dystopian', 'science-fiction'), ('time-travel', 'science-fiction'), ('crime', 'mystery'),
             ('psychological-thriller', 'thriller'), ('gothic', 'horror'), ('historical-romance', 'romance'),
             ('satire', 'comedy')) as rel (child, parent)
join public.genres p on p.slug = rel.parent
where g.slug = rel.child;

-- ── Staff-only import state (private schema: not reachable through the Data API) ──
create table private.import_queue (
  id              bigint generated always as identity primary key,
  source_slug     text not null,
  external_id     text not null,
  batch           text not null,
  kind            public.work_kind not null,
  genres          text[] not null default '{}',
  expected_title  text not null,
  expected_author text,                       -- null only for anonymous works
  state           text not null default 'queued'
                  check (state in ('queued', 'requested', 'done', 'failed')),
  request_id      bigint,
  attempts        smallint not null default 0,
  available_at    timestamptz not null default now(),
  requested_at    timestamptz,
  finished_at     timestamptz,
  last_error      text,
  work_id         uuid references public.works (id) on delete set null,
  constraint import_queue_item_key unique (source_slug, external_id)
);

create table private.feed_state (
  source_slug     text primary key,
  request_id      bigint,
  requested_at    timestamptz,
  last_success_at timestamptz,
  last_error      text
);
insert into private.feed_state (source_slug) values ('standard-ebooks');

-- The weekly Project Gutenberg offline catalogue, used to check curated book numbers
-- against the real title and author before anything is queued.
create table private.gutenberg_catalogue (
  id          integer primary key,
  type        text not null,
  issued      text,
  title       text not null,
  language    text,
  authors     text,
  subjects    text,
  locc        text,
  bookshelves text,
  loaded_at   timestamptz not null default now()
);

revoke all on table private.import_queue, private.feed_state, private.gutenberg_catalogue from public, anon, authenticated;

-- ── Text helpers ───────────────────────────────────────────────────────
create function private.norm(t text) returns text
language sql stable set search_path = '' as $$
  select btrim(regexp_replace(
    lower(extensions.unaccent('extensions.unaccent'::regdictionary, replace(coalesce(t, ''), '&', ' and '))),
    '[^a-z0-9]+', ' ', 'g'))
$$;

create function private.slugify(t text) returns text
language sql stable set search_path = '' as $$
  select left(btrim(replace(private.norm(t), ' ', '-'), '-'), 110)
$$;

-- "Austen, Jane" -> "Jane Austen"; "Wells, H. G. (Herbert George)" -> "H. G. Wells".
create function private.person_name(raw text) returns text
language plpgsql immutable set search_path = '' as $$
declare
  n text := btrim(regexp_replace(coalesce(raw, ''), '\s*\([^)]*\)', '', 'g'));
  parts text[] := regexp_split_to_array(n, ',\s*');
begin
  if coalesce(array_length(parts, 1), 0) < 2 then return n; end if;
  if parts[2] ~* '\m(of|emperor|king|queen|saint|pope|lord|baron|count|graf|sir|freiherr)\M' then
    return parts[1];
  end if;
  if array_length(parts, 1) >= 3 and parts[3] ~* '^(jr\.?|sr\.?|ii|iii|iv)$' then
    return parts[2] || ' ' || parts[1] || ', ' || parts[3];
  end if;
  return parts[2] || ' ' || parts[1];
end $$;

-- Every word of the expected name appears in the source's names (order-free, accent-free).
create function private.names_match(expected text, actual text) returns boolean
language sql stable set search_path = '' as $$
  select coalesce(bool_and(position(' ' || w || ' ' in ' ' || private.norm(actual) || ' ') > 0), false)
  from unnest(string_to_array(private.norm(expected), ' ')) as w
  where w <> ''
$$;

-- The main title: the part before a line break or "; ", as Project Gutenberg writes subtitles.
create function private.main_title(t text) returns text
language sql immutable set search_path = '' as $$
  select btrim(split_part(split_part(coalesce(t, ''), E'\n', 1), '; ', 1))
$$;

create function private.html_to_text(h text) returns text
language sql immutable set search_path = '' as $$
  select btrim(regexp_replace(
    replace(replace(replace(replace(replace(replace(
      regexp_replace(regexp_replace(coalesce(h, ''), '</p>\s*<p[^>]*>', E'\n\n', 'g'), '<[^>]+>', '', 'g'),
      '&nbsp;', ' '), '&quot;', '"'), '&#39;', ''''), '&lt;', '<'), '&gt;', '>'), '&amp;', '&'),
    '[ \t]+', ' ', 'g'))
$$;

revoke execute on all functions in schema private from public;
grant execute on function private.has_role(public.staff_role) to authenticated;

-- ── Publishing rules ───────────────────────────────────────────────────
-- Nothing becomes public without a recorded source and a rights determination.
create function private.guard_work_publish() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    if tg_op = 'INSERT' or not exists (select 1 from public.source_records where work_id = new.id) then
      raise exception 'Work "%" has no recorded source, so it cannot be published', new.title
        using errcode = '23514';
    end if;
    if not exists (select 1 from public.work_rights where work_id = new.id) then
      raise exception 'Work "%" has no rights determination, so it cannot be published', new.title
        using errcode = '23514';
    end if;
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end $$;

create trigger works_guard_publish before insert or update of status on public.works
  for each row execute function private.guard_work_publish();

-- Publishing a reviewed work publishes the parts reviewed with it.
create function private.cascade_work_publish() returns trigger
language plpgsql set search_path = '' as $$
begin
  update public.editions set status = 'published' where work_id = new.id and status = 'in_review';
  update public.offers o set status = 'published'
    from public.editions e where e.id = o.edition_id and e.work_id = new.id and o.status = 'in_review';
  update public.contributors c set status = 'published'
    where c.status = 'in_review' and (
      exists (select 1 from public.work_contributors wc where wc.work_id = new.id and wc.contributor_id = c.id)
      or exists (select 1 from public.edition_contributors ec join public.editions e on e.id = ec.edition_id
                 where e.work_id = new.id and ec.contributor_id = c.id));
  return null;
end $$;

create trigger works_cascade_publish after update of status on public.works
  for each row when (new.status = 'published' and old.status is distinct from 'published')
  execute function private.cascade_work_publish();

-- Editors publish reviewed works in one call; flagged or unsourced works are skipped.
create function public.publish_works(work_ids uuid[]) returns integer
language plpgsql set search_path = '' as $$
declare
  done integer := 0;
  w record;
begin
  if not (select private.has_role('editor')) then
    raise exception 'Only editors can publish' using errcode = '42501';
  end if;
  for w in select id from public.works
           where id = any (work_ids) and status = 'in_review' and cardinality(review_flags) = 0
             and exists (select 1 from public.source_records s where s.work_id = works.id)
             and exists (select 1 from public.work_rights r where r.work_id = works.id) loop
    update public.works set status = 'published' where id = w.id;
    done := done + 1;
  end loop;
  return done;
end $$;
revoke execute on function public.publish_works(uuid[]) from public, anon;
grant execute on function public.publish_works(uuid[]) to authenticated;

-- ── Shared write helpers (run by the importers only) ───────────────────
create function private.upsert_contributor(
  p_source smallint, p_external_id text, p_name text, p_sort_name text,
  p_birth smallint, p_death smallint, p_dates_url text, p_payload jsonb
) returns uuid
language plpgsql set search_path = '' as $$
declare
  cid uuid;
  base text := private.slugify(p_name);
  candidate text;
  n integer := 1;
begin
  if p_external_id is not null then
    select contributor_id into cid from public.source_records
    where source_id = p_source and external_id = p_external_id and contributor_id is not null;
  end if;
  if cid is null then
    -- Same name from another source, without conflicting dates: the same person.
    select id into cid from public.contributors
    where private.norm(name) = private.norm(p_name)
      and (p_birth is null or birth_year is null or birth_year = p_birth)
      and (p_death is null or death_year is null or death_year = p_death)
    order by created_at limit 1;
  end if;
  if cid is null then
    if base = '' then base := 'contributor'; end if;
    candidate := base;
    while exists (select 1 from public.contributors where slug = candidate) loop
      n := n + 1;
      candidate := base || '-' || n;
    end loop;
    insert into public.contributors (slug, name, sort_name, birth_year, death_year, dates_source_url)
    values (candidate, p_name, p_sort_name, p_birth, p_death,
            case when p_birth is not null or p_death is not null then p_dates_url end)
    returning id into cid;
  else
    update public.contributors set
      birth_year = coalesce(birth_year, p_birth),
      death_year = coalesce(death_year, p_death),
      dates_source_url = coalesce(dates_source_url,
        case when p_birth is not null or p_death is not null then p_dates_url end)
    where id = cid;
  end if;
  if p_external_id is not null then
    insert into public.source_records (source_id, external_id, source_url, payload, payload_hash, contributor_id)
    values (p_source, p_external_id, p_dates_url, p_payload, md5(p_payload::text), cid)
    on conflict on constraint source_records_external_key do update
      set payload = excluded.payload, payload_hash = excluded.payload_hash,
          fetched_at = now(), contributor_id = excluded.contributor_id;
  end if;
  return cid;
end $$;

create function private.unique_work_slug(p_title text, p_author text, p_suffix text) returns text
language plpgsql stable set search_path = '' as $$
declare
  s text := private.slugify(p_title);
begin
  if s = '' then s := 'untitled'; end if;
  if exists (select 1 from public.works where slug = s) then
    s := left(private.slugify(p_title || ' ' || coalesce(p_author, '')), 140);
  end if;
  if exists (select 1 from public.works where slug = s) then
    s := s || '-' || p_suffix;
  end if;
  return s;
end $$;

-- Flags likely duplicates of a new work: a near-identical title by a shared author.
create function private.flag_duplicates(p_work uuid) returns integer
language plpgsql set search_path = '' as $$
declare
  found_count integer;
begin
  with mine as (
    select w.id, w.title from public.works w where w.id = p_work
  ), candidates as (
    select o.id as other, extensions.similarity(private.norm(o.title), private.norm(m.title)) as score
    from public.works o, mine m
    where o.id <> m.id
      and extensions.similarity(private.norm(o.title), private.norm(m.title)) >= 0.6
      and exists (select 1 from public.work_contributors a join public.work_contributors b
                  on a.contributor_id = b.contributor_id and a.role = 'author' and b.role = 'author'
                  where a.work_id = m.id and b.work_id = o.id)
  ), ins as (
    insert into public.duplicate_flags (work_id, other_id, reason, score)
    select least(p_work, other), greatest(p_work, other), 'similar title, same author', score::real from candidates
    on conflict on constraint duplicate_pair_key do nothing
    returning 1
  )
  select count(*) into found_count from candidates;
  if found_count > 0 then
    update public.works set review_flags = array(select distinct unnest(review_flags || '{possible_duplicate}'))
    where id = p_work;
  end if;
  return found_count;
end $$;

-- ── Project Gutenberg: one RDF record → work, edition, offers, rights, provenance ──
create function private.ingest_gutenberg_rdf(p_queue_id bigint, p_xml text, p_fetched_at timestamptz)
returns jsonb
language plpgsql set search_path = '' as $$
declare
  q private.import_queue;
  src smallint;
  doc xml;
  book record;
  ebook_no text;
  page_url text;
  hash text;
  existing public.source_records;
  wid uuid;
  eid uuid;
  cid uuid;
  lang text;
  lcsh text[];
  flags text[] := '{}';
  creators text := '';
  outcome text;
  a record;
  html_url text;
  epub_url text;
  is_new boolean;
begin
  select * into q from private.import_queue where id = p_queue_id;
  if not found then raise exception 'Queue item % does not exist', p_queue_id; end if;
  select id into src from public.sources where slug = 'project-gutenberg';

  doc := xmlparse(document p_xml);
  ebook_no := q.external_id;
  page_url := 'https://www.gutenberg.org/ebooks/' || ebook_no;

  select * into book from xmltable(
    xmlnamespaces('http://www.w3.org/1999/02/22-rdf-syntax-ns#' as rdf, 'http://purl.org/dc/terms/' as dcterms,
                  'http://www.gutenberg.org/2009/pgterms/' as pgterms),
    '/rdf:RDF/pgterms:ebook' passing doc
    columns about text path '@rdf:about',
            title text path 'dcterms:title',
            issued text path 'dcterms:issued',
            rights text path 'dcterms:rights',
            dctype text path '(dcterms:type/rdf:Description/rdf:value)[1]');
  if book.about is null then raise exception 'Not a Project Gutenberg ebook record'; end if;
  if book.about <> 'ebooks/' || ebook_no then
    raise exception 'Record is for % but ebook % was requested', book.about, ebook_no;
  end if;
  if book.title is null or btrim(book.title) = '' then raise exception 'Record has no title'; end if;

  -- Hash without the daily download counter, so an unchanged record is recognised.
  hash := md5(regexp_replace(p_xml, '<pgterms:downloads[^<]*</pgterms:downloads>', '', 'g'));
  select * into existing from public.source_records where source_id = src and external_id = 'ebooks/' || ebook_no;
  if found and existing.payload_hash = hash and existing.work_id is not null then
    update public.source_records set fetched_at = p_fetched_at where id = existing.id;
    return jsonb_build_object('outcome', 'unchanged', 'work_id', existing.work_id, 'flags', '[]'::jsonb);
  end if;

  select (array_agg(v order by ord))[1] into lang from xmltable(
    xmlnamespaces('http://www.w3.org/1999/02/22-rdf-syntax-ns#' as rdf, 'http://purl.org/dc/terms/' as dcterms,
                  'http://www.gutenberg.org/2009/pgterms/' as pgterms),
    '/rdf:RDF/pgterms:ebook/dcterms:language/rdf:Description/rdf:value' passing doc
    columns ord for ordinality, v text path '.');

  select coalesce(array_agg(v order by ord), '{}') into lcsh from xmltable(
    xmlnamespaces('http://www.w3.org/1999/02/22-rdf-syntax-ns#' as rdf, 'http://purl.org/dc/terms/' as dcterms,
                  'http://www.gutenberg.org/2009/pgterms/' as pgterms, 'http://purl.org/dc/dcam/' as dcam),
    '/rdf:RDF/pgterms:ebook/dcterms:subject/rdf:Description' passing doc
    columns ord for ordinality, scheme text path 'dcam:memberOf/@rdf:resource', v text path 'rdf:value')
  where scheme = 'http://purl.org/dc/terms/LCSH';

  select max(f) filter (where f = page_url || '.html.images'),
         max(f) filter (where f = page_url || '.epub3.images')
  into html_url, epub_url
  from xmltable(
    xmlnamespaces('http://www.w3.org/1999/02/22-rdf-syntax-ns#' as rdf, 'http://purl.org/dc/terms/' as dcterms,
                  'http://www.gutenberg.org/2009/pgterms/' as pgterms),
    '/rdf:RDF/pgterms:ebook/dcterms:hasFormat/pgterms:file' passing doc
    columns f text path '@rdf:about');

  -- Validation: anything uncertain holds the record back for an editor.
  if private.norm(private.main_title(book.title)) <> private.norm(q.expected_title) then
    flags := array_append(flags, 'title_mismatch');
  end if;
  if coalesce(book.dctype, '') <> 'Text' then flags := array_append(flags, 'not_text'); end if;
  if lang is null or lang !~ '^[a-z]{2,3}$' then flags := array_append(flags, 'missing_language'); end if;
  if coalesce(btrim(book.rights), '') <> 'Public domain in the USA.' then
    flags := array_append(flags, 'rights_not_us_public_domain');
  end if;

  -- Work: found through this ebook's provenance record, or created.
  wid := existing.work_id;
  is_new := wid is null;
  if is_new then
    insert into public.works (slug, title, subtitle, kind, subjects, status)
    values (private.unique_work_slug(private.main_title(book.title), q.expected_author, ebook_no),
            private.main_title(book.title),
            nullif(btrim(substr(book.title, length(private.main_title(book.title)) + 1), E' ;\n:'), ''),
            q.kind, lcsh, 'in_review')
    returning id into wid;
    insert into public.work_genres (work_id, genre_id, is_primary)
    select wid, g.id, g.slug = q.genres[1] from public.genres g where g.slug = any (q.genres)
    on conflict do nothing;
    outcome := 'created';
  else
    update public.works set subjects = lcsh where id = wid;
    outcome := 'updated';
  end if;

  -- Edition: one per Project Gutenberg ebook.
  select id into eid from public.editions where work_id = wid and source_id = src and source_url = page_url;
  if eid is null then
    insert into public.editions (work_id, format, language, publisher, published_year, source_id, source_url, retrieved_at)
    values (wid, 'ebook_epub', coalesce(lang, 'und'), 'Project Gutenberg',
            nullif(substr(book.issued, 1, 4), '')::smallint, src, page_url, p_fetched_at)
    returning id into eid;
  else
    update public.editions set language = coalesce(lang, language),
      published_year = nullif(substr(book.issued, 1, 4), '')::smallint, retrieved_at = p_fetched_at
    where id = eid;
  end if;

  -- People: authors on the work; translators, illustrators and editors on this edition.
  for a in select * from xmltable(
      xmlnamespaces('http://www.w3.org/1999/02/22-rdf-syntax-ns#' as rdf, 'http://purl.org/dc/terms/' as dcterms,
                    'http://www.gutenberg.org/2009/pgterms/' as pgterms),
      '/rdf:RDF/pgterms:ebook/*/pgterms:agent' passing doc
      columns ord for ordinality,
              rel text path 'local-name(..)',
              about text path '@rdf:about',
              name text path 'pgterms:name',
              birth text path 'pgterms:birthdate',
              death text path 'pgterms:deathdate',
              webpage text path '(pgterms:webpage/@rdf:resource)[1]') loop
    continue when a.name is null or a.rel not in ('creator', 'trl', 'ill', 'edt', 'aut');
    cid := private.upsert_contributor(src, a.about, private.person_name(a.name),
      btrim(regexp_replace(a.name, '\s*\([^)]*\)', '', 'g')),
      nullif(a.birth, '')::smallint, nullif(a.death, '')::smallint,
      'https://www.gutenberg.org/ebooks/author/' || regexp_replace(a.about, '^.*/', ''),
      jsonb_build_object('name', a.name, 'birthdate', a.birth, 'deathdate', a.death, 'webpage', a.webpage));
    if a.rel in ('creator', 'aut') then
      creators := creators || ' ' || a.name || ' ' || private.person_name(a.name);
      insert into public.work_contributors (work_id, contributor_id, role, position)
      values (wid, cid, 'author', a.ord) on conflict do nothing;
    else
      insert into public.edition_contributors (edition_id, contributor_id, role)
      values (eid, cid, case a.rel when 'trl' then 'translator' when 'ill' then 'illustrator' else 'editor' end
              ::public.contributor_role)
      on conflict do nothing;
    end if;
  end loop;

  if q.expected_author is null then
    if btrim(creators) <> '' and not private.names_match('anonymous', creators) then
      flags := array_append(flags, 'author_mismatch');
    end if;
  elsif btrim(creators) = '' then
    flags := array_append(flags, 'missing_author');
  elsif not private.names_match(q.expected_author, creators) then
    flags := array_append(flags, 'author_mismatch');
  end if;

  -- Where to read: replaced on every refresh, keeping each offer's review state.
  delete from public.offers where edition_id = eid and source_id = src and status <> 'published'
    and url is distinct from html_url and url is distinct from epub_url;
  if html_url is not null and not exists (select 1 from public.offers where edition_id = eid and url = html_url) then
    insert into public.offers (edition_id, access, license, provider, source_id, url, is_official)
    values (eid, 'read_official_external', 'public_domain', 'Project Gutenberg', src, html_url, true);
  end if;
  if epub_url is not null and not exists (select 1 from public.offers where edition_id = eid and url = epub_url) then
    insert into public.offers (edition_id, access, license, provider, source_id, url, is_official)
    values (eid, 'download', 'public_domain', 'Project Gutenberg', src, epub_url, true);
  end if;
  if html_url is null and epub_url is null then flags := array_append(flags, 'no_reading_link'); end if;

  -- Rights in the United States, as the source states them. Other countries differ.
  if 'rights_not_us_public_domain' <> all (flags) then
    insert into public.work_rights (work_id, territory, status, basis, evidence_url, determined_on)
    values (wid, 'US', 'public_domain', 'Project Gutenberg states: "Public domain in the USA."', page_url, p_fetched_at::date)
    on conflict (work_id, territory) do update
      set status = excluded.status, basis = excluded.basis, evidence_url = excluded.evidence_url,
          determined_on = excluded.determined_on;
  end if;

  -- Provenance: the record exactly as fetched.
  insert into public.source_records (source_id, external_id, source_url, payload, payload_hash, fetched_at, work_id, edition_id)
  values (src, 'ebooks/' || ebook_no, 'https://www.gutenberg.org/cache/epub/' || ebook_no || '/pg' || ebook_no || '.rdf',
          jsonb_build_object('format', 'application/rdf+xml', 'license', 'CC0-1.0', 'rdf', p_xml,
                             'curation', jsonb_build_object('batch', q.batch, 'kind', q.kind, 'genres', q.genres,
                                                            'expected_title', q.expected_title,
                                                            'expected_author', q.expected_author)),
          hash, p_fetched_at, wid, eid)
  on conflict on constraint source_records_external_key do update
    set payload = excluded.payload, payload_hash = excluded.payload_hash, fetched_at = excluded.fetched_at,
        source_url = excluded.source_url, work_id = excluded.work_id, edition_id = excluded.edition_id;

  if is_new then
    if cardinality(flags) > 0 then
      update public.works set review_flags = flags where id = wid;
    end if;
    perform private.flag_duplicates(wid);
  elsif cardinality(flags) > 0 then
    -- A refreshed record that no longer checks out is held back from visitors.
    update public.works set review_flags = array(select distinct unnest(review_flags || flags)),
      status = case when status = 'published' then 'in_review'::public.record_status else status end
    where id = wid;
  end if;

  return jsonb_build_object('outcome', outcome, 'work_id', wid,
    'flags', (select coalesce(jsonb_agg(f), '[]'::jsonb) from unnest((select review_flags from public.works where id = wid)) f));
end $$;

-- ── Standard Ebooks: the free New Releases feed → editions on matching works, or new works ──
create function private.ingest_standard_ebooks_entry(p_entry xml, p_fetched_at timestamptz) returns jsonb
language plpgsql set search_path = '' as $$
declare
  src smallint;
  e record;
  ext text;
  hash text;
  existing public.source_records;
  wid uuid;
  eid uuid;
  cid uuid;
  subj text[];
  se_subj text[];
  v_kind public.work_kind;
  genre_slugs text[] := '{}';
  author_names text[];
  n text;
  pos integer := 0;
  read_url text;
  epub_url text;
  v_description text;
  outcome text;
  flags text[] := '{}';
begin
  select id into src from public.sources where slug = 'standard-ebooks';
  select * into e from xmltable(
    xmlnamespaces('http://www.w3.org/2005/Atom' as a), '/a:entry' passing p_entry
    columns id text path 'a:id', title text path 'a:title', published text path 'a:published',
            rights text path 'a:rights', summary text path 'a:summary', content text path 'a:content');
  if e.id is null or e.id !~ '^https://standardebooks\.org/ebooks/' then
    raise exception 'Not a Standard Ebooks entry: %', coalesce(e.id, '(no id)');
  end if;
  if coalesce(btrim(e.title), '') = '' then raise exception 'Entry % has no title', e.id; end if;
  ext := substr(e.id, length('https://standardebooks.org/') + 1);
  hash := md5(p_entry::text);

  select * into existing from public.source_records where source_id = src and external_id = ext;
  if found and existing.payload_hash = hash and existing.work_id is not null then
    update public.source_records set fetched_at = p_fetched_at where id = existing.id;
    return jsonb_build_object('outcome', 'unchanged', 'work_id', existing.work_id);
  end if;

  select coalesce(array_agg(name order by ord), '{}') into author_names from xmltable(
    xmlnamespaces('http://www.w3.org/2005/Atom' as a), '/a:entry/a:author' passing p_entry
    columns ord for ordinality, name text path 'a:name');
  select coalesce(array_agg(term) filter (where scheme = 'http://purl.org/dc/terms/LCSH'), '{}'),
         coalesce(array_agg(term) filter (where scheme = 'https://standardebooks.org/vocab/subjects'), '{}')
  into subj, se_subj from xmltable(
    xmlnamespaces('http://www.w3.org/2005/Atom' as a), '/a:entry/a:category' passing p_entry
    columns scheme text path '@scheme', term text path '@term');
  select max(regexp_replace(href, '\?.*$', '')) filter (where rel = 'enclosure' and title = 'XHTML'),
         max(regexp_replace(href, '\?.*$', '')) filter (where rel = 'enclosure' and title = 'Recommended compatible epub')
  into read_url, epub_url from xmltable(
    xmlnamespaces('http://www.w3.org/2005/Atom' as a), '/a:entry/a:link' passing p_entry
    columns href text path '@href', rel text path '@rel', title text path '@title');

  -- Standard Ebooks' own subject vocabulary decides the form and the genres.
  v_kind := case
    when 'Poetry' = any (se_subj) then 'poetry'
    when 'Drama' = any (se_subj) then 'drama'
    when 'Shorts' = any (se_subj) then 'short_stories'
    when 'Memoir' = any (se_subj) or 'Autobiography' = any (se_subj) then 'memoir'
    when 'Biography' = any (se_subj) then 'biography'
    when 'Nonfiction' = any (se_subj) or 'Philosophy' = any (se_subj) or 'Travel' = any (se_subj)
      or 'Spirituality' = any (se_subj) then 'nonfiction'
    else 'novel' end;
  select coalesce(array_agg(distinct g), '{}') into genre_slugs from unnest(se_subj) s,
    lateral (select case s
      when 'Adventure' then 'adventure' when 'Fantasy' then 'fantasy' when 'Horror' then 'horror'
      when 'Mystery' then 'mystery' when 'Science Fiction' then 'science-fiction' when 'Satire' then 'satire'
      when 'Comedy' then 'comedy' when 'Humor' then 'comedy' when 'Romance' then 'romance'
      when 'Children’s' then 'children' when 'Philosophy' then 'philosophy' when 'Travel' then 'travel'
      when 'Spirituality' then 'religion' when 'Memoir' then 'biography-memoir'
      when 'Autobiography' then 'biography-memoir' when 'Biography' then 'biography-memoir' end as g) m
  where g is not null;
  v_description := nullif(private.html_to_text(coalesce(e.content, e.summary)), '');

  if coalesce(btrim(e.rights), '') !~ '^Public domain in the United States' then
    flags := array_append(flags, 'rights_not_us_public_domain');
  end if;
  if cardinality(author_names) = 0 then flags := array_append(flags, 'missing_author'); end if;

  -- The same work may already be here from Project Gutenberg: same title, same author.
  wid := existing.work_id;
  if wid is null then
    select w.id into wid from public.works w
    where private.norm(w.title) = private.norm(e.title)
      and exists (select 1 from public.work_contributors wc join public.contributors c on c.id = wc.contributor_id
                  where wc.work_id = w.id and wc.role = 'author'
                    and private.norm(c.name) = any (select private.norm(x) from unnest(author_names) x))
      and 'possible_duplicate' <> all (w.review_flags)
    order by (w.status = 'published') desc, w.created_at, w.id limit 1;
  end if;

  if wid is null then
    insert into public.works (slug, title, kind, subjects, description, description_license, description_source_url, status)
    values (private.unique_work_slug(e.title, author_names[1], substr(md5(ext), 1, 6)), btrim(e.title), v_kind, subj,
            v_description, case when v_description is not null then 'cc0'::public.license_kind end,
            case when v_description is not null then e.id end, 'in_review')
    returning id into wid;
    insert into public.work_genres (work_id, genre_id, is_primary)
    select wid, g.id, false from public.genres g where g.slug = any (genre_slugs || '{classics}')
    on conflict do nothing;
    outcome := 'created';
  else
    -- Standard Ebooks' CC0 description is used when the work has none yet.
    update public.works set
      description = coalesce(works.description, v_description),
      description_license = case when works.description is null and v_description is not null then 'cc0' else works.description_license end,
      description_source_url = case when works.description is null and v_description is not null then e.id else works.description_source_url end,
      subjects = array(select distinct unnest(works.subjects || subj))
    where id = wid;
    outcome := 'updated';
  end if;

  foreach n in array author_names loop
    pos := pos + 1;
    cid := private.upsert_contributor(src, null, btrim(n), null, null, null, null, null);
    insert into public.work_contributors (work_id, contributor_id, role, position)
    values (wid, cid, 'author', pos) on conflict do nothing;
  end loop;

  select id into eid from public.editions where work_id = wid and source_id = src and source_url = e.id;
  if eid is null then
    insert into public.editions (work_id, format, language, publisher, published_year, source_id, source_url, retrieved_at)
    values (wid, 'ebook_epub', 'en', 'Standard Ebooks', nullif(substr(e.published, 1, 4), '')::smallint, src, e.id, p_fetched_at)
    returning id into eid;
  else
    update public.editions set retrieved_at = p_fetched_at where id = eid;
  end if;
  if read_url is not null and not exists (select 1 from public.offers where edition_id = eid and url = read_url) then
    insert into public.offers (edition_id, access, license, provider, source_id, url)
    values (eid, 'read_official_external', 'public_domain', 'Standard Ebooks', src, read_url);
  end if;
  if epub_url is not null and not exists (select 1 from public.offers where edition_id = eid and url = epub_url) then
    insert into public.offers (edition_id, access, license, provider, source_id, url)
    values (eid, 'download', 'public_domain', 'Standard Ebooks', src, epub_url);
  end if;

  if 'rights_not_us_public_domain' <> all (flags) then
    insert into public.work_rights (work_id, territory, status, basis, evidence_url, determined_on)
    values (wid, 'US', 'public_domain', 'Standard Ebooks states: "Public domain in the United States."', e.id, p_fetched_at::date)
    on conflict (work_id, territory) do nothing;
  end if;

  insert into public.source_records (source_id, external_id, source_url, payload, payload_hash, fetched_at, work_id, edition_id)
  values (src, ext, e.id, jsonb_build_object('format', 'application/atom+xml', 'license', 'CC0-1.0', 'entry', p_entry::text),
          hash, p_fetched_at, wid, eid)
  on conflict on constraint source_records_external_key do update
    set payload = excluded.payload, payload_hash = excluded.payload_hash, fetched_at = excluded.fetched_at,
        work_id = excluded.work_id, edition_id = excluded.edition_id;

  if cardinality(flags) > 0 then
    update public.works set review_flags = array(select distinct unnest(review_flags || flags)),
      status = case when status = 'published' then 'in_review'::public.record_status else status end
    where id = wid;
  end if;
  if outcome = 'created' then perform private.flag_duplicates(wid); end if;
  return jsonb_build_object('outcome', outcome, 'work_id', wid);
end $$;

-- ── Import runs ────────────────────────────────────────────────────────
create function private.current_run(p_source smallint, p_trigger text) returns bigint
language plpgsql set search_path = '' as $$
declare
  rid bigint;
begin
  select id into rid from public.ingest_runs where source_id = p_source and status = 'running'
  order by started_at desc limit 1;
  if rid is null then
    insert into public.ingest_runs (source_id, trigger) values (p_source, p_trigger) returning id into rid;
  end if;
  return rid;
end $$;

create function private.record_result(p_run bigint, p_external_id text, p_result jsonb, p_error text) returns void
language sql set search_path = '' as $$
  update public.ingest_runs set
    fetched = fetched + 1,
    created = created + case when p_result ->> 'outcome' = 'created' then 1 else 0 end,
    updated = updated + case when p_result ->> 'outcome' = 'updated' then 1 else 0 end,
    flagged = flagged + case when jsonb_array_length(coalesce(p_result -> 'flags', '[]')) > 0 then 1 else 0 end,
    errors = case when p_error is null then errors
                  else errors || jsonb_build_object('item', p_external_id, 'error', left(p_error, 500), 'at', now()) end
  where id = p_run
$$;

-- ── The scheduled worker: one Project Gutenberg request in flight at a time ──
create function private.import_tick() returns text
language plpgsql set search_path = '' as $$
declare
  src smallint;
  item private.import_queue;
  resp record;
  run_id bigint;
  result jsonb;
  err text;
  sent text := 'idle';
begin
  select id into src from public.sources where slug = 'project-gutenberg' and enabled;
  if src is null then return 'source disabled'; end if;

  -- 1. Collect the answer to the request in flight, if it has arrived.
  for item in select * from private.import_queue where state = 'requested' and source_slug = 'project-gutenberg'
              order by id for update skip locked loop
    select r.status_code, r.content, r.timed_out, r.error_msg, r.created into resp
    from net._http_response r where r.id = item.request_id;
    if not found then
      if item.requested_at < now() - interval '3 minutes' then
        err := 'No response within 3 minutes';
      else
        continue;
      end if;
    elsif resp.status_code = 200 and resp.content is not null and not coalesce(resp.timed_out, false) then
      err := null;
      begin
        result := private.ingest_gutenberg_rdf(item.id, resp.content, coalesce(resp.created, now()));
      exception when others then
        -- Everything this book wrote is rolled back with the sub-transaction.
        err := sqlerrm;
      end;
    else
      err := coalesce(resp.error_msg, 'HTTP ' || coalesce(resp.status_code::text, 'error'));
    end if;

    run_id := private.current_run(src, 'schedule');
    if err is null then
      update private.import_queue set state = 'done', finished_at = now(), last_error = null,
        work_id = (result ->> 'work_id')::uuid where id = item.id;
      perform private.record_result(run_id, item.external_id, result, null);
    else
      update private.import_queue set
        state = case when item.attempts >= 3 or err like 'HTTP 404%' then 'failed' else 'queued' end,
        available_at = now() + make_interval(mins => 5 * item.attempts),
        request_id = null, last_error = left(err, 500), finished_at = now()
      where id = item.id;
      perform private.record_result(run_id, item.external_id, null, err);
    end if;
  end loop;

  -- 2. Send the next request, unless one is still in flight.
  if not exists (select 1 from private.import_queue where state = 'requested' and source_slug = 'project-gutenberg') then
    select * into item from private.import_queue
    where state = 'queued' and source_slug = 'project-gutenberg' and available_at <= now()
    order by id limit 1 for update skip locked;
    if found then
      run_id := private.current_run(src, 'schedule');
      update private.import_queue set state = 'requested', attempts = attempts + 1, requested_at = now(),
        request_id = net.http_get(
          url := 'https://www.gutenberg.org/cache/epub/' || item.external_id || '/pg' || item.external_id || '.rdf',
          headers := jsonb_build_object('User-Agent',
            'BookVerse catalogue importer (https://bookverse-1.netlify.app; curated list, one request every 5 s)'),
          timeout_milliseconds := 30000)
      where id = item.id;
      sent := 'requested ' || item.external_id;
    elsif not exists (select 1 from private.import_queue where source_slug = 'project-gutenberg'
                      and state = 'queued') then
      update public.ingest_runs set finished_at = now(),
        status = case when jsonb_array_length(errors) = 0 then 'succeeded' else 'partial' end
      where source_id = src and status = 'running';
    end if;
  end if;
  return sent;
end $$;

-- Weekly: queue every imported Project Gutenberg book again so changes at the source are picked up.
create function private.refresh_gutenberg() returns integer
language sql set search_path = '' as $$
  with r as (
    update private.import_queue set state = 'queued', attempts = 0, available_at = now()
    where source_slug = 'project-gutenberg' and state in ('done', 'failed')
    returning 1)
  select count(*)::int from r
$$;

-- Daily: request the Standard Ebooks New Releases feed, and ingest it once it has arrived.
create function private.standard_ebooks_tick() returns text
language plpgsql set search_path = '' as $$
declare
  src smallint;
  st private.feed_state;
  resp record;
  doc xml;
  entry xml;
  run_id bigint;
  result jsonb;
  ok integer := 0;
  bad integer := 0;
begin
  select id into src from public.sources where slug = 'standard-ebooks' and enabled;
  if src is null then return 'source disabled'; end if;
  select * into st from private.feed_state where source_slug = 'standard-ebooks' for update;

  if st.request_id is not null then
    select r.status_code, r.content, r.created, r.error_msg into resp from net._http_response r where r.id = st.request_id;
    if not found then
      if st.requested_at < now() - interval '10 minutes' then
        update private.feed_state set request_id = null, last_error = 'No response within 10 minutes'
        where source_slug = 'standard-ebooks';
      end if;
      return 'waiting';
    end if;
    run_id := private.current_run(src, 'schedule');
    if resp.status_code <> 200 or resp.content is null then
      update private.feed_state set request_id = null, last_error = coalesce(resp.error_msg, 'HTTP ' || resp.status_code)
      where source_slug = 'standard-ebooks';
      update public.ingest_runs set finished_at = now(), status = 'failed',
        errors = errors || jsonb_build_object('item', 'feed', 'error', coalesce(resp.error_msg, 'HTTP ' || resp.status_code))
      where id = run_id;
      return 'failed';
    end if;
    begin
      doc := xmlparse(document resp.content);
    exception when others then
      update private.feed_state set request_id = null, last_error = 'Feed is not valid XML: ' || sqlerrm
      where source_slug = 'standard-ebooks';
      update public.ingest_runs set finished_at = now(), status = 'failed',
        errors = errors || jsonb_build_object('item', 'feed', 'error', 'invalid XML') where id = run_id;
      return 'failed';
    end;
    for entry in select unnest(xpath('/a:feed/a:entry', doc, array[array['a', 'http://www.w3.org/2005/Atom']])) loop
      begin
        result := private.ingest_standard_ebooks_entry(entry, coalesce(resp.created, now()));
        perform private.record_result(run_id, result ->> 'work_id', result, null);
        ok := ok + 1;
      exception when others then
        perform private.record_result(run_id,
          (xpath('/a:entry/a:id/text()', entry, array[array['a', 'http://www.w3.org/2005/Atom']]))[1]::text, null, sqlerrm);
        bad := bad + 1;
      end;
    end loop;
    update public.ingest_runs set finished_at = now(), status = case when bad = 0 then 'succeeded' else 'partial' end
    where id = run_id;
    update private.feed_state set request_id = null, last_success_at = now(), last_error = null
    where source_slug = 'standard-ebooks';
    return format('ingested %s entries, %s failed', ok, bad);
  end if;

  if st.last_success_at is null or st.last_success_at < now() - interval '23 hours' then
    update private.feed_state set requested_at = now(), request_id = net.http_get(
      url := 'https://standardebooks.org/feeds/atom/new-releases',
      headers := jsonb_build_object('User-Agent', 'BookVerse catalogue importer (https://bookverse-1.netlify.app; daily)'),
      timeout_milliseconds := 30000)
    where source_slug = 'standard-ebooks';
    return 'requested';
  end if;
  return 'idle';
end $$;

-- Loads the weekly offline catalogue from a fetched response into private.gutenberg_catalogue.
create function private.load_gutenberg_catalogue(p_response_id bigint) returns integer
language plpgsql set search_path = '' as $$
declare
  body text;
  loaded integer;
  f text := '("(?:[^"]|"")*"|[^,\r\n"]*)';
begin
  select content into body from net._http_response where id = p_response_id and status_code = 200;
  if body is null or left(body, 13) <> 'Text#,Type,Is' then
    raise exception 'Response % is not the Project Gutenberg catalogue', p_response_id;
  end if;
  create temporary table gc_load on commit drop as
  select m[1]::integer as id, m[2] as type, m[3] as issued,
         replace(btrim(m[4], '"'), '""', '"') as title, replace(btrim(m[5], '"'), '""', '"') as language,
         replace(btrim(m[6], '"'), '""', '"') as authors, replace(btrim(m[7], '"'), '""', '"') as subjects,
         replace(btrim(m[8], '"'), '""', '"') as locc, replace(btrim(m[9], '"'), '""', '"') as bookshelves
  from regexp_matches(body, '\n([0-9]+),([A-Za-z]+),([0-9-]*),' || f || ',' || f || ',' || f || ',' || f || ',' || f
                            || ',' || f, 'g') as m;
  select count(*) into loaded from gc_load;
  if loaded < 50000 then
    raise exception 'Only % catalogue rows parsed; keeping the previous copy', loaded;
  end if;
  delete from private.gutenberg_catalogue;
  insert into private.gutenberg_catalogue (id, type, issued, title, language, authors, subjects, locc, bookshelves)
  select distinct on (id) id, type, issued, title, language, authors, subjects, locc, bookshelves from gc_load
  where title <> '' order by id;
  return loaded;
end $$;

-- Finds a curated work in the catalogue: same main title, every word of the author's name.
create function private.find_gutenberg(p_title text, p_author text)
returns table (id integer, title text, authors text, language text)
language sql stable set search_path = '' as $$
  select c.id, c.title, c.authors, c.language from private.gutenberg_catalogue c
  where c.type = 'Text'
    and private.norm(private.main_title(c.title)) = private.norm(p_title)
    and (p_author is null or private.names_match(p_author, c.authors))
  order by (c.language = 'en') desc, c.id
$$;

revoke execute on all functions in schema private from public;
grant execute on function private.has_role(public.staff_role) to authenticated;
