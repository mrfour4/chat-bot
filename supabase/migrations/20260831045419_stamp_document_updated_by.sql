-- =============================================================================
-- 6.4 -- documents.updated_by is stamped by the database
-- =============================================================================
--
-- documents_update_teacher requires `updated_by = auth.uid()` in WITH CHECK.
-- The upload route runs on the user's client and calls setStoragePath right
-- after the insert, without setting that column, so every upload failed:
--
--   42501 new row violates row-level security policy for table "documents"
--
-- Postgres words a failed UPDATE check as "new row" too, which is why this read
-- as an insert problem. resetToPending on the retry route had the same hole.
--
-- Passing an actor id through those calls would fix today's two routes and stay
-- forgettable. The column means "the last person who touched this row", and the
-- database is the only place that knows that for certain.
--
-- Two properties this relies on:
--
--   * WITH CHECK is evaluated after BEFORE triggers, so the stamped row is the
--     one the policy sees.
--   * Background indexing runs as service role, where auth.uid() is null, so a
--     job finishing its work does not rewrite who last edited the document.
-- ---------------------------------------------------------------------------
create function public.documents_stamp_updated_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
     and new.updated_by is not distinct from old.updated_by
  then
    new.updated_by := (select auth.uid());
  end if;

  return new;
end;
$$;

revoke execute on function public.documents_stamp_updated_by()
  from public, anon, authenticated;

-- Postgres fires BEFORE triggers in name order, so documents_guard_immutable
-- runs first. That is fine and not a dependency: the guard only compares
-- uploaded_by and checksum, neither of which stamping touches.
create trigger documents_stamp_updated_by
  before update on public.documents
  for each row execute function public.documents_stamp_updated_by();
