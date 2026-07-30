"use client";

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useTheme, type Theme } from "@/components/theme";
import type { Role } from "@/lib/supabase/types";

/**
 * Makes an entire card clickable/navigable without nesting a `<button>`
 * inside an `<a>` (invalid HTML — some browsers mishandle the click).
 * Nested interactive elements (e.g. JoinClassButton) should call
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

function initials(name: string) {
  const trimmed = name.trim();
  return trimmed ? trimmed.slice(0, 2).toUpperCase() : "?";
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

export function JoinClassButton({ classId }: { classId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick(event: ReactMouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/classes/${classId}/join`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message ?? "Failed to join class");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button variant="secondary" onClick={handleClick} disabled={loading}>
        {loading ? "Joining…" : "Join Class"}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
