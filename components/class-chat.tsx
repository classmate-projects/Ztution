"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Button, ErrorBanner, Field, Input, Textarea } from "@/components/ui";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { formatFileSize, initials } from "@/lib/format";
import { CHAT_MESSAGE_TTL_DAYS } from "@/lib/chat";
import type { ChatGroupRow, ChatMessageWithSender } from "@/lib/supabase/types";

const PLUS_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
  </svg>
);

const CHAT_BUBBLE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-4 w-4">
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H9l-4 3.5V16H5.5A1.5 1.5 0 0 1 4 14.5Z" />
  </svg>
);

const PAPERCLIP_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-5 w-5">
    <path
      d="M21 11.5 12.5 20a5 5 0 0 1-7-7L14 4.5a3.3 3.3 0 0 1 4.7 4.7L10 18a1.7 1.7 0 0 1-2.4-2.4l8-8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SEND_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
    <path d="M4 12 20 4l-6 16-3-7-7-1Z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const FILE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-4 w-4">
    <path d="M6 2.75h8.5L19 7.25V19.5a1.75 1.75 0 0 1-1.75 1.75H6A1.75 1.75 0 0 1 4.25 19.5v-15A1.75 1.75 0 0 1 6 2.75Z" />
    <path d="M14 2.75V7a1 1 0 0 0 1 1h4" />
  </svg>
);

const CLOSE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
    <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
  </svg>
);

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/**
 * The list of chat groups shown in a class's Chats section — a "New chat"
 * button (teachers only) followed by every group. Used both in the teacher
 * sidebar and the student chat section.
 */
