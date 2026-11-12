-- Project Gutenberg writes subtitles after a line break, "; " or ": " ("Jane Eyre: An
-- Autobiography"). The main title is the part before the first of these.
create or replace function private.main_title(t text) returns text
language sql immutable set search_path = '' as $$
  select btrim(split_part(split_part(split_part(coalesce(t, ''), E'\n', 1), '; ', 1), ': ', 1))
$$;
revoke execute on function private.main_title(text) from public;
