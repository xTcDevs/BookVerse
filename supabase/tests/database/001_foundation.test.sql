-- pgTAP checks for the Milestone 1 security model. Run with `npm run db:test`
-- (supabase test db) against the local stack; CI runs them on every push.
begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

-- Act as a signed-in person, or as an anonymous visitor.
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

-- Accounts are created the way the Auth service creates them.
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-4000-a000-00000000000a', 'a@example.test', '{"full_name":"Reader A"}', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-a000-00000000000b', 'b@example.test', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-a000-00000000000c', 'c@example.test', '{}', 'authenticated', 'authenticated');
insert into public.user_roles (user_id, role) values ('00000000-0000-4000-a000-00000000000c', 'editor');

-- ── Profiles ──
select is((select count(*)::int from public.profiles where id in (
  '00000000-0000-4000-a000-00000000000a', '00000000-0000-4000-a000-00000000000b', '00000000-0000-4000-a000-00000000000c')),
  3, 'a profile is created for every new account');
select is((select display_name from public.profiles where id = '00000000-0000-4000-a000-00000000000a'),
  'Reader A', 'the profile takes the name given at sign-up');

select pg_temp.act_as(null);
select is((select count(*)::int from public.profiles), 0, 'new profiles are private: visitors see none');

select pg_temp.act_as('00000000-0000-4000-a000-00000000000a');
select is((select count(*)::int from public.profiles where id = '00000000-0000-4000-a000-00000000000a'), 1, 'people can read their own private profile');
select is((select count(*)::int from public.profiles where id = '00000000-0000-4000-a000-00000000000b'), 0, 'people cannot read someone else''s private profile');
select lives_ok($$update public.profiles set display_name = 'Ada', handle = 'ada_reads', is_public = true
  where id = '00000000-0000-4000-a000-00000000000a'$$, 'people can edit their own profile');
select throws_ok($$update public.profiles set created_at = now() where id = '00000000-0000-4000-a000-00000000000a'$$,
  '42501', null, 'protected profile columns cannot be edited');
select throws_ok($$insert into public.profiles (id) values ('00000000-0000-4000-a000-00000000000a')$$,
  '42501', null, 'profiles cannot be inserted through the API');
select throws_ok($$delete from public.profiles where id = '00000000-0000-4000-a000-00000000000a'$$,
  '42501', null, 'profiles cannot be deleted through the API');
select throws_ok($$update public.profiles set handle = 'Ada' where id = '00000000-0000-4000-a000-00000000000a'$$,
  '23514', null, 'handles must be lowercase');

select pg_temp.act_as(null);
select is((select count(*)::int from public.profiles), 1, 'a profile made public is visible to visitors');

select pg_temp.act_as('00000000-0000-4000-a000-00000000000b');
select is_empty($$update public.profiles set display_name = 'x' where id = '00000000-0000-4000-a000-00000000000a' returning id$$,
  'people cannot edit someone else''s profile');
select throws_ok($$update public.profiles set handle = 'ada_reads' where id = '00000000-0000-4000-a000-00000000000b'$$,
  '23505', null, 'handles are unique');

-- ── Staff roles ──
select pg_temp.act_as('00000000-0000-4000-a000-00000000000a');
select throws_ok($$insert into public.user_roles (user_id, role) values ('00000000-0000-4000-a000-00000000000a', 'admin')$$,
  '42501', null, 'readers cannot grant themselves a role');
select is((select count(*)::int from public.user_roles), 0, 'readers see no roles');
select is((select private.has_role('editor')), false, 'has_role is false for a reader');
select pg_temp.act_as('00000000-0000-4000-a000-00000000000c');
select is((select count(*)::int from public.user_roles), 1, 'staff see their own role');
select is((select private.has_role('editor')), true, 'has_role is true for an editor');

-- ── Preferences, one row per scope ──
select pg_temp.act_as('00000000-0000-4000-a000-00000000000a');
select lives_ok($$insert into public.user_preferences (user_id, scope, prefs) values
  ('00000000-0000-4000-a000-00000000000a', 'appearance', '{"theme":"oled","accent":"forest"}'),
  ('00000000-0000-4000-a000-00000000000a', 'reader_text', '{"preset":"sepia","fontSize":21}')$$,
  'people can save appearance and reading settings separately');
select throws_ok($$insert into public.user_preferences (user_id, scope, prefs) values ('00000000-0000-4000-a000-00000000000b', 'appearance', '{}')$$,
  '42501', null, 'nobody can write settings for someone else');
select throws_ok($$update public.user_preferences set prefs = '[1,2]' where scope = 'appearance'$$,
  '23514', null, 'settings must be a JSON object');
select throws_ok($$update public.user_preferences set prefs = jsonb_build_object('x', repeat(md5(random()::text), 400)) where scope = 'appearance'$$,
  '23514', null, 'settings have a size cap');
with d as (delete from public.user_preferences where scope = 'reader_text' returning 1)
select is((select count(*)::int from d), 1, 'resetting one scope deletes only that row');
select is((select count(*)::int from public.user_preferences), 1, 'the other scope is untouched');

select pg_temp.act_as('00000000-0000-4000-a000-00000000000b');
select is((select count(*)::int from public.user_preferences), 0, 'people cannot read someone else''s settings');
select pg_temp.act_as(null);
select throws_ok($$select * from public.user_preferences$$, '42501', null, 'visitors have no access to settings');

-- ── Avatars ──
select pg_temp.act_as('00000000-0000-4000-a000-00000000000a');
select lives_ok($$insert into storage.objects (bucket_id, name) values ('avatars', '00000000-0000-4000-a000-00000000000a/avatar.webp')$$,
  'people can upload into their own avatar folder');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('avatars', '00000000-0000-4000-a000-00000000000b/avatar.webp')$$,
  '42501', null, 'nobody can upload into someone else''s folder');
select pg_temp.act_as('00000000-0000-4000-a000-00000000000b');
select is((select count(*)::int from storage.objects where bucket_id = 'avatars'), 0, 'people cannot list other people''s avatars');

-- ── Account deletion cascades ──
select pg_temp.act_as_platform();
delete from auth.users where id = '00000000-0000-4000-a000-00000000000a';
select is((select count(*)::int from public.profiles where id = '00000000-0000-4000-a000-00000000000a')
        + (select count(*)::int from public.user_preferences where user_id = '00000000-0000-4000-a000-00000000000a'),
  0, 'deleting an account removes its profile and settings');

-- ── Coverage ──
select is_empty($$select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity$$,
  'every table in public has row-level security enabled');

select * from finish();
rollback;
