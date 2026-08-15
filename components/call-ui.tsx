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
      className={`inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full transition-colors ${
        active
          ? "bg-white/90 text-zinc-800 hover:bg-white"
          : "bg-red-500 text-white hover:bg-red-600"
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
      className={`inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full transition-colors ${
        on ? "bg-indigo-600 text-white hover:bg-indigo-500" : "bg-white/15 text-white hover:bg-white/25"
      }`}
    >
      {children}
    </button>
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
      className="inline-flex h-11 items-center gap-2 rounded-full bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {LEAVE_ICON}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
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
}) {
  return (
    <aside className="absolute inset-y-0 right-0 z-40 flex w-full max-w-sm flex-col border-l border-zinc-200 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-900">
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
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <p className="text-sm text-zinc-400 dark:text-zinc-500">No messages yet.</p>
        ) : (
          messages.map((m) =>
            m.system ? (
              <p key={m.id} className="text-center text-xs italic text-zinc-400 dark:text-zinc-500">
                {m.text}
              </p>
            ) : (
              <div key={m.id} className="text-sm">
                <span
                  className={`font-medium ${
                    m.senderId === currentUserId
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-zinc-700 dark:text-zinc-200"
                  }`}
                >
                  {m.senderId === currentUserId ? "You" : m.senderName}
                  {m.senderRole === "teacher" ? " (Teacher)" : ""}
                </span>
                <span className="ml-2 break-words text-zinc-600 dark:text-zinc-300">{m.text}</span>
              </div>
            )
          )
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={onSubmit} className="flex gap-2 border-t border-zinc-200 p-3 dark:border-white/10">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <Button type="submit" disabled={!value.trim()}>
          Send
        </Button>
      </form>
    </aside>
  );
}
