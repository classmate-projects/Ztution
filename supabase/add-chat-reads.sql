-- Adds read tracking to the chat feature (unread counts + read receipts).
-- Safe to run once on an existing database. Run in the Supabase SQL editor.
-- If prompted about RLS, choose "Run without RLS".

create table if not exists chat_reads (
  group_id uuid not null references chat_groups (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists chat_reads_user_id_idx on chat_reads (user_id);
