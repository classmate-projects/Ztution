-- Fix / verify Realtime delivery for the chat tables.
-- Safe to run repeatedly (idempotent). Run this in the Supabase SQL editor.
-- If the SQL editor prompts about RLS, choose "Run without RLS" (this script
-- manages RLS itself, exactly like supabase/schema.sql).

-- ── 1. Diagnose: which tables does Realtime currently broadcast? ──────────────
-- After running the whole script, re-run just this SELECT: chat_groups and
-- chat_messages MUST be listed. If they weren't before, that was the bug.
select tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
order by tablename;

-- ── 2. Full-row change data (needed so RLS can be evaluated on the events) ────
alter table chat_groups   replica identity full;
alter table chat_messages replica identity full;

-- ── 3. Add the chat tables to the Realtime publication if they're missing ─────
-- (adding a table that's already a member errors, so guard each one)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'chat_groups'
  ) then
    alter publication supabase_realtime add table chat_groups;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table chat_messages;
  end if;
end $$;

-- ── 4. Make sure the SELECT policies exist (the browser socket needs them, or
--       RLS silently drops every event). Drop+create so it's safe to re-run. ──
alter table chat_groups   enable row level security;
alter table chat_messages enable row level security;

drop policy if exists "Read chat groups for classes you teach or are enrolled in" on chat_groups;
create policy "Read chat groups for classes you teach or are enrolled in"
  on chat_groups for select
  using (
    exists (
      select 1 from classes c
      where c.id = chat_groups.class_id and c.teacher_id = auth.uid()
    )
    or exists (
      select 1 from class_students cs
      where cs.class_id = chat_groups.class_id and cs.student_id = auth.uid()
    )
  );

drop policy if exists "Read chat messages for classes you teach or are enrolled in" on chat_messages;
create policy "Read chat messages for classes you teach or are enrolled in"
  on chat_messages for select
  using (
    exists (
      select 1 from classes c
      where c.id = chat_messages.class_id and c.teacher_id = auth.uid()
    )
    or exists (
      select 1 from class_students cs
      where cs.class_id = chat_messages.class_id and cs.student_id = auth.uid()
    )
  );
