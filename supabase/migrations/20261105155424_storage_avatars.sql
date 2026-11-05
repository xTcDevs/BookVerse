-- Avatars storage (Milestone 1).
-- Avatars: public to view, each person writes only inside a folder named with their user id:
--   avatars/<user id>/avatar.webp
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp']);

-- Public buckets serve files by URL without a select policy. This policy only
-- lets people list their own folder, so nobody can enumerate everyone's avatars.
create policy "List own avatar folder"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars'
         and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Upload own avatar"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars'
              and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Replace own avatar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars'
         and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars'
              and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Delete own avatar"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars'
         and (storage.foldername(name))[1] = (select auth.uid())::text);
