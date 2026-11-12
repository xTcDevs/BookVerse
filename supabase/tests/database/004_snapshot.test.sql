-- pgTAP checks for the build-time catalogue snapshot: it returns published records only.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into public.works (id, slug, title, kind) values
  ('00000000-0000-4000-c000-0000000000a1', 'shown', 'Shown Work', 'novel'),
  ('00000000-0000-4000-c000-0000000000a2', 'held', 'Held Work', 'novel');
insert into public.contributors (id, slug, name, status) values
  ('00000000-0000-4000-a000-0000000000a1', 'shown-author', 'Shown Author', 'in_review'),
  ('00000000-0000-4000-a000-0000000000a2', 'held-author', 'Held Author', 'in_review');
insert into public.work_contributors (work_id, contributor_id, role) values
  ('00000000-0000-4000-c000-0000000000a1', '00000000-0000-4000-a000-0000000000a1', 'author'),
  ('00000000-0000-4000-c000-0000000000a2', '00000000-0000-4000-a000-0000000000a2', 'author');
insert into public.editions (id, work_id, format, language) values
  ('00000000-0000-4000-d000-0000000000a1', '00000000-0000-4000-c000-0000000000a1', 'ebook_epub', 'en'),
  ('00000000-0000-4000-d000-0000000000a2', '00000000-0000-4000-c000-0000000000a2', 'ebook_epub', 'en');
insert into public.offers (edition_id, access, license, provider, url) values
  ('00000000-0000-4000-d000-0000000000a1', 'download', 'public_domain', 'Example', 'https://example.org/a.epub'),
  ('00000000-0000-4000-d000-0000000000a2', 'download', 'public_domain', 'Example', 'https://example.org/b.epub');
insert into public.work_rights (work_id, territory, status, basis) values
  ('00000000-0000-4000-c000-0000000000a1', 'US', 'public_domain', 'Test basis');
insert into public.source_records (source_id, external_id, payload, payload_hash, work_id)
  select id, 'snapshot-test', '{"secret":"raw payload"}', 'h', '00000000-0000-4000-c000-0000000000a1'
  from public.sources where slug = 'bookverse-editorial';
update public.works set status = 'published' where slug = 'shown';

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select is((select jsonb_array_length(public.catalogue_snapshot() -> 'works')), 1, 'visitors get published works only');
select is((public.catalogue_snapshot() -> 'works' -> 0 ->> 'title'), 'Shown Work', 'the published work is included');
select is((select jsonb_array_length(public.catalogue_snapshot() -> 'works' -> 0 -> 'editions' -> 0 -> 'offers')), 1,
  'with its published links');
select is((public.catalogue_snapshot() -> 'works' -> 0 -> 'rights' -> 0 ->> 'territory'), 'US', 'and its rights by country');
select is((select string_agg(x ->> 'slug', ',') from jsonb_array_elements(public.catalogue_snapshot() -> 'contributors') x),
  'shown-author', 'only authors of published works are included');
select ok(position('Held' in public.catalogue_snapshot()::text) = 0, 'nothing from the unpublished work leaks');
select ok(position('raw payload' in public.catalogue_snapshot()::text) = 0, 'raw source records are never included');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-b000-0000000000ff","role":"authenticated"}';
select is((select jsonb_array_length(public.catalogue_snapshot() -> 'works')), 1, 'signed-in readers get the same published view');

select * from finish();
rollback;
