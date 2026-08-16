"use client";

import { useEffect, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import { Button } from "@/components/ui";
import { initials } from "@/lib/format";

/**
 * True while the pointer/keyboard has been active in the last `delayMs`ms
 * within `containerRef` (falls back to the whole window). Used to auto-hide
 * the floating control bar during inactivity, like a normal conferencing app.
 */
export function useAutoHideControls(containerRef: RefObject<HTMLElement | null>, delayMs = 5000) {
  const [active, setActive] = useState(true);

  useEffect(() => {
    const target: HTMLElement | Window = containerRef.current ?? window;
    let timeoutId: ReturnType<typeof setTimeout>;

    function wake() {
      setActive(true);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setActive(false), delayMs);
    }

    timeoutId = setTimeout(() => setActive(false), delayMs);
    target.addEventListener("mousemove", wake);
    target.addEventListener("touchstart", wake);
    target.addEventListener("keydown", wake as EventListener);

    return () => {
      clearTimeout(timeoutId);
      target.removeEventListener("mousemove", wake);
      target.removeEventListener("touchstart", wake);
      target.removeEventListener("keydown", wake as EventListener);
    };
  }, [containerRef, delayMs]);

  return active;
}

export const MIC_ON_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" strokeLinecap="round" />
  </svg>
);

export const MIC_OFF_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
    <path d="M9 9v-3a3 3 0 0 1 5.5-1.7M15 11.5V11" strokeLinecap="round" />
    <path d="M5 11a7 7 0 0 0 10.6 6M19 11a7 7 0 0 1-1 3.6M12 18v3" strokeLinecap="round" />
    <path d="M4 4l16 16" strokeLinecap="round" />
  </svg>
);

export const CAM_ON_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
    <rect x="3" y="6" width="12" height="12" rx="2" />
    <path d="M15 10.5 21 7v10l-6-3.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CAM_OFF_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
    <path d="M15 10.5 21 7v10l-6-3.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 6h9a2 2 0 0 1 2 2v8a2 2 0 0 1-.3 1M11 18H5a2 2 0 0 1-2-2V8" strokeLinecap="round" />
    <path d="M4 4l16 16" strokeLinecap="round" />
  </svg>
);

export const CHAT_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
    <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
  </svg>
);

export const SCREEN_SHARE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-5 w-5">
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4" strokeLinecap="round" />
    <path d="M12 12V7m0 0-2 2m2-2 2 2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const FS_ENTER_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
    <path
      d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const FS_EXIT_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
    <path
      d="M9 4v4a1 1 0 0 1-1 1H4M15 4v4a1 1 0 0 0 1 1h4M9 20v-4a1 1 0 0 0-1-1H4M15 20v-4a1 1 0 0 1 1-1h4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const LEAVE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
    <path d="M15 12H4M4 12l4-4M4 12l4 4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 4h9a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const PIN_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
    <path d="M12 2v8m0 0-3 3h6l-3-3ZM9 13l-3 8 6-4 6 4-3-8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Vertical "⋮" kebab used to open a tile's moderation menu. */
export const MORE_ICON = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
    <circle cx="12" cy="5" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="12" cy="19" r="1.6" />
  </svg>
);

const REPLY_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
    <path d="M9 7 4 12l5 5M4 12h10a6 6 0 0 1 6 6v1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮"];

/** Used in the "N watching" style badge — a count of viewers, not participants. */
export const EYE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

/** Used in the "N in this call / in room" style badge — a count of participants. */
export const PEOPLE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5">
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" strokeLinecap="round" />
    <path d="M16 8.5a3 3 0 1 0 0-6" strokeLinecap="round" />
    <path d="M21 20c0-2.8-2-5-5-5.5" strokeLinecap="round" />
  </svg>
);

