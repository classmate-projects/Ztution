/**
 * Chat messages are ephemeral: they disappear this many days after being sent.
 * Enforced two ways in the messages route — reads are filtered to this window
 * (so expired messages vanish for every viewer immediately), and a lazy sweep
 * hard-deletes the expired rows and their storage attachments on read.
 */
export const CHAT_MESSAGE_TTL_DAYS = 7;

/** ISO timestamp of the cutoff — messages older than this are expired. */
export function chatMessageCutoffIso(): string {
  return new Date(Date.now() - CHAT_MESSAGE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
}
