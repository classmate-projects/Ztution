-- Migration: class settings (payment amount) + realtime class pages.
-- Safe to run against an existing Ztution database (does not drop anything).
-- Paste this into the Supabase SQL editor and run it once.

-- 1. Payment amount the teacher expects for a class. Defaults to 0 so existing
--    rows and any flow that only sends a name keep working.
alter table classes
  add column if not exists payment_amount numeric not null default 0
  check (payment_amount >= 0);

-- 2. Realtime for the class detail page. SELECT policies scope what the
--    browser's Realtime socket may receive; writes/reads in the app still use
--    the service-role key which bypasses RLS.
alter table classes enable row level security;
alter table class_students enable row level security;
alter table class_sessions enable row level security;
alter table materials enable row level security;

-- Whole old row in DELETE/UPDATE events so RLS can read non-PK columns.
alter table classes replica identity full;
alter table class_students replica identity full;
alter table class_sessions replica identity full;
alter table materials replica identity full;

drop policy if exists "Read classes you teach or are enrolled in" on classes;
create policy "Read classes you teach or are enrolled in"
  on classes for select
  using (
    teacher_id = auth.uid()
    or exists (
      select 1 from class_students cs
      where cs.class_id = classes.id and cs.student_id = auth.uid()
    )
  );

drop policy if exists "Read enrollments for your class or yourself" on class_students;
create policy "Read enrollments for your class or yourself"
  on class_students for select
  using (
    student_id = auth.uid()
    or exists (
      select 1 from classes c
      where c.id = class_students.class_id and c.teacher_id = auth.uid()
    )
  );

drop policy if exists "Read sessions for classes you teach or are enrolled in" on class_sessions;
create policy "Read sessions for classes you teach or are enrolled in"
  on class_sessions for select
  using (
    exists (
      select 1 from classes c
      where c.id = class_sessions.class_id and c.teacher_id = auth.uid()
    )
    or exists (
      select 1 from class_students cs
      where cs.class_id = class_sessions.class_id and cs.student_id = auth.uid()
    )
  );

drop policy if exists "Read materials for classes you teach or are enrolled in" on materials;
create policy "Read materials for classes you teach or are enrolled in"
  on materials for select
  using (
    exists (
      select 1 from classes c
      where c.id = materials.class_id and c.teacher_id = auth.uid()
    )
    or exists (
      select 1 from class_students cs
      where cs.class_id = materials.class_id and cs.student_id = auth.uid()
    )
  );

-- 3. Turn on Postgres Changes broadcasts for these tables. Wrapped so re-running
--    doesn't error if a table is already in the publication.
do $$
begin
  alter publication supabase_realtime add table classes;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table class_students;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table class_sessions;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table materials;
exception when duplicate_object then null;
end $$;
