-- Gives a profile to every auth user that has none.
--
-- Why any user could be missing one: handle_new_user, the trigger that creates
-- a profile, arrived with the init migration at 2026-08-30 06:17. An account
-- created on the hosted project at 05:38 -- forty minutes earlier -- was never
-- given a profile, and nothing since would have noticed.
--
-- The symptom is worse than a missing row: getSessionUser() returns null when
-- the profile is absent, so that account signs in successfully and then sees
-- the signed-out header. It surfaced through Google sign-in only because Google
-- linked to that pre-trigger account (auth.identities holds email + google for
-- one user_id) -- the password login had the same problem all along.
--
-- Idempotent, so it is safe on a database where the trigger has always been
-- present: on such a database it matches no rows.
--
-- Users with no email address are skipped, because public.profiles.email is
-- NOT NULL. Only a phone-only or anonymous sign-in can reach that state, and
-- neither is enabled (enable_anonymous_sign_ins = false, sms.enable_signup =
-- false), so this is a guard rather than a case.
insert into public.profiles (id, email, full_name)
select
  u.id,
  u.email,
  nullif(u.raw_user_meta_data ->> 'full_name', '')
from auth.users u
  left join public.profiles p on p.id = u.id
where p.id is null
  and u.email is not null
on conflict (id) do nothing;
