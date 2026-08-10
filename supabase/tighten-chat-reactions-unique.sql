-- OPTIONAL. The app already enforces "one reaction per user per message" in
-- code (replacing the old one), so this isn't required. Run it only if you want
-- the same guarantee at the database level. Idempotent-ish; safe to run once.
-- If prompted about RLS, choose "Run without RLS".

-- 1) Dedupe any pre-existing multi-reactions, keeping the newest per user/message.
delete from chat_reactions a
using chat_reactions b
where a.message_id = b.message_id
  and a.user_id = b.user_id
  and a.created_at < b.created_at;

delete from chat_reactions a
using chat_reactions b
where a.message_id = b.message_id
  and a.user_id = b.user_id
  and a.created_at = b.created_at
  and a.id > b.id;

-- 2) Swap the uniqueness from (message, user, emoji) to (message, user).
alter table chat_reactions
  drop constraint if exists chat_reactions_message_id_user_id_emoji_key;
alter table chat_reactions
  add constraint chat_reactions_message_id_user_id_key unique (message_id, user_id);
