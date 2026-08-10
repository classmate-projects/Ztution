-- Ztution tuition app schema.
-- Run this in the Supabase SQL editor (or via `supabase db push`) before using the API routes.
-- Authentication is handled by Supabase Auth (auth.users) — this file only owns the app's
-- own tables. All access goes through the service-role key from the Next.js server;
-- authorization is enforced in application code (lib/authorize.ts), so RLS is left
-- disabled here.
--
-- This is a clean drop-and-recreate (not an in-place migration) since `users.id` changes
-- from a self-generated UUID to a foreign key into auth.users — safe only because there's
-- no real user data to preserve yet.

create extension if not exists "pgcrypto";

drop table if exists notifications cascade;
drop table if exists chat_messages cascade;
drop table if exists chat_groups cascade;
drop table if exists submissions cascade;
drop table if exists assignments cascade;
drop table if exists materials cascade;
drop table if exists class_sessions cascade;
drop table if exists class_students cascade;
drop table if exists classes cascade;
drop table if exists subscriptions cascade;
drop table if exists users cascade;
drop function if exists public.handle_new_user() cascade;

-- Profile row for each Supabase Auth user. `id` mirrors auth.users.id (not
-- self-generated) so every existing FK/embedded-join in the app that points
-- at `users(id)` keeps working unchanged.
create table users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name text not null,
  username text not null unique,
  role text not null check (role in ('teacher', 'student')),
  stripe_customer_id text unique,
  created_at timestamptz not null default now()
);

-- Populates public.users right after Supabase Auth creates the auth.users row.
-- Runs in the same transaction as that insert, so a failure (e.g. a race on
-- the username unique constraint) rolls back the whole signup atomically.
-- `role` comes from app_metadata (set only via the service-role admin API at
-- signup, so a student can never grant themselves the teacher role by editing
-- their own user_metadata).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, name, username, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'username', new.id::text),
    coalesce(new.raw_app_meta_data ->> 'role', 'student')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- Monthly fee the teacher expects for this class, in the app's currency.
  -- Defaults to 0 (unset) so existing flows that only send a name keep working.
  payment_amount numeric not null default 0 check (payment_amount >= 0),
  teacher_id uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index classes_teacher_id_idx on classes (teacher_id);

-- Teachers assign students to a class ('assigned'); the student then confirms
-- via the join endpoint, flipping status to 'active' and stamping joined_at.
-- A teacher can also 'suspend' a student (e.g. unpaid fee) to cut off access
-- without deleting the enrollment row, then reactivate back to their prior stage.
create table class_students (
  class_id uuid not null references classes (id) on delete cascade,
  student_id uuid not null references users (id) on delete cascade,
  status text not null default 'assigned' check (status in ('assigned', 'active', 'suspended')),
  assigned_at timestamptz not null default now(),
  joined_at timestamptz,
  primary key (class_id, student_id)
);
create index class_students_student_id_idx on class_students (student_id);

-- A class can have many sessions: scheduled ahead of time, or started instantly
-- (scheduled_at defaults to now(), status jumps straight to 'live'). No call
-- integration yet — this only tracks lifecycle so the UI can show "live now"
-- vs. "upcoming" and gate a (currently disabled) "join call" action.
create table class_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes (id) on delete cascade,
  teacher_id uuid not null references users (id) on delete cascade,
  title text not null,
  scheduled_at timestamptz not null default now(),
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'ended')),
  -- How the live call runs: 'conference' (everyone shares camera/mic) or
  -- 'streaming' (only the teacher broadcasts, students watch). Chosen by the
  -- teacher when the session starts; defaults to conference.
  mode text not null default 'conference' check (mode in ('conference', 'streaming')),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);
create index class_sessions_class_id_idx on class_sessions (class_id);

-- Files live in Supabase Storage, referenced by storage_path.
create table materials (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes (id) on delete cascade,
  teacher_id uuid not null references users (id) on delete cascade,
  title text not null,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);
create index materials_class_id_idx on materials (class_id);

create table assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes (id) on delete cascade,
  teacher_id uuid not null references users (id) on delete cascade,
  title text not null,
  description text,
  due_date timestamptz,
  created_at timestamptz not null default now()
);
create index assignments_class_id_idx on assignments (class_id);

create table submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments (id) on delete cascade,
  student_id uuid not null references users (id) on delete cascade,
  content text not null,
  submitted_at timestamptz not null default now(),
  grade numeric,
  feedback text,
  evaluated_at timestamptz,
  unique (assignment_id, student_id)
);
create index submissions_assignment_id_idx on submissions (assignment_id);
create index submissions_student_id_idx on submissions (student_id);

