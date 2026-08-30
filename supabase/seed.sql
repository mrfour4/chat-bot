-- Local development fixtures.
--
-- Runs only on `supabase db reset` against the local Docker database. It is
-- never applied by `supabase db push`, so the hosted project never sees it.
--
-- Creates teacher@example.com / password123 and promotes them, giving us an
-- account to exercise the teacher routes without touching real data.

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
)
values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'teacher@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Giáo viên thử nghiệm"}'
)
on conflict (id) do nothing;

-- The on_auth_user_created trigger has already created the profile as a
-- student; promote it. Doing it this way also proves the trigger fired.
update public.profiles
set role = 'teacher'
where email = 'teacher@example.com';

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
)
values (
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-2222-2222-222222222222',
  'authenticated',
  'authenticated',
  'student@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Học sinh thử nghiệm"}'
)
on conflict (id) do nothing;
