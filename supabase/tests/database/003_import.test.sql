-- pgTAP checks for the catalogue importers: parsing, validation, provenance, retry safety,
-- duplicate flags and the publishing rules. Runs offline: outgoing requests are captured by
-- pg_net's queue and the answers are inserted by hand, as pg_net would store them.
begin;
create extension if not exists pgtap with schema extensions;
select plan(68);

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

-- A Project Gutenberg RDF record, trimmed from the real record for ebook 1342 (fetched
-- 6 November 2026). The parameters let each test vary one field.
create or replace function pg_temp.rdf(no text, title text, rights text default 'Public domain in the USA.',
  agent_no text default '68', agent_name text default 'Austen, Jane', downloads text default '208430',
  extra text default '') returns text language sql as $$
select '<?xml version="1.0" encoding="utf-8"?>
<rdf:RDF xml:base="http://www.gutenberg.org/"
  xmlns:pgterms="http://www.gutenberg.org/2009/pgterms/"
  xmlns:dcterms="http://purl.org/dc/terms/"
  xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"
  xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
  xmlns:cc="http://web.resource.org/cc/"
  xmlns:marcrel="http://id.loc.gov/vocabulary/relators/"
  xmlns:dcam="http://purl.org/dc/dcam/">
  <pgterms:ebook rdf:about="ebooks/' || no || '">
    <dcterms:publisher>Project Gutenberg</dcterms:publisher>
    <dcterms:issued rdf:datatype="http://www.w3.org/2001/XMLSchema#date">1998-06-01</dcterms:issued>
    <dcterms:rights>' || rights || '</dcterms:rights>
    <pgterms:downloads rdf:datatype="http://www.w3.org/2001/XMLSchema#integer">' || downloads || '</pgterms:downloads>
    <dcterms:creator>
      <pgterms:agent rdf:about="2009/agents/' || agent_no || '">
        <pgterms:name>' || agent_name || '</pgterms:name>
        <pgterms:birthdate rdf:datatype="http://www.w3.org/2001/XMLSchema#integer">1775</pgterms:birthdate>
        <pgterms:deathdate rdf:datatype="http://www.w3.org/2001/XMLSchema#integer">1817</pgterms:deathdate>
        <pgterms:webpage rdf:resource="https://en.wikipedia.org/wiki/Jane_Austen"/>
      </pgterms:agent>
    </dcterms:creator>' || extra || '
    <dcterms:title>' || title || '</dcterms:title>
    <pgterms:marc520>An automatically generated summary that must never be shown. (This is an automatically generated summary.)</pgterms:marc520>
    <dcterms:language><rdf:Description rdf:nodeID="N1"><rdf:value rdf:datatype="http://purl.org/dc/terms/RFC4646">en</rdf:value></rdf:Description></dcterms:language>
    <dcterms:subject><rdf:Description rdf:nodeID="N2"><dcam:memberOf rdf:resource="http://purl.org/dc/terms/LCSH"/><rdf:value>Love stories</rdf:value></rdf:Description></dcterms:subject>
    <dcterms:subject><rdf:Description rdf:nodeID="N3"><dcam:memberOf rdf:resource="http://purl.org/dc/terms/LCSH"/><rdf:value>Courtship -- Fiction</rdf:value></rdf:Description></dcterms:subject>
    <dcterms:subject><rdf:Description rdf:nodeID="N4"><dcam:memberOf rdf:resource="http://purl.org/dc/terms/LCC"/><rdf:value>PR</rdf:value></rdf:Description></dcterms:subject>
    <dcterms:type><rdf:Description rdf:nodeID="N5"><dcam:memberOf rdf:resource="http://purl.org/dc/terms/DCMIType"/><rdf:value>Text</rdf:value></rdf:Description></dcterms:type>
    <dcterms:hasFormat><pgterms:file rdf:about="https://www.gutenberg.org/ebooks/' || no || '.html.images"><dcterms:isFormatOf rdf:resource="ebooks/' || no || '"/></pgterms:file></dcterms:hasFormat>
    <dcterms:hasFormat><pgterms:file rdf:about="https://www.gutenberg.org/ebooks/' || no || '.epub3.images"><dcterms:isFormatOf rdf:resource="ebooks/' || no || '"/></pgterms:file></dcterms:hasFormat>
    <dcterms:hasFormat><pgterms:file rdf:about="https://www.gutenberg.org/cache/epub/' || no || '/pg' || no || '.cover.medium.jpg"><dcterms:isFormatOf rdf:resource="ebooks/' || no || '"/></pgterms:file></dcterms:hasFormat>
  </pgterms:ebook>
  <cc:Work rdf:about=""><cc:license rdf:resource="https://creativecommons.org/publicdomain/zero/1.0/"/></cc:Work>