/** Avatar + name shown over a tile that has no live video (camera off / not yet connected). */
export function Placeholder({ name, caption, compact }: { name: string; caption?: string; compact?: boolean }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-zinc-800 to-zinc-950 text-white">
      <span
        className={`flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 font-semibold shadow-lg ring-4 ring-white/10 ${
          compact ? "h-10 w-10 text-sm" : "h-24 w-24 text-3xl"
        }`}
      >
        {initials(name)}
      </span>
      {!compact && (
        <div className="flex flex-col items-center gap-2">
          <span className="text-base font-medium">{name}</span>
          {caption && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-sm">
              {caption}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** Mic/camera style: neutral when on, red when off (muted). */
export function ControlButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full shadow-lg outline-none transition-all active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
        active
          ? "bg-white/90 text-zinc-800 shadow-black/20 hover:bg-white"
          : "bg-red-500 text-white shadow-red-950/40 hover:bg-red-600"
      }`}
    >
      {children}
    </button>
  );
}

/** Toggle style (chat / screen share / fullscreen): highlighted when on. */
export function ToggleButton({
  on,
  onClick,
  label,
  children,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full shadow-lg outline-none transition-all active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
        on
          ? "bg-indigo-600 text-white shadow-indigo-950/40 hover:bg-indigo-500"
          : "bg-white/15 text-white shadow-black/20 hover:bg-white/25"
      }`}
    >
      {children}
    </button>
  );
}

/** Shown to the teacher in place of the call UI once they end it — offers the attendance/duration report before leaving the page. */
export function EndedScreen({
  onViewSummary,
  onBackToClass,
}: {
  onViewSummary: () => void;
  onBackToClass: () => void;
}) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-zinc-950 p-6 text-center text-white">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-7 w-7">
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <p className="text-lg font-semibold">Call ended</p>
      <p className="max-w-sm text-sm text-white/60">
        You can view a summary of who attended and for how long.
      </p>
      <div className="flex gap-3">
        <Button variant="ghost" onClick={onBackToClass}>
          Back to class
        </Button>
        <Button onClick={onViewSummary}>View summary</Button>
      </div>
    </div>
  );
}

export function HangupButton({ onClick, label, disabled }: { onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="inline-flex h-11 items-center gap-2 rounded-full bg-red-600 px-4 text-sm font-medium text-white shadow-lg shadow-red-950/40 outline-none transition-all active:scale-95 hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {LEAVE_ICON}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export interface CallReaction {
  emoji: string;
  userId: string;
  userName: string;
}

export interface CallMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "teacher" | "student";
  text: string;
  at: number;
  // Join/leave notices — rendered as a centered notice instead of a chat line.
  system?: boolean;
  replyTo?: { id: string; senderName: string; text: string } | null;
  reactions?: CallReaction[];
}

