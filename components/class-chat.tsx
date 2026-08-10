"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { Button, ErrorBanner, Field, Input, Textarea } from "@/components/ui";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { formatFileSize, initials } from "@/lib/format";
import { CHAT_MESSAGE_TTL_DAYS } from "@/lib/chat";
import type { ChatGroupRow, ChatMessageWithSender } from "@/lib/supabase/types";

/** The four one-tap reactions; the "+" opens the rest. */
const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮"];
const MORE_REACTIONS = [
  "👍", "❤️", "😂", "😮", "😢", "😡", "🙏", "🎉",
  "🔥", "👏", "💯", "✅", "❌", "❓", "👀", "🤔",
];

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

const CHEVRON_DOWN_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
    <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PLUS_SMALL_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
  </svg>
);

const REPLY_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-4 w-4">
    <path d="M10 9V5l-7 7 7 7v-4c5 0 8 1.5 10 5 0-7-3-11-10-11Z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TRASH_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-4 w-4">
    <path d="M4 7h16" strokeLinecap="round" />
    <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" strokeLinecap="round" strokeLinejoin="round" />
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
  const [replyTo, setReplyTo] = useState<ChatMessageWithSender | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const loadingRef = useRef(false);
  const channelRef = useRef<ReturnType<ReturnType<typeof createBrowserSupabaseClient>["channel"]> | null>(null);

  const pingPeers = useCallback(() => {
    channelRef.current?.send({ type: "broadcast", event: "new", payload: {} });
  }, []);

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

  const startReply = useCallback((message: ChatMessageWithSender) => {
    setReplyTo(message);
    // Let the reply banner render, then focus the composer.
    requestAnimationFrame(() => composerRef.current?.focus());
  }, []);

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      try {
        await fetch(
          `/api/classes/${classId}/chat-groups/${groupId}/messages/${messageId}/reactions`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emoji }),
          }
        );
        pingPeers();
        await loadMessages();
      } catch {
        // A failed toggle just leaves the reaction as-is; no destructive state.
      }
    },
    [classId, groupId, loadMessages, pingPeers]
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      try {
        const res = await fetch(
          `/api/classes/${classId}/chat-groups/${groupId}/messages/${messageId}`,
          { method: "DELETE" }
        );
        if (res.ok) {
          setReplyTo((current) => (current?.id === messageId ? null : current));
          pingPeers();
          await loadMessages();
        }
      } catch {
        // Ignore — the message stays until the next successful attempt.
      }
    },
    [classId, groupId, loadMessages, pingPeers]
  );

  const jumpToMessage = useCallback((messageId: string) => {
    const el = scrollRef.current?.querySelector(`[data-mid="${messageId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-indigo-400/60");
      setTimeout(() => el.classList.remove("ring-2", "ring-indigo-400/60"), 1200);
    }
  }, []);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!text.trim() && !file) return;
    setIsSending(true);
    setError(null);
    try {
      const formData = new FormData();
      if (text.trim()) formData.set("body", text.trim());
      if (file) formData.set("file", file);
      if (replyTo) formData.set("replyToId", replyTo.id);
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
      setReplyTo(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      // Tell every other open client to refetch, then update our own view.
      pingPeers();
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

      <div
        ref={scrollRef}
        className="no-scrollbar flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-4 py-4"
      >
        {isLoading ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No messages yet — say hello.
          </p>
        ) : (
          messages.map((message) => (
            <ChatMessageItem
              key={message.id}
              message={message}
              isOwn={message.sender_id === currentUserId}
              currentUserId={currentUserId}
              onReact={(emoji) => toggleReaction(message.id, emoji)}
              onReply={() => startReply(message)}
              onDelete={() => deleteMessage(message.id)}
              onJumpTo={jumpToMessage}
            />
          ))
        )}
      </div>

      <form
        onSubmit={send}
        className="border-t border-zinc-200 px-3 py-3 dark:border-white/10"
      >
        {replyTo && (
          <div className="mb-2 flex items-start gap-2 rounded-lg border-l-2 border-indigo-400 bg-zinc-100 px-3 py-2 dark:bg-white/10">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-indigo-600 dark:text-indigo-300">
                Replying to {replyTo.sender?.name ?? "Unknown"}
              </div>
              <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                {replyTo.body?.trim()
                  ? replyTo.body
                  : replyTo.attachment_name
                    ? `📎 ${replyTo.attachment_name}`
                    : ""}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="cursor-pointer text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              aria-label="Cancel reply"
            >
              {CLOSE_ICON}
            </button>
          </div>
        )}
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
            ref={composerRef}
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

/** Aggregate a message's raw reactions into per-emoji chips. */
function groupReactions(reactions: ChatMessageWithSender["reactions"], currentUserId: string) {
  const map = new Map<string, { emoji: string; count: number; mine: boolean }>();
  for (const r of reactions ?? []) {
    const g = map.get(r.emoji) ?? { emoji: r.emoji, count: 0, mine: false };
    g.count += 1;
    if (r.user_id === currentUserId) g.mine = true;
    map.set(r.emoji, g);
  }
  return Array.from(map.values());
}

const LONG_PRESS_MS = 450;
const SWIPE_REPLY_THRESHOLD = 56;

function ChatMessageItem({
  message,
  isOwn,
  currentUserId,
  onReact,
  onReply,
  onDelete,
  onJumpTo,
}: {
  message: ChatMessageWithSender;
  isOwn: boolean;
  currentUserId: string;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onDelete: () => void;
  onJumpTo: (messageId: string) => void;
}) {
  const senderName = message.sender?.name ?? "Unknown";
  const isTeacher = message.sender?.role === "teacher";
  const reactions = useMemo(
    () => groupReactions(message.reactions, currentUserId),
    [message.reactions, currentUserId]
  );
  // Emojis the current user has already used — so we can highlight them in the
  // tray (tapping again removes them) and the summary pill.
  const myEmojis = useMemo(
    () =>
      new Set(
        (message.reactions ?? []).filter((r) => r.user_id === currentUserId).map((r) => r.emoji)
      ),
    [message.reactions, currentUserId]
  );
  const totalReactions = message.reactions?.length ?? 0;
  // Top 3 distinct emoji types (by count) shown on the summary pill.
  const topReactions = useMemo(
    () => [...reactions].sort((a, b) => b.count - a.count).slice(0, 3),
    [reactions]
  );

  const [showActions, setShowActions] = useState(false);
  const [pinned, setPinned] = useState(false); // touch-opened: needs a tap to dismiss
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const [dragging, setDragging] = useState(false);

  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swiping = useRef(false);

  const closeAll = useCallback(() => {
    setMenuOpen(false);
    setPickerOpen(false);
    setPinned(false);
    setShowActions(false);
  }, []);

  function handleMouseEnter() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    // "Hover for a second" before the tray appears.
    hoverTimer.current = setTimeout(() => setShowActions(true), 1000);
  }
  function handleMouseLeave() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    if (!menuOpen && !pickerOpen && !pinned) setShowActions(false);
  }

  function handleTouchStart(e: ReactTouchEvent) {
    if (e.touches.length !== 1) return;
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    swiping.current = false;
    longPressTimer.current = setTimeout(() => {
      setShowActions(true);
      setPinned(true);
      navigator.vibrate?.(10);
    }, LONG_PRESS_MS);
  }
  function handleTouchMove(e: ReactTouchEvent) {
    if (!touchStart.current) return;
    const dx = e.touches[0].clientX - touchStart.current.x;
    const dy = e.touches[0].clientY - touchStart.current.y;
    if (!swiping.current && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      // Horizontal-dominant drag → treat as a reply swipe; otherwise it's a scroll.
      if (Math.abs(dx) > Math.abs(dy)) {
        swiping.current = true;
        setDragging(true);
      }
    }
    if (swiping.current && dx > 0) setSwipeX(Math.min(dx, 80));
  }
  function handleTouchEnd() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (swiping.current && swipeX >= SWIPE_REPLY_THRESHOLD) onReply();
    swiping.current = false;
    setDragging(false);
    setSwipeX(0);
    touchStart.current = null;
  }

  function react(emoji: string) {
    onReact(emoji);
    closeAll();
  }

  // Bubble styling: your own (right, indigo); a teacher's (left, amber accent so
  // students spot it); anyone else's (left, neutral).
  const bubbleClasses = isOwn
    ? "rounded-br-sm bg-indigo-600 text-white dark:bg-indigo-500"
    : isTeacher
      ? "rounded-bl-sm bg-amber-100 text-amber-950 ring-1 ring-amber-300 dark:bg-amber-400/15 dark:text-amber-50 dark:ring-amber-400/30"
      : "rounded-bl-sm bg-zinc-100 text-zinc-900 dark:bg-white/10 dark:text-zinc-100";

  const sideAlign = isOwn ? "right-0" : "left-0";

  return (
    <div
      data-mid={message.id}
      className={`group/msg flex rounded-xl transition-shadow ${isOwn ? "justify-end" : "justify-start"}`}
    >
      {/* Swipe-to-reply affordance revealed as the row slides right. */}
      <span
        className="pointer-events-none flex items-center self-center pl-1 text-indigo-500 transition-opacity"
        style={{ opacity: Math.min(swipeX / SWIPE_REPLY_THRESHOLD, 1) }}
      >
        {REPLY_ICON}
      </span>

      <div
        className={`flex max-w-[78%] gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
        style={{
          transform: swipeX ? `translateX(${swipeX}px)` : undefined,
          transition: dragging ? "none" : "transform 0.18s ease-out",
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
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

        <div className="min-w-0">
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

          {/* Bubble + floating action layer live in a positioned wrapper. */}
          <div className="relative">
            {/* Dismiss layer for touch / open popovers. */}
            {(menuOpen || pickerOpen || pinned) && (
              <div className="fixed inset-0 z-10" onClick={closeAll} />
            )}

            {/* Floating actions: quick reactions + more + menu. Positioned with
                bottom-full + pb-2 so the tray and the bubble form one continuous
                hover region (no dead gap that would hide it mid-move). */}
            <div
              className={`absolute bottom-full ${sideAlign} z-20 origin-bottom pb-2 transition-all duration-150 ${
                showActions
                  ? "translate-y-0 scale-100 opacity-100"
                  : "pointer-events-none translate-y-1 scale-90 opacity-0"
              }`}
            >
              <div className="relative flex items-center gap-0.5 rounded-full border border-zinc-200 bg-white px-1 py-1 shadow-lg dark:border-white/10 dark:bg-zinc-800">
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => react(emoji)}
                    className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-base transition-transform hover:scale-125 ${
                      myEmojis.has(emoji)
                        ? "bg-indigo-100 ring-1 ring-indigo-400 dark:bg-indigo-500/25"
                        : "hover:bg-zinc-100 dark:hover:bg-white/10"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setPickerOpen((v) => !v);
                    setMenuOpen(false);
                  }}
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/10"
                  aria-label="More reactions"
                >
                  {PLUS_SMALL_ICON}
                </button>
                <span className="mx-0.5 h-5 w-px bg-zinc-200 dark:bg-white/10" />
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen((v) => !v);
                    setPickerOpen(false);
                  }}
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/10"
                  aria-label="Message options"
                >
                  {CHEVRON_DOWN_ICON}
                </button>

                {/* More-emoji picker */}
                {pickerOpen && (
                  <div
                    className={`absolute top-full z-30 mt-2 grid w-56 grid-cols-8 gap-0.5 rounded-xl border border-zinc-200 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-zinc-800 ${sideAlign}`}
                  >
                    {MORE_REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => react(emoji)}
                        className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-lg transition-transform hover:scale-125 ${
                          myEmojis.has(emoji)
                            ? "bg-indigo-100 ring-1 ring-indigo-400 dark:bg-indigo-500/25"
                            : "hover:bg-zinc-100 dark:hover:bg-white/10"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {/* Reply / delete menu */}
                {menuOpen && (
                  <div
                    className={`absolute top-full z-30 mt-2 w-40 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-xl dark:border-white/10 dark:bg-zinc-800 ${sideAlign}`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onReply();
                        closeAll();
                      }}
                      className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-white/10"
                    >
                      {REPLY_ICON}
                      Reply
                    </button>
                    {isOwn && (
                      <button
                        type="button"
                        onClick={() => {
                          onDelete();
                          closeAll();
                        }}
                        className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                      >
                        {TRASH_ICON}
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className={`rounded-2xl px-3 py-2 text-sm ${bubbleClasses}`}>
              {/* Quoted reply */}
              {(message.reply_to_sender || message.reply_to_preview) && (
                <button
                  type="button"
                  onClick={() => message.reply_to_id && onJumpTo(message.reply_to_id)}
                  className={`mb-1.5 block w-full cursor-pointer rounded-md border-l-2 px-2 py-1 text-left text-xs ${
                    isOwn
                      ? "border-white/70 bg-white/15"
                      : "border-indigo-400/70 bg-black/5 dark:bg-white/10"
                  }`}
                >
                  <div className="font-semibold opacity-90">
                    {message.reply_to_sender ?? "Unknown"}
                  </div>
                  <div className="truncate opacity-75">{message.reply_to_preview}</div>
                </button>
              )}

              {message.body && <p className="whitespace-pre-wrap break-words">{message.body}</p>}
              {message.attachment_name && (
                <a
                  href={`/api/chat-attachments/${message.id}`}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors ${
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

            {/* Reaction summary: top 3 emoji + total count. Tap to see who
                reacted (and remove your own). */}
            {totalReactions > 0 && (
              <div className={`mt-1 flex ${isOwn ? "justify-end" : "justify-start"}`}>
                <button
                  type="button"
                  onClick={() => {
                    // If the sole reaction is your own, one tap removes it;
                    // otherwise open the "who reacted" list.
                    const onlyMine =
                      totalReactions === 1 && myEmojis.size === 1 && reactions.length === 1;
                    if (onlyMine) onReact([...myEmojis][0]);
                    else setDetailsOpen(true);
                  }}
                  className={`animate-chat-pop flex cursor-pointer items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-xs transition-colors ${
                    myEmojis.size > 0
                      ? "border-indigo-300 bg-indigo-50 dark:border-indigo-400/40 dark:bg-indigo-500/20"
                      : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  }`}
                  aria-label="See who reacted"
                >
                  {topReactions.map((r) => (
                    <span key={r.emoji}>{r.emoji}</span>
                  ))}
                  {totalReactions > 1 && (
                    <span className="ml-0.5 tabular-nums text-zinc-500 dark:text-zinc-400">
                      {totalReactions}
                    </span>
                  )}
                </button>
              </div>
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

      {detailsOpen && (
        <ReactionDetails
          reactions={message.reactions ?? []}
          currentUserId={currentUserId}
          onRemove={(emoji) => {
            onReact(emoji);
            setDetailsOpen(false);
          }}
          onClose={() => setDetailsOpen(false)}
        />
      )}
    </div>
  );
}

/**
 * "Who reacted" sheet — lists every reactor with their emoji, grouped so the
 * same emoji stays together. The current user's own reactions are tappable to
 * remove. Opened from the reaction summary pill.
 */
function ReactionDetails({
  reactions,
  currentUserId,
  onRemove,
  onClose,
}: {
  reactions: ChatMessageWithSender["reactions"];
  currentUserId: string;
  onRemove: (emoji: string) => void;
  onClose: () => void;
}) {
  // Order by how popular each emoji is, then keep reactors together.
  const counts = new Map<string, number>();
  for (const r of reactions) counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);
  const rows = [...reactions].sort(
    (a, b) => (counts.get(b.emoji) ?? 0) - (counts.get(a.emoji) ?? 0)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-[70vh] w-full max-w-xs overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-white/10 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-white/10">
          <h3 className="text-sm font-semibold">Reactions</h3>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            aria-label="Close"
          >
            {CLOSE_ICON}
          </button>
        </div>
        <div className="no-scrollbar max-h-[calc(70vh-3rem)] overflow-y-auto py-1">
          {rows.map((r) => {
            const mine = r.user_id === currentUserId;
            const name = r.user?.name ?? "Unknown";
            return (
              <button
                key={`${r.user_id}-${r.emoji}`}
                type="button"
                disabled={!mine}
                onClick={() => mine && onRemove(r.emoji)}
                className={`flex w-full items-center gap-3 px-4 py-2 text-left ${
                  mine ? "cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/5" : "cursor-default"
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
                  {initials(name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {name}
                    {mine && <span className="text-zinc-400 dark:text-zinc-500"> (You)</span>}
                  </span>
                  {mine && (
                    <span className="text-xs text-indigo-600 dark:text-indigo-400">
                      Tap to remove
                    </span>
                  )}
                </span>
                <span className="text-lg">{r.emoji}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
