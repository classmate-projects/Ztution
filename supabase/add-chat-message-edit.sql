-- Adds message editing to the chat feature.
-- Safe to run once on an existing database (idempotent). Run in the Supabase
-- SQL editor. If prompted about RLS, choose "Run without RLS".

alter table chat_messages
  add column if not exists edited_at timestamptz;
