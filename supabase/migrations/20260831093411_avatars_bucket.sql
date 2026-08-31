-- ---------------------------------------------------------------------------
-- The avatars bucket
--
-- Private, like `documents`. An avatar is a photograph of a student, so a
-- permanent public URL is not something to hand out by default: nothing reaches
-- these objects without a policy below or a signed URL minted by the server.
--
-- The MIME allow-list is the platform's gate; validateAvatar() checks the
-- actual image signature in the app. Two gates, because File.type is derived
-- from the extension and a renamed file arrives claiming whatever it likes --
-- the same reasoning as `%PDF-` in 2.1.2.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  false,
  2097152,                       -- 2 MiB, matching MAX_AVATAR_BYTES exactly
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Object policies
--
-- Unlike `documents`, where any teacher may read every file, an avatar is
-- readable only by the person it belongs to. Everyone else -- including the
-- teacher listing who uploaded a document -- sees it through a signed URL that
-- the server mints on their behalf, never by reading the object directly.
--
-- Ownership is carried by the path, <user_id>/<file>, rather than by storage's
-- `owner` column, so the rule is legible in the policy and independent of which
-- client performed the upload.
-- ---------------------------------------------------------------------------
create policy "avatars_objects_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Upsert is how replacing an avatar overwrites the previous object instead of
-- accumulating one file per change. Supabase upsert needs INSERT + SELECT +
-- UPDATE; missing any one of them fails as a policy violation rather than an
-- error that names the cause.
create policy "avatars_objects_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars_objects_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars_objects_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
