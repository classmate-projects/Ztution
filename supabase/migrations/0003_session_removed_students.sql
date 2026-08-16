-- Migration: persist per-session student removals from a live call.
-- Without this, a student removed from a conference call could just click
-- "Leave" and rejoin the session fresh, bypassing the teacher's decision —
-- the in-call "removed" state only lived in React memory on both ends.
-- Safe to run against an existing Ztution database (does not drop anything).
-- Paste this into the Supabase SQL editor and run it once.

create table if not exists session_removed_students (
  session_id uuid not null references class_sessions(id) on delete cascade,
  student_id uuid not null references users(id) on delete cascade,
  removed_at timestamptz not null default now(),
  -- null while still blocked; set once the teacher accepts a rejoin request.
  readmitted_at timestamptz,
  primary key (session_id, student_id)
);

alter table session_removed_students enable row level security;
alter table session_removed_students replica identity full;

drop policy if exists "Read your own removal or removals for sessions you teach" on session_removed_students;
create policy "Read your own removal or removals for sessions you teach"
  on session_removed_students for select
  using (
    student_id = auth.uid()
    or exists (
      select 1 from class_sessions cs
      join classes c on c.id = cs.class_id
      where cs.id = session_removed_students.session_id and c.teacher_id = auth.uid()
    )
  );
