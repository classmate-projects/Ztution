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

-- Private bucket for study material files. All reads/writes go through the
-- server (service-role key) via our API routes, never directly from the
-- browser, so no storage RLS policies are needed here.
insert into storage.buckets (id, name, public)
values ('materials', 'materials', false)
on conflict (id) do nothing;
