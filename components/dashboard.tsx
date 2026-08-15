"use client";

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useTheme, type Theme } from "@/components/theme";
import { formatDateTime, initials } from "@/lib/format";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Role } from "@/lib/supabase/types";

/**
 * Makes an entire card clickable/navigable without nesting a `<button>`
 * inside an `<a>` (invalid HTML — some browsers mishandle the click).
 * Nested interactive elements (e.g. InviteActions) should call
 * `event.stopPropagation()` in their own handler to opt out of the navigation.
 */
export function ClassTile({
  href,
  className = "",
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(href);
        }
      }}
      className={`cursor-pointer ${className}`}
    >
      {children}
    </div>
  );
}

const THEME_OPTIONS: Theme[] = ["system", "dark", "light"];

const BELL_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
    <path d="M6 8a6 6 0 1 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5Z" />
    <path d="M9.5 18.5a2.5 2.5 0 0 0 5 0" />
  </svg>
);

interface NotificationItem {
  id: string;
  type: string;
  class_id: string | null;
  session_id: string | null;
  message: string;
  read_at: string | null;
  created_at: string;
}

export function NotificationBell({
  initialUnreadCount,
  userId,
}: {
  initialUnreadCount: number;
  userId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [notifications, setNotifications] = useState<NotificationItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ id: string; message: string } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Live-updates the badge/list via Postgres Changes instead of polling —
  // requires RLS + the supabase_realtime publication on notifications (see
  // supabase/schema.sql), which scopes this to the signed-in user's own rows.
  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    // The RLS policy on notifications (auth.uid() = user_id) means the
    // Realtime socket has to be authenticated as this user or it gets
    // silently filtered out — the websocket doesn't automatically inherit
    // the session the way our API routes do, so it needs an explicit
    // setAuth with the current access token before subscribing, and again
    // whenever the token refreshes (it's short-lived).
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) supabase.realtime.setAuth(session.access_token);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) supabase.realtime.setAuth(session.access_token);

      channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          (payload) => {
            const notification = payload.new as NotificationItem;
            setUnreadCount((count) => count + 1);
            setNotifications((prev) => (prev ? [notification, ...prev] : prev));
          }
        )
        .subscribe((status) => {
          // Reconciles anything created while disconnected — supabase-js
          // already handles the socket reconnect itself.
          if (status === "SUBSCRIBED") {
            fetch("/api/notifications")
              .then((res) => (res.ok ? res.json() : null))
              .then((body) => body && setUnreadCount(body.data.unreadCount));
          }
        });
    });

    return () => {
      cancelled = true;
      authSubscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId]);

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (!next) return;

    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const body = await res.json();
        setNotifications(body.data.notifications);
      }
      if (unreadCount > 0) {
        setUnreadCount(0);
        await fetch("/api/notifications", { method: "PATCH" });
      }
    } finally {
      setLoading(false);
    }
  }

  async function respondToInvite(notification: NotificationItem, action: "join" | "decline") {
    if (!notification.class_id) return;
    setActionError(null);
    setRespondingId(notification.id);
    try {
      const res = await fetch(`/api/classes/${notification.class_id}/join`, {
        method: action === "join" ? "POST" : "DELETE",
      });
      const body = await res.json();
      if (!res.ok) {
        setActionError({
          id: notification.id,
          message: body.message ?? `Failed to ${action === "join" ? "join" : "decline"} class`,
        });
        return;
      }
      setNotifications((prev) => prev?.filter((item) => item.id !== notification.id) ?? prev);
      router.refresh();
    } finally {
      setRespondingId(null);
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={handleToggle}
        aria-haspopup="true"
        aria-expanded={open}
        className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-zinc-600 transition-colors active:scale-95 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/10"
      >
        {BELL_ICON}
        {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-80 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg shadow-zinc-900/10 dark:border-white/10 dark:bg-zinc-900">
          <div className="border-b border-zinc-100 px-4 py-3 text-sm font-medium text-zinc-900 dark:border-white/10 dark:text-zinc-100">
            Notifications
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading && !notifications ? (
              <p className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
            ) : !notifications?.length ? (
              <p className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">No notifications yet.</p>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="border-b border-zinc-100 px-4 py-3 last:border-b-0 dark:border-white/10"
                >
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">{notification.message}</p>
                  <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                    {formatDateTime(notification.created_at)}
                  </p>
                  {notification.type === "class_invite" && notification.class_id && (
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        variant="secondary"
                        className="px-3 py-1.5 text-xs"
                        onClick={() => respondToInvite(notification, "join")}
                        disabled={respondingId === notification.id}
                      >
                        {respondingId === notification.id ? "Working…" : "Join"}
                      </Button>
                      <Button
                        variant="ghost"
                        className="px-3 py-1.5 text-xs"
                        onClick={() => respondToInvite(notification, "decline")}
                        disabled={respondingId === notification.id}
                      >
                        Decline
                      </Button>
                    </div>
                  )}
                  {notification.type === "session_live" && notification.class_id && notification.session_id && (
                    <div className="mt-2">
                      <Link
                        href={`/dashboard/classes/${notification.class_id}/sessions/${notification.session_id}/call`}
                        onClick={() => setOpen(false)}
                        className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                      >
                        Join
                      </Link>
                    </div>
                  )}
                  {actionError?.id === notification.id && (
                    <p className="mt-1 text-xs text-red-600">{actionError.message}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}


export function UserMenu({ name, role }: { name: string; role: Role }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white transition-transform active:scale-95 dark:bg-indigo-500"
      >
        {initials(name)}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-60 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg shadow-zinc-900/10 dark:border-white/10 dark:bg-zinc-900">
          <div className="border-b border-zinc-100 px-4 py-3 dark:border-white/10">
            <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{name}</div>
            <div className="mt-0.5 text-xs font-medium capitalize text-zinc-500 dark:text-zinc-400">{role}</div>
          </div>

          <Link
            href="/dashboard/profile"
            onClick={() => setOpen(false)}
            className="block border-b border-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/10"
          >
            Profile
          </Link>

          <div className="border-b border-zinc-100 px-3 py-2.5 dark:border-white/10">
            <div className="px-1 pb-1.5 text-xs font-medium text-zinc-400 dark:text-zinc-500">Theme</div>
            <div className="flex gap-1">
              {THEME_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTheme(option)}
                  className={`flex-1 cursor-pointer rounded-lg px-2 py-1.5 text-xs font-medium capitalize transition-colors ${
                    theme === option
                      ? "bg-indigo-600 text-white dark:bg-indigo-500"
                      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/10"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full cursor-pointer px-4 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            {loggingOut ? "Signing out…" : "Log out"}
          </button>
        </div>
      )}
    </div>
  );
}

export function InviteActions({ classId }: { classId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"join" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(event: ReactMouseEvent<HTMLButtonElement>, action: "join" | "decline") {
    event.stopPropagation();
    setLoading(action);
    setError(null);
    try {
      const res = await fetch(`/api/classes/${classId}/join`, {
        method: action === "join" ? "POST" : "DELETE",
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message ?? `Failed to ${action === "join" ? "join" : "decline"} class`);
        return;
      }
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={(event) => respond(event, "join")} disabled={loading !== null}>
          {loading === "join" ? "Joining…" : "Join Class"}
        </Button>
        <Button variant="ghost" onClick={(event) => respond(event, "decline")} disabled={loading !== null}>
          {loading === "decline" ? "Declining…" : "Decline"}
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
