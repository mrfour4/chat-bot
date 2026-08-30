-- Authorization checks, run against the DATABASE rather than the routes.
--
-- Route guards are UX; RLS is the enforcement boundary (§5.4). A test that
-- exercises a route proves the guard, not the policy -- and the policy is what
-- still holds when someone calls PostgREST directly with a stolen publishable
-- key, which is a public value by design.
--
--   npm run test:rls        (local database only)
--
-- Each case assumes an identity, attempts something that must not work, and
-- asserts on what the database actually allowed.

-- Not ON COMMIT DROP: psql runs each statement in its own transaction, which
-- would drop the table before the DO block below could write to it.
drop table if exists rls_results;
create temporary table rls_results (
  name text, passed boolean, detail text
);

do $$
declare
  teacher constant uuid := '11111111-1111-1111-1111-111111111111';
  teacher2 constant uuid := '33333333-3333-3333-3333-333333333333';
  student constant uuid := '22222222-2222-2222-2222-222222222222';
  doc_id  constant uuid := '99999999-9999-9999-9999-999999999999';
  conv_id constant uuid := '88888888-8888-8888-8888-888888888888';
  n int;
  blocked boolean;
  detail text;
  current_role_name text;
begin
  -- Fixtures, created as the owner so RLS does not interfere with setup.
  insert into public.documents (id, title, file_name, file_size, uploaded_by, status)
  values (doc_id, 'Đề án tuyển sinh', 'dean.pdf', 1024, teacher, 'ready')
  on conflict (id) do nothing;

  insert into public.conversations (id, user_id, title)
  values (conv_id, student, 'Câu hỏi của học sinh')
  on conflict (id) do nothing;

  ---------------------------------------------------------------- 1
  perform set_config('role', 'anon', true);
  select count(*) into n from public.documents;
  perform set_config('role', 'postgres', true);
  insert into rls_results values
    ('anon cannot read documents', n = 0, n || ' rows visible');

  ---------------------------------------------------------------- 2
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', student, 'role', 'authenticated')::text, true);
  select count(*) into n from public.documents;
  perform set_config('role', 'postgres', true);
  insert into rls_results values
    ('student cannot read documents', n = 0, n || ' rows visible');

  ---------------------------------------------------------------- 3
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', teacher, 'role', 'authenticated')::text, true);
  select count(*) into n from public.documents;
  perform set_config('role', 'postgres', true);
  insert into rls_results values
    ('teacher CAN read documents', n > 0, n || ' rows visible');

  ---------------------------------------------------------------- 4
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', student, 'role', 'authenticated')::text, true);
  begin
    insert into public.documents (title, file_name, file_size, uploaded_by)
    values ('lén tải lên', 'x.pdf', 1, student);
    perform set_config('role', 'postgres', true);
    insert into rls_results values
      ('student cannot upload a document', false, 'the insert succeeded');
  exception when others then
    perform set_config('role', 'postgres', true);
    insert into rls_results values
      ('student cannot upload a document', true, sqlerrm);
  end;

  ---------------------------------------------------------------- 5
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', student, 'role', 'authenticated')::text, true);
  delete from public.documents where id = doc_id;
  perform set_config('role', 'postgres', true);
  select count(*) into n from public.documents where id = doc_id;
  insert into rls_results values
    ('student cannot delete a teacher document', n = 1,
     case when n = 1 then '' else 'the row was deleted' end);

  ---------------------------------------------------------------- 6
  -- `profiles` deliberately has no UPDATE policy, so nobody self-promotes.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', student, 'role', 'authenticated')::text, true);
  update public.profiles set role = 'teacher' where id = student;
  perform set_config('role', 'postgres', true);
  select count(*) into n from public.profiles
    where id = student and role = 'student';
  insert into rls_results values
    ('student cannot self-promote to teacher', n = 1,
     case when n = 1 then '' else 'the role was changed' end);

  ---------------------------------------------------------------- 7
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', teacher, 'role', 'authenticated')::text, true);
  select count(*) into n from public.conversations where id = conv_id;
  perform set_config('role', 'postgres', true);
  insert into rls_results values
    ('a teacher cannot read a student conversation', n = 0, n || ' rows visible');

  ---------------------------------------------------------------- 8
  perform set_config('role', 'anon', true);
  select count(*) into n from public.conversations;
  perform set_config('role', 'postgres', true);
  insert into rls_results values
    ('anon cannot read conversations', n = 0, n || ' rows visible');

  ---------------------------------------------------------------- 9
  -- Supabase grants EXECUTE to anon and authenticated by default, so a plain
  -- `revoke ... from public` leaves a SECURITY DEFINER function callable (§5.5).
  insert into rls_results values
    ('anon cannot execute handle_new_user',
     not has_function_privilege('anon', 'public.handle_new_user()', 'execute'), '');
  insert into rls_results values
    ('authenticated cannot execute handle_new_user',
     not has_function_privilege('authenticated', 'public.handle_new_user()', 'execute'), '');

  ---------------------------------------------------------------- 10
  select count(*) into n from pg_tables
    where schemaname = 'public' and rowsecurity = false;
  insert into rls_results values
    ('RLS is enabled on every public table', n = 0, n || ' tables without RLS');

  ---------------------------------------------------------------- 11
  -- Storage. The PDF is a second copy of the same secret as the metadata row,
  -- so the object policies have to hold the same line -- otherwise a teacher
  -- could reach a file whose row is invisible to them, or a student could
  -- reach the file behind a row they cannot read.
  -- A real object first. Without one these two checks pass on an empty table --
  -- they would report "cannot read" when the truth is "nothing to read", which
  -- is the same failure mode as a correct refusal over an empty index (§5.12).
  -- `postgres` has rolbypassrls, so this insert is not itself a policy test.
  insert into storage.objects (bucket_id, name)
  values ('documents', teacher || '/' || doc_id || '.pdf')
  on conflict (bucket_id, name) do nothing;

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', student, 'role', 'authenticated')::text, true);
  select count(*) into n from storage.objects where bucket_id = 'documents';
  perform set_config('role', 'postgres', true);
  insert into rls_results values
    ('student cannot read stored PDFs', n = 0, n || ' objects visible');

  -- ...and the same object must be visible to a teacher, or the two checks
  -- above prove nothing about the policy.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', teacher, 'role', 'authenticated')::text, true);
  select count(*) into n from storage.objects where bucket_id = 'documents';
  perform set_config('role', 'postgres', true);
  insert into rls_results values
    ('teacher CAN read stored PDFs', n = 1, n || ' objects visible');

  perform set_config('role', 'anon', true);
  select count(*) into n from storage.objects where bucket_id = 'documents';
  perform set_config('role', 'postgres', true);
  insert into rls_results values
    ('anon cannot read stored PDFs', n = 0, n || ' objects visible');

  ---------------------------------------------------------------- 12
  -- A teacher writing into another teacher's folder. The path's first segment
  -- carries ownership, so this is the check that the segment is actually
  -- enforced rather than merely conventional.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', teacher, 'role', 'authenticated')::text, true);
  begin
    insert into storage.objects (bucket_id, name)
    values ('documents', student || '/teacher-attempt.pdf');
    blocked := false;
    detail := 'insert was allowed';
  exception
    when insufficient_privilege then
      blocked := true; detail := '';
    -- Anything else means the insert failed for a reason that is not the
    -- policy. Recorded rather than raised: an unhandled error aborts the whole
    -- DO block, which is how a genuine leak once reported as zero tests run
    -- instead of one test failed.
    when others then
      blocked := false; detail := 'unexpected: ' || sqlerrm;
  end;
  perform set_config('role', 'postgres', true);
  insert into rls_results values
    ('teacher cannot write into another user''s folder', blocked, detail);

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', student, 'role', 'authenticated')::text, true);
  begin
    insert into storage.objects (bucket_id, name)
    values ('documents', student || '/student-attempt.pdf');
    blocked := false;
    detail := 'insert was allowed';
  exception
    when insufficient_privilege then
      blocked := true; detail := '';
    when others then
      blocked := false; detail := 'unexpected: ' || sqlerrm;
  end;
  perform set_config('role', 'postgres', true);
  insert into rls_results values
    ('student cannot store a PDF at all', blocked, detail);

  ---------------------------------------------------------------- 13
  -- The bucket must stay private. A public bucket serves every object over an
  -- unauthenticated URL, and no policy above would apply.
  insert into rls_results values
    ('documents bucket is private',
     exists (select 1 from storage.buckets where id = 'documents' and not public),
     '');

  -- Storage refuses direct SQL deletes -- `protect_objects_delete` insists on
  -- the Storage API, which is exactly why `removePdf()` goes through the client
  -- rather than the table. The trigger reads a setting, so a test that seeded a
  -- fixture can clear it without weakening anything at runtime.
  perform set_config('storage.allow_delete_query', 'true', true);
  delete from storage.objects where bucket_id = 'documents';

  ---------------------------------------------------------------- 13
  -- 5.3 lifecycle. The knowledge base is shared, so a second teacher may
  -- rename a colleague's document. This is the permissive half of the pair;
  -- check 14 is the half that has to hold.
  update public.documents set deleted_at = null, updated_by = null where id = doc_id;

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', teacher2, 'role', 'authenticated')::text, true);
  update public.documents
    set title = 'Đổi tên bởi giáo viên khác', updated_by = teacher2
    where id = doc_id;
  perform set_config('role', 'postgres', true);
  select count(*) into n from public.documents
    where id = doc_id and updated_by = teacher2;
  insert into rls_results values
    ('a teacher CAN rename another teacher''s document', n = 1,
     case when n = 1 then '' else 'the rename was refused' end);

  ---------------------------------------------------------------- 14
  -- Deleting stays the uploader's. A soft delete is an UPDATE, so the old
  -- DELETE policy no longer covers it -- this is the check that the
  -- replacement actually holds that line.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', teacher2, 'role', 'authenticated')::text, true);
  begin
    update public.documents
      set deleted_at = now(), updated_by = teacher2
      where id = doc_id;
    blocked := false;
    detail := 'the soft delete was allowed';
  exception
    when insufficient_privilege then blocked := true; detail := '';
    when others then blocked := false; detail := 'unexpected: ' || sqlerrm;
  end;
  perform set_config('role', 'postgres', true);
  select count(*) into n from public.documents
    where id = doc_id and deleted_at is not null;
  insert into rls_results values
    ('a teacher cannot soft-delete another teacher''s document',
     blocked and n = 0,
     case when n > 0 then 'deleted_at was set' else detail end);

  ---------------------------------------------------------------- 15
  -- WITH CHECK sees only the new row, so it cannot express "the uploader is
  -- immutable". Without the trigger, a teacher could take ownership of a
  -- colleague's document and then delete it, passing every policy on the way.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', teacher2, 'role', 'authenticated')::text, true);
  begin
    update public.documents
      set uploaded_by = teacher2, updated_by = teacher2
      where id = doc_id;
    blocked := false;
    detail := 'ownership was reassigned';
  exception
    when others then blocked := true; detail := '';
  end;
  perform set_config('role', 'postgres', true);
  select count(*) into n from public.documents
    where id = doc_id and uploaded_by = teacher;
  insert into rls_results values
    ('a teacher cannot take over another teacher''s document',
     blocked and n = 1, detail);

  ---------------------------------------------------------------- 16
  -- updated_by has to be the caller, or attribution is a field anyone can
  -- forge and the "updated by" column is decoration.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', teacher2, 'role', 'authenticated')::text, true);
  begin
    update public.documents
      set title = 'giả mạo', updated_by = teacher
      where id = doc_id;
    blocked := false;
    detail := 'updated_by was forged';
  exception
    when insufficient_privilege then blocked := true; detail := '';
    when others then blocked := false; detail := 'unexpected: ' || sqlerrm;
  end;
  perform set_config('role', 'postgres', true);
  insert into rls_results values
    ('a teacher cannot attribute an edit to someone else', blocked, detail);

  ---------------------------------------------------------------- 17
  -- The profile directory was widened for the table's attribution columns.
  -- Widened for teachers only.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', teacher2, 'role', 'authenticated')::text, true);
  select count(*) into n from public.profiles where id = teacher;
  perform set_config('role', 'postgres', true);
  insert into rls_results values
    ('a teacher CAN read another profile', n = 1, n || ' rows visible');

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', student, 'role', 'authenticated')::text, true);
  select count(*) into n from public.profiles where id <> student;
  perform set_config('role', 'postgres', true);
  insert into rls_results values
    ('a student still cannot read another profile', n = 0, n || ' rows visible');

  perform set_config('role', 'anon', true);
  select count(*) into n from public.profiles;
  perform set_config('role', 'postgres', true);
  insert into rls_results values
    ('anon cannot read profiles', n = 0, n || ' rows visible');

  ---------------------------------------------------------------- 18
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', student, 'role', 'authenticated')::text, true);
  update public.documents set title = 'học sinh sửa' where id = doc_id;
  perform set_config('role', 'postgres', true);
  select count(*) into n from public.documents
    where id = doc_id and title = 'học sinh sửa';
  insert into rls_results values
    ('a student cannot rename a document', n = 0,
     case when n = 0 then '' else 'the rename succeeded' end);

  perform set_config('storage.allow_delete_query', 'false', true);

  delete from public.documents where id = doc_id;
  delete from public.conversations where id = conv_id;

  select current_user into current_role_name;
  raise notice 'finished as %', current_role_name;
end $$;

select
  case when passed then 'PASS  ' else 'FAIL  ' end || name ||
  case when not passed and detail <> '' then '   [' || detail || ']' else '' end
  as check
from rls_results
order by passed asc, name asc;

select
  count(*) filter (where passed) || ' passed, ' ||
  count(*) filter (where not passed) || ' failed' as summary
from rls_results;