</rdf:RDF>
' $$;

-- A Standard Ebooks feed entry, in the shape of the real New Releases feed (6 November 2026).
create or replace function pg_temp.se_entry(path text, title text, author text, subjects text,
  summary text default 'A short summary.', rights text default 'Public domain in the United States. Users located outside of the United States must check their local laws before using this ebook.')
returns text language sql as $$
select '<entry xmlns="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <id>https://standardebooks.org/ebooks/' || path || '</id>
  <title>' || title || '</title>
  <author><name>' || author || '</name><uri>https://standardebooks.org/ebooks/' || split_part(path, '/', 1) || '</uri></author>
  <published>2026-11-02T20:04:27Z</published>
  <updated>2026-11-02T20:07:36Z</updated>
  <rights>' || rights || '</rights>
  <summary type="text">' || summary || '</summary>
  <content type="html">&lt;p&gt;First paragraph of the description.&lt;/p&gt; &lt;p&gt;Second paragraph, with &lt;i&gt;italics&lt;/i&gt;.&lt;/p&gt;</content>
  <category scheme="http://purl.org/dc/terms/LCSH" term="Detective and mystery stories"/>' || subjects || '
  <link href="https://standardebooks.org/ebooks/' || path || '" rel="alternate" type="application/xhtml+xml"/>
  <link href="https://standardebooks.org/ebooks/' || path || '/downloads/book.epub?source=feed" rel="enclosure" title="Recommended compatible epub" type="application/epub+zip"/>
  <link href="https://standardebooks.org/ebooks/' || path || '/text/single-page" rel="enclosure" title="XHTML" type="application/xhtml+xml"/>
</entry>' $$;

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-4000-b000-00000000000a', 'reader-a@example.test', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-b000-00000000000e', 'editor@example.test', '{}', 'authenticated', 'authenticated');
insert into public.user_roles (user_id, role) values ('00000000-0000-4000-b000-00000000000e', 'editor');

insert into private.import_queue (source_slug, external_id, batch, kind, genres, expected_title, expected_author) values
  ('project-gutenberg', '1342', 'test', 'novel', '{romance,classics}', 'Pride and Prejudice', 'Jane Austen'),
  ('project-gutenberg', '9001', 'test', 'novel', '{classics}', 'Emma', 'Jane Austen'),
  ('project-gutenberg', '9002', 'test', 'novel', '{classics}', 'Lady Susan', 'Jane Austen'),
  ('project-gutenberg', '42671', 'test', 'novel', '{romance}', 'Pride and Prejudice', 'Jane Austen'),
  ('project-gutenberg', '9003', 'test', 'novel', '{classics}', 'Persuasion', 'Jane Austen');

-- ── Helpers ──
select is(private.person_name('Austen, Jane'), 'Jane Austen', 'surname-first names are turned round');
select is(private.person_name('Wells, H. G. (Herbert George)'), 'H. G. Wells', 'expanded names in brackets are dropped');
select is(private.person_name('Tolstoy, Leo, graf'), 'Leo Tolstoy', 'titles after the name are dropped');
select is(private.person_name('Marcus Aurelius, Emperor of Rome'), 'Marcus Aurelius', 'epithets are not mistaken for first names');
select is(private.person_name('Homer'), 'Homer', 'single names are kept');
select ok(private.names_match('Fyodor Dostoyevsky', 'Dostoyevsky, Fyodor, 1821-1881'), 'author names match in any order');
select ok(not private.names_match('Jane Austen', 'Brontë, Charlotte'), 'different authors do not match');
select is(private.main_title(E'Frankenstein; Or, The Modern Prometheus'), 'Frankenstein', 'the main title stops at the subtitle');
select is(private.main_title('Jane Eyre: An Autobiography'), 'Jane Eyre', 'colon subtitles are recognised too');

-- ── A clean record ──
select is(private.ingest_gutenberg_rdf((select id from private.import_queue where external_id = '1342'),
  pg_temp.rdf('1342', 'Pride and Prejudice'), '2026-11-06 10:00+00') ->> 'outcome', 'created', 'a new record creates a work');
select is((select status::text from public.works where title = 'Pride and Prejudice'), 'in_review', 'imported works are unpublished');
select is((select review_flags from public.works where title = 'Pride and Prejudice'), '{}'::text[], 'a record that checks out has no flags');
select is((select subjects from public.works where title = 'Pride and Prejudice'), '{"Love stories","Courtship -- Fiction"}'::text[],
  'Library of Congress subject headings are kept, other schemes are not');