/** Slide-over panel for ephemeral in-call text (chat / comments). Not persisted. */
export function MessagePanel({
  title,
  placeholder,
  messages,
  currentUserId,
  value,
  onChange,
  onSubmit,
  onClose,
  endRef,
  onReact,
  replyTo,
  onReply,
  onCancelReply,
}: {
  title: string;
  placeholder: string;
  messages: CallMessage[];
  currentUserId: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
  endRef: React.RefObject<HTMLDivElement | null>;
  onReact: (messageId: string, emoji: string) => void;
  replyTo: CallMessage | null;
  onReply: (message: CallMessage) => void;
  onCancelReply: () => void;
}) {
  return (
    <aside className="animate-slide-in-right absolute inset-y-0 right-0 z-40 flex w-full max-w-sm flex-col border-l border-zinc-200 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-white/10">
        <span className="text-sm font-medium">{title}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          title="Close"
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
            <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="no-scrollbar flex-1 overflow-y-auto px-3 py-3">
        {messages.length === 0 ? (
          <p className="px-1 text-sm text-zinc-400 dark:text-zinc-500">No messages yet.</p>
        ) : (
          messages.map((m, i) => {
            if (m.system) {
              return (
                <p key={m.id} className="py-1 text-center text-xs italic text-zinc-400 dark:text-zinc-500">
                  {m.text}
                </p>
              );
            }
            const isOwn = m.senderId === currentUserId;
            // Only repeat the sender's name when it changes from the previous
            // bubble, so a run of messages from the same person reads as one
            // group instead of a name on every line.
            const prev = messages[i - 1];
            const showName = !isOwn && (!prev || prev.system || prev.senderId !== m.senderId);
            return (
              <MessageBubble
                key={m.id}
                message={m}
                isOwn={isOwn}
                showName={showName}
                currentUserId={currentUserId}
                onReact={(emoji) => onReact(m.id, emoji)}
                onReply={() => onReply(m)}
              />
            );
          })
        )}
        <div ref={endRef} />
      </div>
      {replyTo && (
        <div className="flex items-center gap-2 border-t border-zinc-200 bg-zinc-50 px-3 py-2 text-xs dark:border-white/10 dark:bg-white/[0.03]">
          <span className="text-indigo-500 dark:text-indigo-400">{REPLY_ICON}</span>
          <div className="min-w-0 flex-1">
            <span className="font-medium text-zinc-600 dark:text-zinc-300">
              Replying to {replyTo.senderId === currentUserId ? "yourself" : replyTo.senderName}
            </span>
            <p className="truncate text-zinc-400 dark:text-zinc-500">{replyTo.text}</p>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            aria-label="Cancel reply"
            title="Cancel reply"
            className="shrink-0 cursor-pointer rounded-full p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-zinc-200"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}
      <form onSubmit={onSubmit} className="flex gap-2 border-t border-zinc-200 p-3 dark:border-white/10">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition-colors hover:border-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600"
        />
        <Button type="submit" disabled={!value.trim()}>
          Send
        </Button>
      </form>
    </aside>
  );
}

// Top emoji types by popularity — the summary pill shows at most 3, tap for
// the full "who reacted" list.
function topCallReactions(reactions: CallReaction[]) {
  const counts = new Map<string, number>();
  for (const r of reactions) counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);
  return [...counts.entries()]
    .map(([emoji, count]) => ({ emoji, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}

function MessageBubble({
  message,
  isOwn,
  showName,
  currentUserId,
  onReact,
  onReply,
}: {
  message: CallMessage;
  isOwn: boolean;
  showName: boolean;
  currentUserId: string;
  onReact: (emoji: string) => void;
  onReply: () => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const reactions = message.reactions ?? [];
  const myReaction = reactions.find((r) => r.userId === currentUserId);
  const topReactions = topCallReactions(reactions);
  const sideAlign = isOwn ? "right-0" : "left-0";

  return (
    <div className={`flex flex-col pb-1 ${isOwn ? "items-end" : "items-start"}`}>
      {showName && (
        <span className="mb-0.5 px-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {message.senderName}
          {message.senderRole === "teacher" ? " · Teacher" : ""}
        </span>
      )}

      <div
        className="relative max-w-[85%]"
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Dismiss layer for touch (tapping the bubble toggles the tray below). */}
        {showActions && <div className="fixed inset-0 z-10 sm:hidden" onClick={() => setShowActions(false)} />}

        {/* Reply + quick-reaction tray, revealed on hover (desktop) or tap (touch). */}
        <div
          className={`absolute bottom-full ${sideAlign} z-20 origin-bottom pb-1 transition-all duration-150 ${
            showActions
              ? "translate-y-0 scale-100 opacity-100"
              : "pointer-events-none translate-y-1 scale-90 opacity-0"
          }`}
        >
          <div className="flex items-center gap-0.5 rounded-full border border-zinc-200 bg-white px-1 py-1 shadow-lg dark:border-white/10 dark:bg-zinc-800">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onReact(emoji);
                  setShowActions(false);
                }}
                className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-base transition-transform hover:scale-125 ${
                  myReaction?.emoji === emoji
                    ? "bg-indigo-100 ring-1 ring-indigo-400 dark:bg-indigo-500/25"
                    : "hover:bg-zinc-100 dark:hover:bg-white/10"
                }`}
              >
                {emoji}
              </button>
            ))}
            <span className="mx-0.5 h-4 w-px bg-zinc-200 dark:bg-white/10" />
            <button
              type="button"
              onClick={() => {
                onReply();
                setShowActions(false);
              }}
              title="Reply"
              aria-label="Reply"
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/10"
            >
              {REPLY_ICON}
            </button>
          </div>
        </div>

        <div
          onClick={() => setShowActions((v) => !v)}
          className={`cursor-pointer whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
            isOwn
              ? "rounded-br-sm bg-indigo-600 text-white"
              : "rounded-bl-sm bg-zinc-100 text-zinc-800 dark:bg-white/10 dark:text-zinc-100"
          }`}
        >
          {message.replyTo && (
            <div
              className={`mb-1 rounded-lg border-l-2 px-2 py-1 text-xs ${
                isOwn
                  ? "border-white/40 bg-white/10 text-white/80"
                  : "border-indigo-400 bg-black/5 text-zinc-500 dark:bg-white/5 dark:text-zinc-400"
              }`}
            >
              <p className="font-medium">{message.replyTo.senderName}</p>
              <p className="truncate">{message.replyTo.text}</p>
            </div>
          )}
          {message.text}
        </div>
      </div>

      {/* Reaction summary: top 3 emoji + total count in one pill. Tap to see
          who reacted (and remove your own); if you're the only reactor, tap
          removes it directly instead of opening the list for just yourself. */}
      {reactions.length > 0 && (
        <div className={`mt-1 flex ${isOwn ? "justify-end" : "justify-start"}`}>
          <button
            type="button"
            onClick={() => {
              const onlyMine = reactions.length === 1 && myReaction;
              if (onlyMine) onReact(myReaction.emoji);
              else setDetailsOpen(true);
            }}
            aria-label="See who reacted"
            className={`animate-chat-pop flex cursor-pointer items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-xs transition-colors ${
              myReaction
                ? "border-indigo-300 bg-indigo-50 dark:border-indigo-400/40 dark:bg-indigo-500/20"
                : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            }`}
          >
            {topReactions.map((r) => (
              <span key={r.emoji}>{r.emoji}</span>
            ))}
            {reactions.length > 1 && (
              <span className="ml-0.5 tabular-nums text-zinc-500 dark:text-zinc-400">{reactions.length}</span>
            )}
          </button>
        </div>
      )}

      {detailsOpen && (
        <ReactionDetails
          reactions={reactions}
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
 * "Who reacted" sheet — lists every reactor with their emoji, most-popular
 * emoji first. The current user's own reaction is tappable to remove.
 */
function ReactionDetails({
  reactions,
  currentUserId,
  onRemove,
  onClose,
}: {
  reactions: CallReaction[];
  currentUserId: string;
  onRemove: (emoji: string) => void;
  onClose: () => void;
}) {
  const counts = new Map<string, number>();
  for (const r of reactions) counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);
  const rows = [...reactions].sort((a, b) => (counts.get(b.emoji) ?? 0) - (counts.get(a.emoji) ?? 0));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="animate-scale-in max-h-[70vh] w-full max-w-xs overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-900"
        style={{ transformOrigin: "center" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-white/10">
          <h3 className="text-sm font-semibold">Reactions</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="no-scrollbar max-h-[calc(70vh-3rem)] overflow-y-auto py-1">
          {rows.map((r) => {
            const mine = r.userId === currentUserId;
            return (
              <button
                key={`${r.userId}-${r.emoji}`}
                type="button"
                disabled={!mine}
                onClick={() => mine && onRemove(r.emoji)}
                className={`flex w-full items-center gap-3 px-4 py-2 text-left ${
                  mine ? "cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/5" : "cursor-default"
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
                  {initials(r.userName)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {r.userName}
                    {mine && <span className="text-zinc-400 dark:text-zinc-500"> (You)</span>}
                  </span>
                  {mine && (
                    <span className="text-xs text-indigo-600 dark:text-indigo-400">Tap to remove</span>
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
