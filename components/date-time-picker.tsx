"use client";

import { useEffect, useRef, useState } from "react";
import { formatDateTime } from "@/lib/format";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Local (not UTC) "YYYY-MM-DDTHH:mm" — same format the native datetime-local input used. */
function toInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function monthGrid(viewDate: Date) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = new Date(year, month, 1 - firstOfMonth.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

const CALENDAR_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-4 w-4 shrink-0 text-zinc-400">
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 9.5h18" />
    <path d="M8 3v4M16 3v4" />
  </svg>
);

const CHEVRON_LEFT = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
    <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CHEVRON_RIGHT = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
    <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function DateTimePicker({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(value) : null;
  const [viewDate, setViewDate] = useState(selected ?? new Date());
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

  function selectDay(day: Date) {
    const next = new Date(day);
    if (selected) {
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    } else {
      next.setHours(9, 0, 0, 0);
    }
    onChange(toInputValue(next));
    setViewDate(next);
  }

  function changeTime(timeStr: string) {
    if (!timeStr) return;
    const [hours, minutes] = timeStr.split(":").map(Number);
    const base = selected ?? viewDate;
    const next = new Date(base);
    next.setHours(hours, minutes, 0, 0);
    onChange(toInputValue(next));
  }

  const days = monthGrid(viewDate);
  const today = new Date();

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-left text-sm text-zinc-900 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <span className={selected ? "" : "text-zinc-400 dark:text-zinc-500"}>
          {selected ? formatDateTime(value) : "Pick a date & time"}
        </span>
        {CALENDAR_ICON}
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-72 rounded-xl border border-zinc-200 bg-white p-3 shadow-lg shadow-zinc-900/10 dark:border-white/10 dark:bg-zinc-900">
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/10"
            >
              {CHEVRON_LEFT}
            </button>
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </span>
            <button
              type="button"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/10"
            >
              {CHEVRON_RIGHT}
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1 px-1 text-center text-xs font-medium text-zinc-400 dark:text-zinc-500">
            {WEEKDAYS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1 px-1">
            {days.map((day) => {
              const inMonth = day.getMonth() === viewDate.getMonth();
              const isSelected = selected !== null && isSameDay(day, selected);
              const isToday = isSameDay(day, today);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-sm transition-colors ${
                    isSelected
                      ? "bg-indigo-600 text-white dark:bg-indigo-500"
                      : inMonth
                        ? "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/10"
                        : "text-zinc-300 hover:bg-zinc-50 dark:text-zinc-700 dark:hover:bg-white/5"
                  } ${isToday && !isSelected ? "font-semibold text-indigo-600 dark:text-indigo-400" : ""}`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center gap-2 border-t border-zinc-100 pt-3 dark:border-white/10">
            <input
              type="time"
              value={selected ? `${pad(selected.getHours())}:${pad(selected.getMinutes())}` : ""}
              onChange={(e) => changeTime(e.target.value)}
              className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            {value && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/10"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="cursor-pointer rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