select is((select description from public.works where title = 'Pride and Prejudice'), null,
  'automatically generated summaries are never used as descriptions');
select is((select string_agg(g.slug, ',' order by wg.is_primary desc, g.slug) from public.work_genres wg join public.genres g on g.id = wg.genre_id
           join public.works w on w.id = wg.work_id where w.title = 'Pride and Prejudice'), 'romance,classics',
  'curated genres are assigned, the first one primary');
select results_eq($$select c.name, c.birth_year::int, c.death_year::int, c.dates_source_url from public.contributors c$$,
  $$values ('Jane Austen'::text, 1775, 1817, 'https://www.gutenberg.org/ebooks/author/68'::text)$$,
  'the author is recorded with life dates and where they came from');
select results_eq($$select format::text, language, publisher, published_year::int, source_url from public.editions$$,
  $$values ('ebook_epub'::text, 'en'::text, 'Project Gutenberg'::text, 1998, 'https://www.gutenberg.org/ebooks/1342'::text)$$,
  'the Project Gutenberg edition is recorded with its release year, not a first-publication date');
select results_eq($$select access::text, license::text, url, status::text from public.offers order by access$$,
  $$values ('download'::text, 'public_domain'::text, 'https://www.gutenberg.org/ebooks/1342.epub3.images'::text, 'in_review'::text),
           ('read_official_external', 'public_domain', 'https://www.gutenberg.org/ebooks/1342.html.images', 'in_review')$$,
  'reading and download links point at Project Gutenberg itself');
select results_eq($$select territory, status::text, basis, evidence_url from public.work_rights$$,
  $$values ('US'::text, 'public_domain'::text, 'Project Gutenberg states: "Public domain in the USA."'::text, 'https://www.gutenberg.org/ebooks/1342'::text)$$,
  'rights are recorded for the United States only, with the source''s own words');
select is((select count(*)::int from public.editions where cover_url is not null), 0, 'no covers of unknown licence are taken');
select ok((select payload ->> 'rdf' like '%ebooks/1342%' and payload ->> 'license' = 'CC0-1.0'
                  and payload -> 'curation' ->> 'batch' = 'test' and work_id is not null and fetched_at = '2026-11-06 10:00+00'
           from public.source_records where external_id = 'ebooks/1342'),
  'the raw record, its licence, the curation choices and the retrieval time are kept');

-- ── Retry safety ──
select is(private.ingest_gutenberg_rdf((select id from private.import_queue where external_id = '1342'),
  pg_temp.rdf('1342', 'Pride and Prejudice', downloads => '208999'), '2026-11-07 10:00+00') ->> 'outcome', 'unchanged',
  'a record that only changed its download counter is recognised as unchanged');
select is((select count(*)::int from public.works) + (select count(*)::int from public.editions)
        + (select count(*)::int from public.offers) + (select count(*)::int from public.contributors), 5,
  'importing the same record twice creates nothing new');
select is((select fetched_at from public.source_records where external_id = 'ebooks/1342'), '2026-11-07 10:00+00'::timestamptz,
  'the retrieval date moves forward when a record is checked again');
select throws_ok($$select private.ingest_gutenberg_rdf((select id from private.import_queue where external_id = '9003'),
  '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><broken', now())$$,
  null, null, 'a malformed record is refused');
select throws_ok($$select private.ingest_gutenberg_rdf((select id from private.import_queue where external_id = '9003'),
  pg_temp.rdf('1342', 'Persuasion'), now())$$, null, null, 'a record for a different book number is refused');
select is((select count(*)::int from public.works), 1, 'refused records write nothing');

-- ── Validation holds uncertain records back ──
select is(private.ingest_gutenberg_rdf((select id from private.import_queue where external_id = '9001'),
  pg_temp.rdf('9001', 'Mansfield Park', agent_no => '901', agent_name => 'Someone, Else'), now()) -> 'flags',
  '["title_mismatch", "author_mismatch"]'::jsonb, 'a wrong book number is caught by the title and author checks');
select is(private.ingest_gutenberg_rdf((select id from private.import_queue where external_id = '9002'),
  pg_temp.rdf('9002', 'Lady Susan', rights => 'Copyrighted. Read the copyright notice inside this book for details.'), now()) -> 'flags',
  '["rights_not_us_public_domain"]'::jsonb, 'a record that is not public domain in the US is flagged');