-- Chat groups are teacher-created rooms inside a class where the teacher and all
-- enrolled students can talk. Only the teacher can create a group (enforced in
-- application code); everyone in the class can post messages to it.
create table chat_groups (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes (id) on delete cascade,
  name text not null,
  description text,
  created_by uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index chat_groups_class_id_idx on chat_groups (class_id);

-- One row per chat message. `class_id` is denormalized from the group so the
-- Realtime SELECT policy and the browser's per-class socket filter can match on
-- it directly (mirrors how materials/class_sessions carry class_id). A message
-- carries text (`body`), an attachment, or both — at least one is required,
-- enforced in application code. Attachment files live in the 'chat-attachments'
-- Storage bucket, referenced by attachment_path.
--
-- Messages are ephemeral: they expire 7 days after created_at. The messages API
-- route filters reads to that window and lazily hard-deletes expired rows (and
-- their storage attachments) on read, so no scheduled job is required. See
-- lib/chat.ts (CHAT_MESSAGE_TTL_DAYS).
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references chat_groups (id) on delete cascade,
  class_id uuid not null references classes (id) on delete cascade,
  sender_id uuid not null references users (id) on delete cascade,
  body text,
  attachment_path text,
  attachment_name text,
  attachment_mime text,
  attachment_size bigint,
  created_at timestamptz not null default now()
);
create index chat_messages_group_id_idx on chat_messages (group_id, created_at);

-- One row per student reflecting their *current* Stripe subscription state
-- (kept in sync by the /api/webhooks/stripe handler) — not a payment history
-- log. `status` mirrors Stripe's own subscription status strings directly
-- ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete', ...).
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references users (id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text not null,
  stripe_price_id text,
  status text not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

-- One row per in-app notification. `read_at is null` means unread (same
-- convention as class_students.joined_at). `message` is precomputed at
-- creation time rather than reconstructed from class/actor joins at read
-- time, since notifications are historical — the underlying class/teacher
-- name could change or be deleted later without invalidating old messages.
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  type text not null check (type in ('class_invite')),
  class_id uuid references classes (id) on delete cascade,
  actor_id uuid references users (id) on delete cascade,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_id_idx on notifications (user_id);
create index notifications_user_id_unread_idx on notifications (user_id) where read_at is null;

-- Notifications are the one table the browser reads directly (via Realtime
-- Postgres Changes, not our API routes), so it's the one table that needs
-- RLS — everything else stays authorized purely in application code
-- (lib/authorize.ts) via the service-role key, which bypasses RLS regardless.
alter table notifications enable row level security;

create policy "Users can view their own notifications"
  on notifications for select
  using (auth.uid() = user_id);

-- Required for postgres_changes subscriptions to fire on this table at all.
alter publication supabase_realtime add table notifications;

-- ---------------------------------------------------------------------------
-- Live class pages (Realtime).
-- The class detail page subscribes to Postgres Changes on the class row and
-- its child tables so every viewer sees sessions/students/materials/settings
-- update without a manual reload. Writes still go through the service-role key
-- (which bypasses RLS), and page reads are server-side with that same key — so
-- these SELECT policies exist ONLY to scope what the browser's Realtime socket
-- (anon/authenticated role) is allowed to receive: a teacher sees their own
-- classes, a student sees classes they're enrolled in.
--
-- REPLICA IDENTITY FULL puts the whole old row in DELETE/UPDATE events so RLS
-- can be evaluated against columns that aren't in the primary key (e.g.
-- class_id on a session/material delete).
-- ---------------------------------------------------------------------------
alter table classes enable row level security;
alter table class_students enable row level security;
alter table class_sessions enable row level security;
alter table materials enable row level security;
alter table chat_groups enable row level security;
alter table chat_messages enable row level security;

alter table classes replica identity full;
alter table class_students replica identity full;
alter table class_sessions replica identity full;
alter table materials replica identity full;
alter table chat_groups replica identity full;
alter table chat_messages replica identity full;

create policy "Read classes you teach or are enrolled in"
  on classes for select
  using (
    teacher_id = auth.uid()
    or exists (
      select 1 from class_students cs
      where cs.class_id = classes.id and cs.student_id = auth.uid()
    )
  );

create policy "Read enrollments for your class or yourself"
  on class_students for select
  using (
    student_id = auth.uid()
    or exists (
      select 1 from classes c
      where c.id = class_students.class_id and c.teacher_id = auth.uid()
    )
  );

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

alter publication supabase_realtime add table classes, class_students, class_sessions, materials, chat_groups, chat_messages;

-- Private bucket for study material files. All reads/writes go through the
-- server (service-role key) via our API routes, never directly from the
-- browser, so no storage RLS policies are needed here.
insert into storage.buckets (id, name, public)
values ('materials', 'materials', false)
on conflict (id) do nothing;

-- Private bucket for chat message attachments. Same access model as materials:
-- all reads/writes go through the server (service-role key), never the browser.
insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', false)
on conflict (id) do nothing;
