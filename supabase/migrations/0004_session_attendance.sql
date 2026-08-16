-- Migration: per-session student attendance, for the post-call summary report.
-- One row per join/leave segment (a student who disconnects and rejoins gets
-- a second row) so total time in the call can be computed by summing
-- segments rather than just the first join and last leave.
-- Safe to run against an existing Ztution database (does not drop anything).
-- Paste this into the Supabase SQL editor and run it once.

create table if not exists session_attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references class_sessions(id) on delete cascade,
  student_id uuid not null references users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  -- null while the segment is still open (they haven't left yet, or their
  -- leave was never recorded, e.g. the tab crashed) — the summary report
  -- falls back to the session's ended_at for those.
  left_at timestamptz
);

create index if not exists session_attendance_session_id_idx on session_attendance(session_id);

alter table session_attendance enable row level security;
alter table session_attendance replica identity full;

drop policy if exists "Read your own attendance or attendance for sessions you teach" on session_attendance;
create policy "Read your own attendance or attendance for sessions you teach"
  on session_attendance for select
  using (
    student_id = auth.uid()
    or exists (
      select 1 from class_sessions cs
      join classes c on c.id = cs.class_id
      where cs.id = session_attendance.session_id and c.teacher_id = auth.uid()
    )
  );
