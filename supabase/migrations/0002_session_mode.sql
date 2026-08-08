-- Migration: session call mode (conference vs streaming).
-- Safe to run against an existing Ztution database (does not drop anything).
-- Paste this into the Supabase SQL editor and run it once.

alter table class_sessions
  add column if not exists mode text not null default 'conference'
  check (mode in ('conference', 'streaming'));