select is((select count(*)::int from public.work_rights wr join public.works w on w.id = wr.work_id where w.title = 'Lady Susan'), 0,
  'no rights are recorded for it');
select throws_ok($$update public.works set status = 'published' where title = 'Mansfield Park'$$, '23514', null,
  'a flagged record cannot be published');

-- ── Duplicates ──
select is(private.ingest_gutenberg_rdf((select id from private.import_queue where external_id = '42671'),
  pg_temp.rdf('42671', 'Pride and Prejudice'), now()) -> 'flags', '["possible_duplicate"]'::jsonb,
  'a second ebook of the same work is flagged as a likely duplicate');
select is((select count(*)::int from public.duplicate_flags where state = 'open' and reason = 'similar title, same author'), 1,
  'the pair is recorded once for an editor to resolve');
select is((select count(*)::int from public.contributors where name = 'Jane Austen'), 1, 'the same author is not duplicated');

-- ── Publishing rules ──
select throws_ok($$insert into public.works (slug, title, kind, status) values ('direct', 'Direct', 'novel', 'published')$$,
  '23514', null, 'a work cannot be created already published');
insert into public.works (slug, title, kind) values ('no-source', 'No Source', 'novel');
select throws_ok($$update public.works set status = 'published' where slug = 'no-source'$$, '23514', null,
  'a work without a recorded source cannot be published');
insert into public.source_records (source_id, external_id, payload, payload_hash, work_id)
  select s.id, 'test-no-rights', '{}', 'h', w.id from public.sources s, public.works w
  where s.slug = 'bookverse-editorial' and w.slug = 'no-source';
select throws_ok($$update public.works set status = 'published' where slug = 'no-source'$$, '23514', null,
  'a work without a rights determination cannot be published');

select pg_temp.act_as(null);
select throws_ok($$select public.publish_works(array[gen_random_uuid()])$$, '42501', null, 'visitors cannot publish');
select throws_ok($$select * from private.import_queue$$, '42501', null, 'visitors cannot see the import queue');
select throws_ok($$select private.import_tick()$$, '42501', null, 'visitors cannot run the importer');
select pg_temp.act_as('00000000-0000-4000-b000-00000000000a');
select throws_ok($$select public.publish_works(array[gen_random_uuid()])$$, '42501', null, 'readers cannot publish');
select throws_ok($$select private.ingest_gutenberg_rdf(1, '<x/>', now())$$, '42501', null, 'readers cannot run an import');
select throws_ok($$select * from private.gutenberg_catalogue$$, '42501', null, 'readers cannot see the offline catalogue copy');

select pg_temp.act_as('00000000-0000-4000-b000-00000000000e');
select is(public.publish_works(array(select id from public.works)), 1,
  'editors publish reviewed works in one call, skipping flagged and unsourced ones');
select is((select string_agg(title, ',') from public.works where status = 'published'), 'Pride and Prejudice',
  'only the clean record was published');

select pg_temp.act_as(null);
select is((select count(*)::int from public.works), 1, 'visitors now see the published work');
select is((select count(*)::int from public.editions) + (select count(*)::int from public.offers), 3,
  'publishing a work publishes its reviewed edition and links');
select is((select string_agg(name, ',') from public.contributors), 'Jane Austen', 'and its author');
select is((select published_at is not null from public.works), true, 'the publication time is recorded');

-- ── The scheduled worker ──
select pg_temp.act_as_platform();
update private.import_queue set state = 'done' where external_id in ('1342', '9001', '9002', '42671');
select is(private.import_tick(), 'requested 9003', 'the worker requests the next queued record');
select is((select count(*)::int from private.import_queue where state = 'requested'), 1, 'one request is in flight at a time');
select is(private.import_tick(), 'idle', 'no second request is sent while the first is unanswered');
select results_eq($$select url, headers ->> 'User-Agent' like 'BookVerse catalogue importer%' from net.http_request_queue$$,
  $$values ('https://www.gutenberg.org/cache/epub/9003/pg9003.rdf'::text, true)$$,
  'it asks for the per-book RDF record and identifies itself');

insert into net._http_response (id, status_code, content)
  select request_id, 200, pg_temp.rdf('9003', 'Persuasion') from private.import_queue where external_id = '9003';
select is(private.import_tick(), 'idle', 'the worker ingests the answer');
select is((select state from private.import_queue where external_id = '9003'), 'done', 'the queue item is done');
select ok((select work_id is not null from private.import_queue where external_id = '9003'), 'and points at its work');
select results_eq($$select status, fetched, created, jsonb_array_length(errors) from public.ingest_runs$$,
  $$values ('succeeded'::text, 1, 1, 0)$$, 'the import run is recorded and closed when the queue is empty');

