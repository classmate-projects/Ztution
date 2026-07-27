-- Ztution tuition app schema.
-- Run this in the Supabase SQL editor (or via `supabase db push`) before using the API routes.
-- All access goes through the service-role key from the Next.js server; authorization is
-- enforced in application code (lib/authorize.ts), so RLS is left disabled here.
--
-- Safe to re-run, whether your project is brand new or already has the first
-- version of this schema applied (base tables created without the newer
-- columns, then those columns are added/backfilled/constrained separately).

create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  name text not null,
  role text not null check (role in ('teacher', 'student')),
  created_at timestamptz not null default now()
);

alter table users add column if not exists username text;
update users set username = 'user_' || substr(id::text, 1, 8) where username is null;
alter table users alter column username set not null;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'users_username_key') then
    alter table users add constraint users_username_key unique (username);
  end if;
end $$;

create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  teacher_id uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists classes_teacher_id_idx on classes (teacher_id);

-- Teachers assign students to a class ('assigned'); the student then confirms
-- via the join endpoint, flipping status to 'active' and stamping joined_at.
create table if not exists class_students (
  class_id uuid not null references classes (id) on delete cascade,
  student_id uuid not null references users (id) on delete cascade,
  status text not null default 'assigned' check (status in ('assigned', 'active')),
  assigned_at timestamptz not null default now(),
  joined_at timestamptz,
  primary key (class_id, student_id)
);
create index if not exists class_students_student_id_idx on class_students (student_id);

-- A class can have many sessions: scheduled ahead of time, or started instantly
-- (scheduled_at defaults to now(), status jumps straight to 'live'). No call
-- integration yet — this only tracks lifecycle so the UI can show "live now"
-- vs. "upcoming" and gate a (currently disabled) "join call" action.
create table if not exists class_sessions (
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
create index if not exists class_sessions_class_id_idx on class_sessions (class_id);

create table if not exists materials (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes (id) on delete cascade,
  teacher_id uuid not null references users (id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);
create index if not exists materials_class_id_idx on materials (class_id);

-- Materials used to store a plain `url` column; files now live in Supabase
-- Storage instead, referenced by storage_path.
alter table materials drop column if exists url;
alter table materials add column if not exists storage_path text;
alter table materials add column if not exists file_name text;
alter table materials add column if not exists mime_type text;
alter table materials add column if not exists size_bytes bigint;
update materials set storage_path = '' where storage_path is null;
update materials set file_name = 'unknown' where file_name is null;
alter table materials alter column storage_path set not null;
alter table materials alter column file_name set not null;

create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes (id) on delete cascade,
  teacher_id uuid not null references users (id) on delete cascade,
  title text not null,
  description text,
  due_date timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists assignments_class_id_idx on assignments (class_id);

create table if not exists submissions (
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
create index if not exists submissions_assignment_id_idx on submissions (assignment_id);
create index if not exists submissions_student_id_idx on submissions (student_id);

alter table users add column if not exists stripe_customer_id text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'users_stripe_customer_id_key') then
    alter table users add constraint users_stripe_customer_id_key unique (stripe_customer_id);
  end if;
end $$;

-- One row per student reflecting their *current* Stripe subscription state
-- (kept in sync by the /api/webhooks/stripe handler) — not a payment history
-- log. `status` mirrors Stripe's own subscription status strings directly
-- ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete', ...).
create table if not exists subscriptions (
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

-- Private bucket for study material files. All reads/writes go through the
-- server (service-role key) via our API routes, never directly from the
-- browser, so no storage RLS policies are needed here.
insert into storage.buckets (id, name, public)
values ('materials', 'materials', false)
on conflict (id) do nothing;
