-- Adds message reactions + replies to the chat feature.
-- Safe to run once on an existing database (idempotent). Run in the Supabase
-- SQL editor. If prompted about RLS, choose "Run without RLS".

-- Reply target columns on chat_messages (WhatsApp-style quote). The preview is
-- snapshotted at send time so it survives the quoted message being deleted.
alter table chat_messages
  add column if not exists reply_to_id uuid references chat_messages (id) on delete set null;
alter table chat_messages
  add column if not exists reply_to_sender text;
alter table chat_messages
  add column if not exists reply_to_preview text;

-- Emoji reactions. Each (message, user, emoji) is unique; re-reacting toggles.
create table if not exists chat_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references chat_messages (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);
create index if not exists chat_reactions_message_id_idx on chat_reactions (message_id);
