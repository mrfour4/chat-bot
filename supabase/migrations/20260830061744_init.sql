-- =============================================================================
-- AI Admissions Advisor — initial schema
-- Run this in the Supabase SQL editor, or via `supabase db push`.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('student', 'teacher');

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text,
  role       public.user_role not null default 'student',
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'Application profile for each auth user. Role is granted manually by an admin.';

-- Every new auth user gets a student profile. Teachers are promoted by hand:
--   update public.profiles set role = 'teacher' where email = '...';
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Lock this SECURITY DEFINER function down. Postgres grants EXECUTE to PUBLIC on
-- every new function, and Supabase's default privileges additionally grant it to
-- anon and authenticated -- so revoking PUBLIC alone leaves it callable. It only
-- ever needs to run as the trigger above, which does not re-check EXECUTE once
-- the trigger exists.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Role lookup used by policies. SECURITY DEFINER so that reading a role from
-- inside a policy does not re-trigger RLS on profiles (infinite recursion).
--
-- EXECUTE is deliberately left granted to PUBLIC: RLS policy expressions are
-- evaluated as the calling role, so revoking it would break every policy below.
-- Safe to expose — it takes no arguments and reports only on the caller.
create function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'teacher'
  );
$$;

-- ---------------------------------------------------------------------------
-- Documents
--
-- The PDF itself lives in Gemini File Search; this table is the metadata and
-- ownership record, plus the indexing state machine the UI polls.
-- ---------------------------------------------------------------------------
create type public.document_status as enum ('pending', 'indexing', 'ready', 'failed');

create table public.documents (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  file_name     text not null,
  file_size     bigint not null,
  checksum      text,                    -- sha256 of the upload, for duplicate detection
  status        public.document_status not null default 'pending',
  error_message text,
  -- Gemini resource id: fileSearchStores/<store>/documents/<doc>
  gemini_document_name text,
  uploaded_by   uuid not null references public.profiles (id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index documents_uploaded_by_idx on public.documents (uploaded_by);
create index documents_status_idx on public.documents (status);
create unique index documents_checksum_key on public.documents (checksum)
  where checksum is not null;

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger documents_touch_updated_at
  before update on public.documents
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Chat history (students only; guests are not persisted)
-- ---------------------------------------------------------------------------
create table public.conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  title      text,
  created_at timestamptz not null default now()
);

create index conversations_user_id_idx on public.conversations (user_id, created_at desc);

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role            text not null check (role in ('user', 'assistant')),
  content         text not null,
  -- [{ documentId, fileName, page, snippet }]
  citations       jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now()
);

create index messages_conversation_id_idx on public.messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- Row level security
--
-- Nothing here is readable by anon. Guests reach documents only indirectly,
-- through the server-side chat route, which never exposes rows to the client.
-- ---------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.documents     enable row level security;
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;

-- profiles: read your own row. No UPDATE policy at all, so a user can never
-- promote themselves to teacher through the client.
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

-- documents: the knowledge base is shared between teachers, so any teacher may
-- read every document, but may only delete the ones they uploaded.
create policy "documents_select_teacher"
  on public.documents for select
  to authenticated
  using (public.is_teacher());

create policy "documents_insert_own_teacher"
  on public.documents for insert
  to authenticated
  with check (public.is_teacher() and uploaded_by = (select auth.uid()));

create policy "documents_update_own_teacher"
  on public.documents for update
  to authenticated
  using (public.is_teacher() and uploaded_by = (select auth.uid()))
  with check (public.is_teacher() and uploaded_by = (select auth.uid()));

create policy "documents_delete_own_teacher"
  on public.documents for delete
  to authenticated
  using (public.is_teacher() and uploaded_by = (select auth.uid()));

-- conversations / messages: strictly your own.
create policy "conversations_all_own"
  on public.conversations for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "messages_all_own"
  on public.messages for all
  to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = (select auth.uid())
    )
  );
