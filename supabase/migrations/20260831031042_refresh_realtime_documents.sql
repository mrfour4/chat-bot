-- =============================================================================
-- 5.5 — push document status changes with Broadcast from Database
--
-- Broadcast from Database is Supabase's own recommendation over Postgres
-- Changes: a trigger sends the row, and authorization is ordinary RLS on
-- realtime.messages, checked once when the channel is joined rather than
-- against every event for every subscriber.
--
-- Postgres Changes was built first and appeared to drop every UPDATE while
-- delivering INSERT and DELETE. **That was a broken probe, not a broken
-- Realtime**: the test signed in on the service-role client, which replaces
-- that client's token, so every UPDATE afterwards ran as the teacher and was
-- refused by documents_update_teacher's WITH CHECK. The updates never
-- happened, so there was nothing to deliver. Recorded because the false
-- conclusion survived three consistent runs and a schema audit before the
-- error message was finally read -- the probe swallowed it.
--
-- The table stays in supabase_realtime with `replica identity full`. Removing
-- it means ALTER PUBLICATION ... DROP TABLE, which blocked for ten minutes
-- behind the replication slot when tried; both are inert with nothing
-- subscribed to Postgres Changes.
-- =============================================================================

create function public.documents_broadcast_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.broadcast_changes(
    'documents',      -- topic: one channel for the library, which every
                      -- teacher may read in full anyway
    tg_op,            -- event
    tg_op,            -- operation
    tg_table_name,
    tg_table_schema,
    new,
    old
  );
  return null;
end;
$$;

revoke execute on function public.documents_broadcast_change()
  from public, anon, authenticated;

create trigger documents_broadcast_change
  after insert or update or delete on public.documents
  for each row execute function public.documents_broadcast_change();

-- Authorization for the private channel. Teachers only, and only this topic:
-- realtime.messages is shared by every channel in the project, so a policy
-- that forgot the topic would open all of them.
create policy "documents_changes_readable_by_teachers"
  on realtime.messages for select
  to authenticated
  using (
    (select realtime.topic()) = 'documents'
    and public.is_teacher()
  );