export function ChatGroupList({
  groups,
  activeGroupId,
  onSelect,
  canCreate,
  onNewChat,
}: {
  groups: ChatGroupRow[];
  activeGroupId: string | null;
  onSelect: (groupId: string) => void;
  canCreate: boolean;
  onNewChat: () => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      {canCreate && (
        <button
          type="button"
          onClick={onNewChat}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-sm font-medium text-indigo-600 transition-colors hover:border-indigo-400 hover:bg-indigo-50 dark:border-zinc-700 dark:text-indigo-300 dark:hover:border-indigo-400 dark:hover:bg-indigo-500/10"
        >
          <span className="text-indigo-500 dark:text-indigo-300">{PLUS_ICON}</span>
          New chat
        </button>
      )}

      {groups.length === 0 ? (
        <p className="px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">
          {canCreate ? "No chats yet — create one." : "No chats yet."}
        </p>
      ) : (
        groups.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => onSelect(group.id)}
            className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeGroupId === group.id
                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/5"
            }`}
          >
            <span
              className={
                activeGroupId === group.id
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-zinc-400 dark:text-zinc-500"
              }
            >
              {CHAT_BUBBLE_ICON}
            </span>
            <span className="flex-1 truncate text-left">{group.name}</span>
          </button>
        ))
      )}
    </div>
  );
}

/** Popup for a teacher to create a new chat group. */
export function NewChatDialog({
  classId,
  onClose,
  onCreated,
}: {
  classId: string;
  onClose: () => void;
  onCreated: (group: ChatGroupRow) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function create(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/classes/${classId}/chat-groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message ?? "Something went wrong");
        return;
      }
      onCreated(body.data.group as ChatGroupRow);
    } catch {
      setError("Network error — please try again");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={() => !isSubmitting && onClose()}
    >
      <div
        className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold">New chat</h3>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Create a chat group for you and your students.
        </p>
        <form className="mt-4 flex flex-col gap-4" onSubmit={create}>
          <Field label="Chat name" htmlFor="chat-name">
            <Input
              id="chat-name"
              required
              autoFocus
              placeholder="e.g. General discussion"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Description (optional)" htmlFor="chat-description">
            <Textarea
              id="chat-description"
              rows={2}
              className="min-h-16"
              placeholder="What is this chat for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <ErrorBanner message={error} />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? "Creating…" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * The chat interface for one group: a scrolling message list (your messages on
 * the right, everyone else's on the left) plus a composer that sends text
 * and/or a file attachment. New messages arrive live over Supabase Realtime.
 */
export function ChatPanel({
  classId,
  groupId,
  groupName,
  currentUserId,
}: {
  classId: string;
  groupId: string;
  groupName: string;
  currentUserId: string;
}) {
  const [messages, setMessages] = useState<ChatMessageWithSender[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const channelRef = useRef<ReturnType<ReturnType<typeof createBrowserSupabaseClient>["channel"]> | null>(null);

  const loadMessages = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const res = await fetch(`/api/classes/${classId}/chat-groups/${groupId}/messages`);
      const body = await res.json();
      if (res.ok) {
        setMessages((body.data.messages ?? []) as ChatMessageWithSender[]);
        setError(null);
      } else {
        setError(body.message ?? "Couldn't load messages");
      }
    } catch {
      setError("Network error — couldn't load messages");
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [classId, groupId]);

  // Initial load + live updates over a Broadcast channel. Callers mount
  // ChatPanel with a `key` of the group id, so switching groups remounts this
  // fresh (initial isLoading=true, no messages) — no in-render reset needed.
  //
  // We use Broadcast (not Postgres Changes) on purpose: it's the same mechanism
  // the live-call feature uses and doesn't depend on the Realtime socket's RLS
  // auth, which is fragile. When someone sends a message they also broadcast a
  // "new" ping (see `send`); every other open client refetches on receipt. The
  // ping carries no message content, so the authorized API stays the only way
  // to read messages.
  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const channel = supabase.channel(`chat:${groupId}`);
    channelRef.current = channel;

    channel.on("broadcast", { event: "new" }, () => loadMessages());
    channel.subscribe((status) => {
      // Load once the channel is ready (and on reconnect) so we never miss the
      // window between mount and subscribe. Also load if the socket errors out,
      // so message history still shows even when live updates are unavailable.
      if (status === "SUBSCRIBED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        loadMessages();
      }
    });

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [groupId, loadMessages]);

  // Keep the newest message in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!text.trim() && !file) return;
    setIsSending(true);
    setError(null);
    try {
      const formData = new FormData();
      if (text.trim()) formData.set("body", text.trim());
      if (file) formData.set("file", file);
      const res = await fetch(`/api/classes/${classId}/chat-groups/${groupId}/messages`, {
        method: "POST",
        body: formData,
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message ?? "Couldn't send message");
        return;
      }
      setText("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      // Tell every other open client to refetch, then update our own view.
      channelRef.current?.send({ type: "broadcast", event: "new", payload: {} });
      await loadMessages();
    } catch {
      setError("Network error — couldn't send message");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex h-[70vh] min-h-[28rem] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
      <div className="border-b border-zinc-200 px-4 py-3 dark:border-white/10">
        <div className="font-medium">{groupName}</div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          Messages disappear after {CHAT_MESSAGE_TTL_DAYS} days
        </div>
      </div>

      <div ref={scrollRef} className="no-scrollbar flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No messages yet — say hello.
          </p>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.sender_id === currentUserId}
            />
          ))
        )}
      </div>

      <form
        onSubmit={send}
        className="border-t border-zinc-200 px-3 py-3 dark:border-white/10"
      >
        {file && (
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-white/10">
            <span className="text-zinc-500 dark:text-zinc-400">{FILE_ICON}</span>
            <span className="flex-1 truncate">{file.name}</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {formatFileSize(file.size)}
            </span>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="cursor-pointer text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              aria-label="Remove attachment"
            >
              {CLOSE_ICON}
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-white/10"
            title="Attach a file"
            aria-label="Attach a file"
          >
            {PAPERCLIP_ICON}
          </button>
          <textarea
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(e as unknown as FormEvent);
              }
            }}
            placeholder="Type a message…"
            className="max-h-32 min-h-10 flex-1 resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <button
            type="submit"
            disabled={isSending || (!text.trim() && !file)}
            className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-indigo-600 text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400"
            title="Send"
            aria-label="Send message"
          >
            {SEND_ICON}
          </button>
        </div>
        {error && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
        )}
      </form>
    </div>
  );
}

function MessageBubble({
  message,
  isOwn,
}: {
  message: ChatMessageWithSender;
  isOwn: boolean;
}): ReactNode {
  const senderName = message.sender?.name ?? "Unknown";
  const isTeacher = message.sender?.role === "teacher";

  // Bubble styling: your own messages (right, indigo); a teacher's message
  // (left, amber accent so students can spot it at a glance); anyone else's
  // (left, neutral).
  const bubbleClasses = isOwn
    ? "rounded-br-sm bg-indigo-600 text-white dark:bg-indigo-500"
    : isTeacher
      ? "rounded-bl-sm bg-amber-100 text-amber-950 ring-1 ring-amber-300 dark:bg-amber-400/15 dark:text-amber-50 dark:ring-amber-400/30"
      : "rounded-bl-sm bg-zinc-100 text-zinc-900 dark:bg-white/10 dark:text-zinc-100";

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[75%] gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
        {!isOwn && (
          <span
            className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
              isTeacher
                ? "bg-amber-200 text-amber-800 dark:bg-amber-400/25 dark:text-amber-200"
                : "bg-zinc-200 text-zinc-600 dark:bg-white/10 dark:text-zinc-300"
            }`}
          >
            {initials(senderName)}
          </span>
        )}
        <div>
          {!isOwn && (
            <div className="mb-0.5 px-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {senderName}
              {isTeacher && (
                <span className="ml-1 font-semibold text-amber-600 dark:text-amber-400">
                  (Teacher)
                </span>
              )}
            </div>
          )}
          <div className={`rounded-2xl px-3 py-2 text-sm ${bubbleClasses}`}>
            {message.body && <p className="whitespace-pre-wrap break-words">{message.body}</p>}
            {message.attachment_name && (
              <a
                href={`/api/chat-attachments/${message.id}`}
                className={`mt-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                  isOwn
                    ? "bg-white/15 hover:bg-white/25"
                    : "bg-white/70 hover:bg-white dark:bg-white/10 dark:hover:bg-white/20"
                } ${message.body ? "mt-1.5" : ""}`}
              >
                {FILE_ICON}
                <span className="truncate">{message.attachment_name}</span>
                {message.attachment_size ? (
                  <span className="shrink-0 text-xs opacity-70">
                    {formatFileSize(message.attachment_size)}
                  </span>
                ) : null}
              </a>
            )}
          </div>
          <div
            className={`mt-0.5 px-1 text-[11px] text-zinc-400 dark:text-zinc-500 ${
              isOwn ? "text-right" : "text-left"
            }`}
          >
            {formatTime(message.created_at)}
          </div>
        </div>
      </div>
    </div>
  );
}
