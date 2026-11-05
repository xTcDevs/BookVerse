-- Foundation (Milestone 1): identity, staff roles, preferences.
-- Row-level security on every table; helpers live in the private schema.

-- Helpers live in a schema the Data API does not expose.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ── Profiles ────────────────────────────────────────────────────────────
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  handle       text unique check (handle ~ '^[a-z0-9_]{3,30}$'),  -- lowercase only, so plain unique is case-safe
  display_name text check (char_length(display_name) between 1 and 60),
  bio          text check (char_length(bio) <= 500),
  avatar_path  text check (char_length(avatar_path) <= 300),
  is_public    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

alter table public.profiles enable row level security;

-- Tighten Supabase's default grants: no inserts or deletes from the API,
-- and updates only on the columns a person may edit.
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to anon, authenticated;
grant update (handle, display_name, bio, avatar_path, is_public)
  on table public.profiles to authenticated;

create policy "Public profiles are readable by everyone"
  on public.profiles for select
  to anon, authenticated
  using (is_public);

create policy "People can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "People can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- A profile row is created for every new account.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(left(coalesce(new.raw_user_meta_data ->> 'full_name',
                         new.raw_user_meta_data ->> 'name', ''), 60), '')
  );
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ── Staff roles (readers and writers need no role) ─────────────────────
create type public.staff_role as enum ('moderator', 'editor', 'admin');

create table public.user_roles (
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       public.staff_role not null,
  granted_by uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

alter table public.user_roles enable row level security;
revoke all on table public.user_roles from anon, authenticated;
grant select on table public.user_roles to authenticated;

create policy "People can see their own staff roles"
  on public.user_roles for select
  to authenticated
  using ((select auth.uid()) = user_id);
-- No insert/update/delete policies: roles are granted from the SQL editor
-- or, later, an admin Edge Function using the secret key.

create function private.has_role(wanted public.staff_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid())
      and (role = wanted or role = 'admin')
  );
$$;
revoke all on function private.has_role(public.staff_role) from public;
grant execute on function private.has_role(public.staff_role) to authenticated;

create policy "Admins can see all staff roles"
  on public.user_roles for select
  to authenticated
  using ((select private.has_role('admin')));

-- ── Preferences: one row per scope, so site appearance and each reader
--    format sync independently ────────────────────────────────────────────
create type public.preference_scope as enum (
  'appearance',     -- site theme, accent, density, text scale, motion
  'browse',         -- grid/list, cover size, preferred formats and genres, home sections
  'reader_text',    -- novels, web novels, poetry
  'reader_visual',  -- manga, manhwa, manhua, webtoons, comics
  'reader_audio'    -- audiobooks
);

create table public.user_preferences (
  user_id        uuid not null references auth.users (id) on delete cascade,
  scope          public.preference_scope not null,
  schema_version smallint not null default 1 check (schema_version > 0),
  prefs          jsonb not null default '{}'::jsonb,
  updated_at     timestamptz not null default now(),
  primary key (user_id, scope),
  constraint prefs_is_object check (jsonb_typeof(prefs) = 'object'),
  constraint prefs_max_size check (pg_column_size(prefs) <= 8192)
);

create trigger user_preferences_updated_at
  before update on public.user_preferences
  for each row execute function private.set_updated_at();

alter table public.user_preferences enable row level security;
revoke all on table public.user_preferences from anon, authenticated;
grant select, insert, update, delete on table public.user_preferences to authenticated;

create policy "Read own preferences"
  on public.user_preferences for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Create own preferences"
  on public.user_preferences for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Update own preferences"
  on public.user_preferences for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Delete own preferences"
  on public.user_preferences for delete
  to authenticated
  using ((select auth.uid()) = user_id);