-- A broken answer: rolled back, retried later, and recorded.
insert into private.import_queue (source_slug, external_id, batch, kind, expected_title, expected_author)
  values ('project-gutenberg', '9004', 'test', 'novel', 'Sanditon', 'Jane Austen');
select is(private.import_tick(), 'requested 9004', 'a new item is requested');
insert into net._http_response (id, status_code, content)
  select request_id, 200, '<rdf:RDF><broken' from private.import_queue where external_id = '9004';
select private.import_tick();
select results_eq($$select state, attempts::int, last_error is not null, available_at > now() from private.import_queue where external_id = '9004'$$,
  $$values ('queued'::text, 1, true, true)$$, 'a failed item goes back to the queue with a delay and the error');
select is((select count(*)::int from public.works where title = 'Sanditon'), 0, 'a failed import leaves nothing behind');
select is((select jsonb_array_length(errors) from public.ingest_runs order by id desc limit 1), 1, 'the failure is in the run log');
update private.import_queue set available_at = now() where external_id = '9004';
select private.import_tick();
insert into net._http_response (id, status_code, content)
  select request_id, 404, 'Not found' from private.import_queue where external_id = '9004';
select private.import_tick();
select results_eq($$select state, last_error from private.import_queue where external_id = '9004'$$,
  $$values ('failed'::text, 'HTTP 404'::text)$$, 'a missing record fails at once instead of retrying');

-- ── Standard Ebooks ──
select is(private.ingest_standard_ebooks_entry(pg_temp.se_entry('jane-austen/pride-and-prejudice', 'Pride and Prejudice', 'Jane Austen',
  '<category scheme="https://standardebooks.org/vocab/subjects" term="Fiction"/>')::xml, now()) ->> 'outcome', 'updated',
  'a Standard Ebooks release of a work already here becomes another edition of it');
select results_eq($$select description, description_license::text, description_source_url from public.works where title = 'Pride and Prejudice' and status = 'published'$$,
  $$values (E'First paragraph of the description.\n\nSecond paragraph, with italics.'::text, 'cc0'::text,
            'https://standardebooks.org/ebooks/jane-austen/pride-and-prejudice'::text)$$,
  'its CC0 description is used, with its licence and source');
select is(private.ingest_standard_ebooks_entry(pg_temp.se_entry('fergus-hume/the-green-mummy', 'The Green Mummy', 'Fergus Hume',
  '<category scheme="https://standardebooks.org/vocab/subjects" term="Fiction"/><category scheme="https://standardebooks.org/vocab/subjects" term="Mystery"/>')::xml,
  now()) ->> 'outcome', 'created', 'a new release creates a new, unpublished work');
select results_eq($$select o.access::text, o.url from public.offers o join public.editions e on e.id = o.edition_id
                    join public.works w on w.id = e.work_id where w.title = 'The Green Mummy' order by 1$$,
  $$values ('download'::text, 'https://standardebooks.org/ebooks/fergus-hume/the-green-mummy/downloads/book.epub'::text),
           ('read_official_external', 'https://standardebooks.org/ebooks/fergus-hume/the-green-mummy/text/single-page')$$,
  'its links go to Standard Ebooks, without feed tracking parameters');

-- Feed link attributes are external input: only canonical Standard Ebooks destinations are trusted.
select throws_ok($insert into public.offers (edition_id, access, license, provider, source_id, url)
  select e.id, 'download', 'public_domain', 'Standard Ebooks', s.id,
         'https://attacker.example/ebooks/fergus-hume/the-green-mummy/downloads/book.epub'
  from public.editions e
  join public.works w on w.id = e.work_id
  join public.sources s on s.slug = 'standard-ebooks'
  where w.title = 'The Green Mummy'$,
  '23514', null, 'Standard Ebooks offers cannot point to another host');
select throws_ok($insert into public.offers (edition_id, access, license, provider, source_id, url)
  select e.id, 'download', 'public_domain', 'Standard Ebooks', s.id,
         'https://standardebooks.org/ebooks/fergus-hume/the-green-mummy/redirect'
  from public.editions e
  join public.works w on w.id = e.work_id
  join public.sources s on s.slug = 'standard-ebooks'
  where w.title = 'The Green Mummy'$,
  '23514', null, 'Standard Ebooks offers use only the expected reading and download paths');

select * from finish();
rollback;
