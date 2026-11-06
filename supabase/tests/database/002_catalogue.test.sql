-- pgTAP checks for the Milestone 2 catalogue: who can see and change what.
begin;
create extension if not exists pgtap with schema extensions;
select plan(40);

create or replace function pg_temp.act_as(who uuid) returns void language plpgsql as $$
begin
  if who is null then
    perform set_config('role', 'anon', true);
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  else
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', json_build_object('sub', who, 'role', 'authenticated')::text, true);
  end if;
end $$;
create or replace function pg_temp.act_as_platform() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

-- People: a reader (a), another reader (b), an editor (e).
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-4000-b000-00000000000a', 'reader-a@example.test', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-b000-00000000000b', 'reader-b@example.test', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-b000-00000000000e', 'editor@example.test', '{}', 'authenticated', 'authenticated');
insert into public.user_roles (user_id, role) values ('00000000-0000-4000-b000-00000000000e', 'editor');

-- Catalogue fixtures, written as the platform (the importer uses the secret key).
insert into public.sources (slug, name, homepage_url, enabled) values
  ('test-on', 'Enabled source', 'https://example.test/on', true),
  ('test-off', 'Disabled source', 'https://example.test/off', false);
insert into public.works (id, slug, title, kind, status) values
  ('00000000-0000-4000-c000-000000000001', 'published-work', 'Published Work', 'novel', 'in_review'),
  ('00000000-0000-4000-c000-000000000002', 'draft-work', 'Draft Work', 'novel', 'in_review');
insert into public.editions (id, work_id, format, language, status) values
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-c000-000000000001', 'ebook_epub', 'en', 'published'),
  ('00000000-0000-4000-d000-000000000002', '00000000-0000-4000-c000-000000000002', 'ebook_epub', 'en', 'published');
insert into public.offers (edition_id, access, license, provider, url, status) values
  ('00000000-0000-4000-d000-000000000001', 'download', 'public_domain', 'Test', 'https://example.test/1', 'published'),
  ('00000000-0000-4000-d000-000000000002', 'download', 'public_domain', 'Test', 'https://example.test/2', 'published');
insert into public.work_rights (work_id, territory, status, basis) values
  ('00000000-0000-4000-c000-000000000001', 'US', 'public_domain', 'Published before 1931'),
  ('00000000-0000-4000-c000-000000000002', 'US', 'public_domain', 'Published before 1931');
insert into public.source_records (source_id, external_id, payload, payload_hash, work_id)
  select id, 'x' || n, '{}', 'h', ('00000000-0000-4000-c000-00000000000' || n)::uuid
  from public.sources, generate_series(1, 2) n where slug = 'test-on';
update public.works set status = 'published' where slug = 'published-work';
insert into public.ingest_runs (source_id, trigger) select id, 'manual' from public.sources where slug = 'test-on';

-- ── Visitors ──
select pg_temp.act_as(null);
select is((select count(*)::int from public.works), 1, 'visitors see published works only');
select is((select count(*)::int from public.editions), 1, 'visitors never see editions of an unpublished work');
select is((select count(*)::int from public.offers), 1, 'visitors never see offers of an unpublished work');
select is((select count(*)::int from public.work_rights), 1, 'visitors never see rights of an unpublished work');
select is((select count(*)::int from public.sources where slug like 'test-%'), 1, 'visitors see enabled sources only');
select throws_ok($$select * from public.source_records$$, '42501', null, 'visitors cannot read raw source records');
select throws_ok($$select * from public.ingest_runs$$, '42501', null, 'visitors cannot read import runs');
select throws_ok($$select * from public.duplicate_flags$$, '42501', null, 'visitors cannot read duplicate flags');
select throws_ok($$insert into public.works (slug, title, kind) values ('x', 'X', 'novel')$$,
  '42501', null, 'visitors cannot add works');

-- ── Signed-in readers ──
select pg_temp.act_as('00000000-0000-4000-b000-00000000000a');
select is((select count(*)::int from public.works), 1, 'readers see published works only');
select is((select count(*)::int from public.source_records), 0, 'readers see no raw source records');
select throws_ok($$insert into public.works (slug, title, kind) values ('x', 'X', 'novel')$$,
  '42501', null, 'readers cannot add works');
select is_empty($$update public.works set title = 'Changed' where slug = 'published-work' returning id$$,
  'readers cannot edit works');
select is_empty($$delete from public.works where slug = 'published-work' returning id$$,
  'readers cannot delete works');

-- ── Editors ──
select pg_temp.act_as('00000000-0000-4000-b000-00000000000e');
select is((select count(*)::int from public.works), 2, 'editors see unpublished works too');
select is((select count(*)::int from public.source_records), 2, 'editors see raw source records');
select lives_ok($$insert into public.works (slug, title, kind) values ('editor-work', 'Editor Work', 'novel')$$,
  'editors can add works');
select is((select status::text from public.works where slug = 'editor-work'), 'in_review',
  'new works start unpublished');
