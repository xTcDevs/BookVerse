-- The offline catalogue copy keeps normalised titles and authors so curated-list lookups
-- are fast, and its weekly reload replaces rows with an explicit, guarded delete.
alter table private.gutenberg_catalogue
  add column if not exists norm_title text not null default '',
  add column if not exists norm_authors text not null default '';
update private.gutenberg_catalogue
  set norm_title = private.norm(private.main_title(title)), norm_authors = private.norm(authors)
  where norm_title = '';

create or replace function private.load_gutenberg_catalogue(p_response_id bigint) returns integer
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
  -- Guard: a short or broken download never replaces the existing copy.
  if loaded < 50000 then
    raise exception 'Only % catalogue rows parsed; keeping the previous copy', loaded;
  end if;
  -- Replace only rows the new download supersedes or no longer lists; same transaction,
  -- so any failure below rolls the whole reload back.
  delete from private.gutenberg_catalogue c
  where not exists (select 1 from gc_load g where g.id = c.id and g.title <> '')
     or c.loaded_at < now();
  insert into private.gutenberg_catalogue (id, type, issued, title, language, authors, subjects, locc, bookshelves,
                                           norm_title, norm_authors)
  select distinct on (id) id, type, issued, title, language, authors, subjects, locc, bookshelves,
         private.norm(private.main_title(title)), private.norm(authors)
  from gc_load where title <> '' order by id
  on conflict (id) do nothing;
  return loaded;
end $$;

create or replace function private.find_gutenberg(p_title text, p_author text)
returns table (id integer, title text, authors text, language text)
language sql stable set search_path = '' as $$
  select c.id, c.title, c.authors, c.language from private.gutenberg_catalogue c
  where c.type = 'Text'
    and c.norm_title = private.norm(p_title)
    and (p_author is null or private.names_match(p_author, c.norm_authors))
  order by (c.language = 'en') desc, c.id
$$;

revoke execute on all functions in schema private from public;
grant execute on function private.has_role(public.staff_role) to authenticated;
