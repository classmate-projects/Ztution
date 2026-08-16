-- Migration: "class is live" notifications, with a direct link to the call.
-- Safe to run against an existing Ztution database (does not drop anything).
-- Paste this into the Supabase SQL editor and run it once.

alter table notifications
  add column if not exists session_id uuid references class_sessions(id) on delete cascade;

-- Widen the type check (originally just 'class_invite') to also allow the
-- new "a session you're enrolled in just went live" notification.
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications
  add constraint notifications_type_check check (type in ('class_invite', 'session_live'));
