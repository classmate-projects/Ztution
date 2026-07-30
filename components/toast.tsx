"use client";

import { useEffect, useState } from "react";

/**
 * Fixed-position success toast — top-right, auto-dismisses, closeable.
 * Render with a changing `key` (see useToast's `toastKey`) so re-triggering
 * the same message while one is already showing restarts the timer/animation
 * instead of being a no-op.
 */
export function Toast({
  message,
  onClose,
  duration = 3000,
}: {
  message: string;
  onClose: () => void;
  duration?: number;
}) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    const timer = window.setTimeout(handleClose, duration);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleClose() {
    setLeaving(true);
    window.setTimeout(onClose, 180);
  }

  return (
    <div className="fixed right-4 top-4 z-50 sm:top-20" role="status" aria-live="polite">
      <div
        className={`flex w-80 items-center gap-3 rounded-xl border border-zinc-200 bg-white py-3 pl-4 pr-3 shadow-lg shadow-zinc-900/10 transition-all duration-200 ease-out motion-reduce:transition-none dark:border-white/10 dark:bg-zinc-900 ${
          visible && !leaving ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
        }`}
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-3 w-3">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="flex-1 text-sm font-medium text-zinc-800 dark:text-zinc-100">{message}</span>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Dismiss"
          className="cursor-pointer rounded-md p-1 text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const [toastKey, setToastKey] = useState(0);

  function showToast(msg: string) {
    setMessage(msg);
    setToastKey((k) => k + 1);
  }

  function hideToast() {
    setMessage(null);
  }

  return { message, toastKey, showToast, hideToast };
}
