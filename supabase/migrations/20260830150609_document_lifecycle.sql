-- =============================================================================
-- 5.3 — document lifecycle: rename, archive, soft delete, attribution
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Columns
--
-- Archived and deleted are timestamps rather than document_status values on
-- purpose: status is the indexing state machine, and an archived document must
-- still remember that it once indexed cleanly. Un-archiving is then one column,
-- not a re-derivation of what the row used to be.
-- ---------------------------------------------------------------------------
alter table public.documents
  add column updated_by  uuid references public.profiles (id) on delete set null,
  add column archived_at timestamptz,
  add column deleted_at  timestamptz;

create index documents_archived_at_idx on public.documents (archived_at)
  where archived_at is not null;
create index documents_deleted_at_idx on public.documents (deleted_at)
  where deleted_at is not null;
create index documents_title_idx on public.documents (title);

-- A deleted document keeps its row as a tombstone, so the old unique index
-- would refuse to let the same file be uploaded again. Ownership of a checksum
-- belongs to the live rows only.
drop index public.documents_checksum_key;
create unique index documents_checksum_key on public.documents (checksum)
  where checksum is not null and deleted_at is null;

-- ---------------------------------------------------------------------------
-- Immutability guard
--
-- WITH CHECK sees only the new row, so it cannot say "you may not change the
-- uploader". Without this, a teacher could reassign a colleague's document to
-- themselves and then delete it -- passing every policy on the way.
-- ---------------------------------------------------------------------------
create function public.documents_guard_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.uploaded_by is distinct from old.uploaded_by then
    raise exception 'documents.uploaded_by is immutable';
  end if;
  if new.checksum is distinct from old.checksum then
    raise exception 'documents.checksum is immutable';
  end if;
  return new;
end;
$$;

revoke execute on function public.documents_guard_immutable()
  from public, anon, authenticated;

create trigger documents_guard_immutable
  before update on public.documents
  for each row execute function public.documents_guard_immutable();

-- ---------------------------------------------------------------------------
-- Update policy
--
-- The knowledge base is shared, so any teacher may rename or archive any
-- document -- which is the only reason an "updated by" column means anything.
-- Deleting stays the uploader's, matching the DELETE policy below it, and a
-- deleted row can only be touched again by its uploader.
-- ---------------------------------------------------------------------------
drop policy "documents_update_own_teacher" on public.documents;

create policy "documents_update_teacher"
  on public.documents for update
  to authenticated
  using (
    public.is_teacher()
    and (deleted_at is null or uploaded_by = (select auth.uid()))
  )
  with check (
    public.is_teacher()
    and updated_by = (select auth.uid())
    and (deleted_at is null or uploaded_by = (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- Teachers can read the profile directory
--
-- profiles_select_own is the only SELECT policy, so "uploaded by" and
-- "updated by" would render blank for every row a teacher did not touch
-- themselves -- a working join that looks like missing data. Teachers are
-- staff and the table has to attribute changes, so they may read profiles.
-- Students still see only their own row.
-- ---------------------------------------------------------------------------
-- Merged with profiles_select_own rather than added alongside it: two
-- permissive SELECT policies on one table run both expressions on every row,
-- which the Supabase advisor flags and which is_teacher() would make real.
drop policy "profiles_select_own" on public.profiles;

create policy "profiles_select_own_or_teacher"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id or public.is_teacher());

-- ---------------------------------------------------------------------------
-- Realtime (5.5 uses this; the publication belongs with the table)
-- ---------------------------------------------------------------------------
alter table public.documents replica identity full;
alter publication supabase_realtime add table public.documents;
