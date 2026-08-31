-- Lets a user maintain their own profile -- display name and avatar -- without
-- opening any path to the one column that grants authority.
--
-- The danger this migration walks past: `authenticated` already holds a
-- table-level UPDATE grant on every column of public.profiles, `role` included.
-- Since Phase 1 the only thing preventing self-promotion has been the absence
-- of any UPDATE policy, which the init migration records as deliberate. Adding
-- the policy this feature needs would, on its own, have turned
-- `update profiles set role = 'teacher'` into a two-line PostgREST request.
--
-- Three independent brakes, because any one of them is a single edit away from
-- being undone:
--   1. column grants -- Postgres rejects an UPDATE naming `role` before RLS is
--      consulted, and before any trigger runs;
--   2. the policy -- your own row only, checked on both sides of the update;
--   3. a guard trigger -- raises if an identity column changes anyway, which is
--      what still holds if someone later restores a broad `grant update`.

alter table public.profiles
  add column avatar_url text;

comment on column public.profiles.avatar_url is
  'Storage path in the private `avatars` bucket, not a URL. Null means fall back to the Google picture in raw_user_meta_data, then to initials.';

-- 1. Narrow the grant. Revoke first: `grant update (cols)` adds to an existing
-- table-level grant rather than replacing it.
revoke update on public.profiles from authenticated, anon;
grant update (full_name, avatar_url) on public.profiles to authenticated;

-- 2. Your own row, going in and coming out. Without WITH CHECK a user could
-- hand their row to someone else by rewriting id.
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- 3. The backstop. Mirrors documents_guard_immutable.
create function public.profiles_guard_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Only an end user is guarded. A background job or an admin script runs
  -- under the service role, where auth.uid() is null -- and promoting a teacher
  -- (npm run promote:teacher) is exactly that. Guarding every caller made the
  -- only route to the teacher role fail with P0001, which is how this
  -- condition came to be here.
  if (select auth.uid()) is null then
    return new;
  end if;

  if new.id is distinct from old.id then
    raise exception 'profiles.id is immutable';
  end if;
  if new.email is distinct from old.email then
    raise exception 'profiles.email is immutable';
  end if;
  if new.role is distinct from old.role then
    raise exception 'profiles.role is granted by an admin, not by the user';
  end if;
  if new.created_at is distinct from old.created_at then
    raise exception 'profiles.created_at is immutable';
  end if;
  return new;
end;
$$;

revoke execute on function public.profiles_guard_immutable()
  from public, anon, authenticated;

create trigger profiles_guard_immutable
  before update on public.profiles
  for each row execute function public.profiles_guard_immutable();
