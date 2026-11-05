-- One permissive policy per role and action (Supabase performance advisor),
-- and an index for the user_roles.granted_by foreign key. Same access as before.
drop policy "Public profiles are readable by everyone" on public.profiles;
drop policy "People can read their own profile" on public.profiles;

create policy "Visitors read public profiles"
  on public.profiles for select
  to anon
  using (is_public);

create policy "People read public profiles and their own"
  on public.profiles for select
  to authenticated
  using (is_public or (select auth.uid()) = id);

drop policy "People can see their own staff roles" on public.user_roles;
drop policy "Admins can see all staff roles" on public.user_roles;

create policy "People see their own roles; admins see all"
  on public.user_roles for select
  to authenticated
  using ((select auth.uid()) = user_id or (select private.has_role('admin')));

create index user_roles_granted_by_idx on public.user_roles (granted_by);