select lives_ok($$update public.works set status = 'published' where slug = 'draft-work'$$,
  'editors can publish a reviewed work');
select lives_ok($$update public.works set status = 'in_review' where slug = 'draft-work'$$,
  'editors can unpublish a work');

-- ── Data rules (as the platform) ──
select pg_temp.act_as_platform();
select throws_ok($$update public.works set status = 'published', review_flags = '{missing_author_dates}' where slug = 'draft-work'$$,
  '23514', null, 'a work with open review flags cannot be published');
select throws_ok($$insert into public.offers (edition_id, access, license, provider, url, is_affiliate)
  values ('00000000-0000-4000-d000-000000000001', 'buy_print', 'all_rights_reserved', 'Shop', 'https://example.test/b', true)$$,
  '23514', null, 'affiliate links are refused');
select throws_ok($$insert into public.offers (edition_id, access, license, provider)
  values ('00000000-0000-4000-d000-000000000001', 'read_on_bookverse', 'all_rights_reserved', 'BookVerse')$$,
  '23514', null, 'hosting needs an open licence');
select throws_ok($$insert into public.offers (edition_id, access, license, provider)
  values ('00000000-0000-4000-d000-000000000001', 'download', 'public_domain', 'Somewhere')$$,
  '23514', null, 'an external offer needs a link');
select throws_ok($$update public.editions set cover_url = 'https://example.test/c.jpg'
  where id = '00000000-0000-4000-d000-000000000001'$$,
  '23514', null, 'a cover needs a licence that permits showing it');
select throws_ok($$update public.editions set cover_url = 'https://example.test/c.jpg', cover_license = 'all_rights_reserved'
  where id = '00000000-0000-4000-d000-000000000001'$$,
  '23514', null, 'an all-rights-reserved cover is refused');
select throws_ok($$insert into public.work_rights (work_id, territory, status, basis)
  values ('00000000-0000-4000-c000-000000000001', 'usa', 'public_domain', 'Published before 1931')$$,
  '23514', null, 'territories are two-letter country codes');
select throws_ok($$insert into public.duplicate_flags (work_id, other_id, reason)
  values ('00000000-0000-4000-c000-000000000002', '00000000-0000-4000-c000-000000000001', 'same title')$$,
  '23514', null, 'each duplicate pair is stored once, in a fixed order');
select lives_ok($$insert into public.duplicate_flags (work_id, other_id, reason)
  values ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-c000-000000000002', 'same title')$$,
  'likely duplicates can be flagged');

-- ── Shelves ──
select pg_temp.act_as('00000000-0000-4000-b000-00000000000a');
select lives_ok($$insert into public.shelf_items (user_id, work_id, shelf)
  values ('00000000-0000-4000-b000-00000000000a', '00000000-0000-4000-c000-000000000001', 'want_to_read')$$,
  'readers can shelve a book');
select lives_ok($$update public.shelf_items set shelf = 'reading' where work_id = '00000000-0000-4000-c000-000000000001'$$,
  'readers can move a book between shelves');
select throws_ok($$insert into public.shelf_items (user_id, work_id, shelf)
  values ('00000000-0000-4000-b000-00000000000b', '00000000-0000-4000-c000-000000000001', 'read')$$,
  '42501', null, 'nobody can shelve books for someone else');
select lives_ok($$insert into public.user_shelves (id, user_id, name)
  values ('00000000-0000-4000-e000-00000000000a', '00000000-0000-4000-b000-00000000000a', 'Summer reading')$$,
  'readers can create a custom shelf');
select lives_ok($$insert into public.user_shelf_works (shelf_id, work_id)
  values ('00000000-0000-4000-e000-00000000000a', '00000000-0000-4000-c000-000000000001')$$,
  'readers can add a book to their own shelf');

select pg_temp.act_as('00000000-0000-4000-b000-00000000000b');
select is((select count(*)::int from public.shelf_items), 0, 'shelves are private');
select is((select count(*)::int from public.user_shelves), 0, 'custom shelves are private');
select is((select count(*)::int from public.user_shelf_works), 0, 'custom shelf contents are private');
select throws_ok($$insert into public.user_shelf_works (shelf_id, work_id)
  values ('00000000-0000-4000-e000-00000000000a', '00000000-0000-4000-c000-000000000001')$$,
  '42501', null, 'nobody can add to someone else''s shelf');

select pg_temp.act_as(null);
select throws_ok($$select * from public.shelf_items$$, '42501', null, 'visitors have no access to shelves');

-- ── Account deletion still cleans up ──
select pg_temp.act_as_platform();
delete from auth.users where id = '00000000-0000-4000-b000-00000000000a';
select is((select count(*)::int from public.shelf_items where user_id = '00000000-0000-4000-b000-00000000000a')
        + (select count(*)::int from public.user_shelves where user_id = '00000000-0000-4000-b000-00000000000a'),
  0, 'deleting an account removes its shelves');

select * from finish();
rollback;
