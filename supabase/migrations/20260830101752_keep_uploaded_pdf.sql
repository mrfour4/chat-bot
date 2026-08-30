-- =============================================================================
-- Keep the uploaded PDF.
--
-- §5.10 discarded the bytes on purpose, and that is precisely why indexing has
-- to run inside the upload request: the file exists nowhere else. Keeping it
-- serves preview and download (3.4) and is the precondition for indexing in the
-- background (3.6), where a worker can only re-read what we kept.
-- =============================================================================

alter table public.documents
  add column storage_path text;

comment on column public.documents.storage_path is
  'Object path within the private `documents` bucket: <uploader_id>/<document_id>.pdf. '
  'Null for rows uploaded before this migration -- the PDF for those is genuinely gone.';

-- ---------------------------------------------------------------------------
-- The bucket
--
-- Private. Nothing reaches these objects without a policy below or a signed URL
-- minted by the server, and the MIME allow-list is a second gate behind
-- validateUpload() -- one in the app, one in the platform.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  20971520,                      -- 20 MiB, matching MAX_UPLOAD_BYTES exactly
  array['application/pdf']
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Object policies
--
-- These mirror the `documents` table policies deliberately: any teacher may
-- read every file, but may only write or remove their own. If the two ever
-- disagreed, a teacher could reach a PDF whose metadata row is invisible to
-- them, or vice versa.
--
-- Ownership is carried by the path -- <uploader_id>/<document_id>.pdf -- rather
-- than by storage's `owner` column, so the rule is legible in the policy itself
-- and does not depend on which client performed the upload.
-- ---------------------------------------------------------------------------
create policy "documents_objects_select_teacher"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'documents' and public.is_teacher());

create policy "documents_objects_insert_own_teacher"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and public.is_teacher()
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Needed for upsert, which is how re-uploading a failed document overwrites its
-- own object instead of colliding. Supabase upsert requires INSERT + SELECT +
-- UPDATE; without this one it fails silently as a policy violation.
create policy "documents_objects_update_own_teacher"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'documents'
    and public.is_teacher()
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'documents'
    and public.is_teacher()
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "documents_objects_delete_own_teacher"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'documents'
    and public.is_teacher()
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
